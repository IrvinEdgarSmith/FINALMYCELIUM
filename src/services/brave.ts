import { SearchResult } from '../types';

const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';

// Configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const REQUEST_TIMEOUT = 10000; // 10 seconds

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_ITEMS = 100;

interface CacheEntry {
  results: SearchResult[];
  timestamp: number;
}

class SearchCache {
  private cache = new Map<string, CacheEntry>();

  set(key: string, results: SearchResult[]) {
    // Remove oldest entries if cache is full
    if (this.cache.size >= MAX_CACHE_ITEMS) {
      const oldestKey = [...this.cache.entries()]
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, { results, timestamp: Date.now() });
  }

  get(key: string): SearchResult[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }
    return entry.results;
  }

  clear() {
    this.cache.clear();
  }
}

class RateLimiter {
  private timestamps: number[] = [];

  canMakeRequest(): boolean {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
    return this.timestamps.length < MAX_REQUESTS_PER_WINDOW;
  }

  recordRequest() {
    this.timestamps.push(Date.now());
  }
}

class BraveSearchError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'BraveSearchError';
  }
}

class BraveSearchClient {
  private cache = new SearchCache();
  private rateLimiter = new RateLimiter();

  constructor(private apiKey: string) {
    if (!apiKey) {
      throw new BraveSearchError('Brave API key is required');
    }
  }

  private getCacheKey(query: string, count: number): string {
    return `${query}-${count}`;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new BraveSearchError('Request timed out', undefined, true);
      }
      throw error;
    }
  }

  private async makeRequest(query: string, count: number, retryCount = 0): Promise<Response> {
    if (!this.rateLimiter.canMakeRequest()) {
      throw new BraveSearchError('Rate limit exceeded. Please wait before making more requests.', 429, true);
    }

    try {
      // Construct URL with query parameters
      const searchUrl = new URL(BRAVE_API_URL);
      searchUrl.searchParams.append('q', query);
      searchUrl.searchParams.append('count', count.toString());

      // Important: Add the 'X-Subscription-Token' header with the API key
      const response = await this.fetchWithTimeout(
        searchUrl.toString(),
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip',
            // Fix: Use 'X-Subscription-Token' header for Brave Search API
            'X-Subscription-Token': this.apiKey
          }
        },
        REQUEST_TIMEOUT
      );

      this.rateLimiter.recordRequest();

      if (!response.ok) {
        const errorMessage = await this.handleErrorResponse(response);
        throw new BraveSearchError(
          errorMessage,
          response.status,
          response.status === 429 || response.status >= 500
        );
      }

      return response;
    } catch (error) {
      console.error('Brave Search request error:', error);

      if (error instanceof BraveSearchError) {
        throw error;
      }

      // Network errors
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new BraveSearchError(
          'Failed to connect to Brave Search. Please check your internet connection.',
          undefined,
          true
        );
      }

      throw new BraveSearchError(
        'An unexpected error occurred while searching. Please try again.',
        undefined,
        true
      );
    }
  }

  private async handleErrorResponse(response: Response): Promise<string> {
    try {
      const data = await response.json();
      return data.message || this.getErrorMessageForStatus(response.status);
    } catch {
      return this.getErrorMessageForStatus(response.status);
    }
  }

  private getErrorMessageForStatus(status: number): string {
    switch (status) {
      case 400:
        return 'Invalid search query. Please modify your search terms.';
      case 401:
        return 'Invalid Brave Search API key. Please check your API key in settings.';
      case 403:
        return 'Access forbidden. Your API key may not have the required permissions.';
      case 429:
        return 'Too many requests. Please wait a moment before trying again.';
      case 500:
        return 'Brave Search service error. Please try again later.';
      default:
        return `Search failed with status code ${status}`;
    }
  }

  public async search(query: string, count: number = 5): Promise<SearchResult[]> {
    const cacheKey = this.getCacheKey(query, count);
    const cachedResults = this.cache.get(cacheKey);
    if (cachedResults) {
      return cachedResults;
    }

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await this.makeRequest(query, count, attempt);
        const data = await response.json();

        if (!data.web?.results) {
          console.warn('No web results found in response:', data);
          return [];
        }

        const results = data.web.results.map((result: any) => ({
          title: result.title || '',
          description: result.description || '',
          url: result.url || ''
        }));

        this.cache.set(cacheKey, results);
        return results;
      } catch (error) {
        console.error(`Search attempt ${attempt + 1} failed:`, error);

        if (
          error instanceof BraveSearchError &&
          error.retryable &&
          attempt < MAX_RETRIES
        ) {
          const delayTime = RETRY_DELAY * Math.pow(2, attempt);
          console.log(`Retrying in ${delayTime}ms...`);
          await this.delay(delayTime);
          continue;
        }
        throw error;
      }
    }

    throw new BraveSearchError('Maximum retry attempts exceeded');
  }
}

// Singleton instance
let braveSearchClient: BraveSearchClient | null = null;

export async function searchWeb(
  apiKey: string,
  query: string,
  count: number = 5
): Promise<SearchResult[]> {
  if (!braveSearchClient || braveSearchClient['apiKey'] !== apiKey) {
    braveSearchClient = new BraveSearchClient(apiKey);
  }
  return braveSearchClient.search(query, count);
}

export async function performMultiSearch(
  apiKey: string,
  queries: string[]
): Promise<Array<{
  query: string;
  results: SearchResult[];
  error?: string;
}>> {
  if (!braveSearchClient || braveSearchClient['apiKey'] !== apiKey) {
    braveSearchClient = new BraveSearchClient(apiKey);
  }

  const results = [];

  for (const query of queries) {
    try {
      const searchResults = await braveSearchClient.search(query);
      results.push({
        query,
        results: searchResults
      });
    } catch (error) {
      results.push({
        query,
        results: [],
        error: error instanceof BraveSearchError ? error.message : 'An unexpected error occurred'
      });
    }

    // Add delay between searches to prevent rate limiting
    if (queries.indexOf(query) < queries.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

export async function extractSearchQueries(
  apiKey: string,
  model: string,
  userInput: string
): Promise<string[]> {
  if (!apiKey || !model) {
    throw new Error('OpenRouter API key and search model are required');
  }

  const systemPrompt = `You are a search query extractor. Extract 1-3 search queries that would help gather relevant information to answer this question or address these needs. Return ONLY the search queries, one per line. Keep queries focused and specific. Do not include any other text or explanations.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'NexusChat'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userInput }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate search queries');
    }

    const data = await response.json();
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Failed to generate search queries');
    }

    const queries = data.choices[0].message.content
      .split('\n')
      .map((q: string) => q.trim())
      .filter((q: string) => q.length > 0);

    if (queries.length === 0) {
      throw new Error('No valid search queries generated');
    }

    return queries;
  } catch (error) {
    throw new Error(`Failed to extract search queries: ${error.message}`);
  }
}

export async function analyzeSearchResults(
  apiKey: string,
  model: string,
  searchResults: Array<{
    query: string;
    results: SearchResult[];
    error?: string;
  }>,
  userQuery: string
): Promise<string> {
  if (!apiKey || !model) {
    throw new Error('OpenRouter API key and search model are required');
  }

  // Filter out failed searches and empty results
  const validResults = searchResults.filter(result => result.results.length > 0);

  if (validResults.length === 0) {
    const errors = searchResults
      .filter(result => result.error)
      .map(result => `• ${result.query}: ${result.error}`)
      .join('\n');
    throw new Error(`No valid search results found.\n\nSearch errors:\n${errors}`);
  }

  const searchContent = validResults
    .map(queryResult => {
      const resultText = queryResult.results
        .map(result => `Title: ${result.title}\nURL: ${result.url}\nDescription: ${result.description}`)
        .join('\n\n');
      return `Search Query: ${queryResult.query}\n\nResults:\n${resultText}`;
    })
    .join('\n\n---\n\n');

  const systemPrompt = `You are a web search analyst. Analyze the following search results and provide a concise, well-organized summary of the most relevant information related to the user's query. Focus on extracting key facts, data, and insights. Include source URLs for important information.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'NexusChat'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `User Query: ${userQuery}\n\n${searchContent}` }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error('Failed to analyze search results');
    }

    const data = await response.json();
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Failed to analyze search results');
    }

    return data.choices[0].message.content;
  } catch (error) {
    throw new Error(`Failed to analyze search results: ${error.message}`);
  }
}
