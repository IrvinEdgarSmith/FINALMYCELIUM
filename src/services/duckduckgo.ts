import { SearchResult } from '../types';

const DUCKDUCKGO_API_URL = 'https://api.duckduckgo.com/';

// Configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const REQUEST_TIMEOUT = 10000; // 10 seconds
const RESULTS_PER_QUERY = 5;

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
}

class DuckDuckGoError extends Error {
  constructor(
    message: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'DuckDuckGoError';
  }
}

class DuckDuckGoClient {
  private cache = new SearchCache();

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
        throw new DuckDuckGoError('Request timed out', true);
      }
      throw error;
    }
  }

  private async makeRequest(query: string, retryCount = 0): Promise<Response> {
    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        t: 'NexusChat',
        no_html: '1',
        no_redirect: '1',
        skip_disambig: '1'
      });

      const response = await this.fetchWithTimeout(
        `${DUCKDUCKGO_API_URL}?${params}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'NexusChat/1.0'
          }
        },
        REQUEST_TIMEOUT
      );

      if (!response.ok) {
        throw new DuckDuckGoError(
          `DuckDuckGo API error: ${response.status} ${response.statusText}`,
          response.status >= 500
        );
      }

      return response;
    } catch (error) {
      console.error('DuckDuckGo request error:', error);

      if (error instanceof DuckDuckGoError) {
        throw error;
      }

      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new DuckDuckGoError(
          'Failed to connect to DuckDuckGo. Please check your internet connection.',
          true
        );
      }

      throw new DuckDuckGoError('An unexpected error occurred while searching.');
    }
  }

  public async search(query: string): Promise<SearchResult[]> {
    const cacheKey = query;
    const cachedResults = this.cache.get(cacheKey);
    if (cachedResults) {
      return cachedResults;
    }

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await this.makeRequest(query, attempt);
        const data = await response.json();

        const results: SearchResult[] = [];

        // Process AbstractText if available
        if (data.AbstractText) {
          results.push({
            title: data.AbstractSource || 'Abstract',
            description: data.AbstractText,
            url: data.AbstractURL || ''
          });
        }

        // Process RelatedTopics
        if (data.RelatedTopics) {
          data.RelatedTopics
            .filter((topic: any) => topic.Text && topic.FirstURL)
            .slice(0, RESULTS_PER_QUERY - results.length)
            .forEach((topic: any) => {
              results.push({
                title: topic.Text.split(' - ')[0] || 'Related Topic',
                description: topic.Text,
                url: topic.FirstURL
              });
            });
        }

        this.cache.set(cacheKey, results);
        return results;
      } catch (error) {
        console.error(`Search attempt ${attempt + 1} failed:`, error);

        if (
          error instanceof DuckDuckGoError &&
          error.retryable &&
          attempt < MAX_RETRIES
        ) {
          const delayTime = RETRY_DELAY * Math.pow(2, attempt);
          await this.delay(delayTime);
          continue;
        }
        throw error;
      }
    }

    throw new DuckDuckGoError('Maximum retry attempts exceeded');
  }
}

// Singleton instance
let duckDuckGoClient: DuckDuckGoClient | null = null;

export async function searchWeb(query: string): Promise<SearchResult[]> {
  if (!duckDuckGoClient) {
    duckDuckGoClient = new DuckDuckGoClient();
  }
  return duckDuckGoClient.search(query);
}

export async function performMultiSearch(
  queries: string[]
): Promise<Array<{
  query: string;
  results: SearchResult[];
  error?: string;
}>> {
  if (!duckDuckGoClient) {
    duckDuckGoClient = new DuckDuckGoClient();
  }

  const results = [];

  for (const query of queries) {
    try {
      const searchResults = await duckDuckGoClient.search(query);
      results.push({
        query,
        results: searchResults
      });
    } catch (error) {
      results.push({
        query,
        results: [],
        error: error instanceof DuckDuckGoError ? error.message : 'An unexpected error occurred'
      });
    }

    // Add delay between searches
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
