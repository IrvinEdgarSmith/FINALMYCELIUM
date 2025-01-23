import { SearchResult } from '../types';

const API_URL = 'https://api.duckduckgo.com/';
const TIMEOUT = 10000;
const MAX_RETRIES = 3;
const DELAY_MS = 1000;

export class SearchError extends Error {
  constructor(message: string, public retryable: boolean = false) {
    super(message);
    this.name = 'SearchError';
  }
}

async function fetchWithTimeout(url: string, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new SearchError('Request timed out', true);
    }
    throw error;
  }
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function searchWeb(query: string): Promise<SearchResult[]> {
  let attempt = 0;
  
  while (attempt < MAX_RETRIES) {
    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        t: 'NexusChat',
        no_html: '1',
        no_redirect: '1'
      });

      const response = await fetchWithTimeout(
        `${API_URL}?${params}`,
        TIMEOUT
      );

      if (!response.ok) {
        throw new SearchError(
          `Search failed with status ${response.status}`,
          response.status >= 500
        );
      }

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
          .slice(0, 5)
          .forEach((topic: any) => {
            results.push({
              title: topic.Text.split(' - ')[0] || 'Related Topic',
              description: topic.Text,
              url: topic.FirstURL
            });
          });
      }

      return results;
    } catch (error) {
      console.error(`Search attempt ${attempt + 1} failed:`, error);

      if (
        error instanceof SearchError &&
        error.retryable &&
        attempt < MAX_RETRIES - 1
      ) {
        await delay(DELAY_MS * Math.pow(2, attempt));
        attempt++;
        continue;
      }
      throw error;
    }
  }

  throw new SearchError('Maximum retry attempts exceeded');
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

export async function performMultiSearch(
  queries: string[]
): Promise<Array<{
  query: string;
  results: SearchResult[];
  error?: string;
}>> {
  const results = [];

  for (const query of queries) {
    try {
      const searchResults = await searchWeb(query);
      results.push({
        query,
        results: searchResults
      });
    } catch (error) {
      results.push({
        query,
        results: [],
        error: error instanceof SearchError ? error.message : 'An unexpected error occurred'
      });
    }

    // Add delay between searches
    if (queries.indexOf(query) < queries.length - 1) {
      await delay(1000);
    }
  }

  return results;
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
