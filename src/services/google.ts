import { SearchResult } from '../types';

const GOOGLE_SEARCH_API_URL = 'https://www.googleapis.com/customsearch/v1';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export class GoogleSearchError extends Error {
  constructor(message: string, public statusCode?: number, public retryable = false) {
    super(message);
    this.name = 'GoogleSearchError';
  }
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function validateGoogleConfig(searchEngineId: string, apiKey: string): Promise<boolean> {
  if (!searchEngineId || !apiKey) {
    return false;
  }

  try {
    const params = new URLSearchParams({
      key: apiKey,
      cx: searchEngineId,
      q: 'test',
      num: '1'
    });

    const response = await fetch(`${GOOGLE_SEARCH_API_URL}?${params}`);
    return response.ok;
  } catch (error) {
    console.error('Google Search validation error:', error);
    return false;
  }
}

export async function searchGoogle(
  query: string,
  searchEngineId: string,
  apiKey: string,
  numResults: number = 5
): Promise<SearchResult[]> {
  if (!searchEngineId || !apiKey) {
    throw new GoogleSearchError('Google Search configuration is missing. Please check your API key and Search Engine ID in settings.');
  }

  try {
    const params = new URLSearchParams({
      key: apiKey,
      cx: searchEngineId,
      q: query,
      num: numResults.toString(),
    });

    const response = await fetch(`${GOOGLE_SEARCH_API_URL}?${params}`);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const errorMessage = error.error?.message || `Search failed with status ${response.status}`;
      console.error('Google Search API error:', errorMessage);
      
      if (response.status === 403) {
        throw new GoogleSearchError('Invalid API key or Search Engine ID. Please check your settings.');
      } else if (response.status === 429) {
        throw new GoogleSearchError('Search quota exceeded. Please try again later.');
      }
      
      throw new GoogleSearchError(errorMessage, response.status);
    }

    const data = await response.json();
    
    if (!data.items || !Array.isArray(data.items)) {
      return [];
    }

    return data.items.map((item: any) => ({
      title: item.title || '',
      description: item.snippet || '',
      url: item.link || ''
    }));
  } catch (error) {
    console.error('Google Search error:', error);
    if (error instanceof GoogleSearchError) {
      throw error;
    }
    throw new GoogleSearchError(
      error instanceof Error ? error.message : 'Failed to perform Google search'
    );
  }
}

export async function analyzeSearchResults(
  apiKey: string,
  model: string,
  query: string,
  results: SearchResult[],
  mode: 'default' | 'comprehensive' | 'key_points' | 'synthesis' = 'default',
  previousAnalyses: string[] = []
): Promise<string> {
  if (!results.length) {
    return '';
  }

  const searchContent = results
    .map(result => `Title: ${result.title}\nURL: ${result.url}\nDescription: ${result.description}`)
    .join('\n\n');

  let systemPrompt = '';
  switch (mode) {
    case 'comprehensive':
      systemPrompt = `As a thorough research analyst, provide a detailed analysis of these search results. Focus on:
1. Comprehensive coverage of all major points
2. Technical details and specifications
3. Different perspectives and approaches
4. Historical context and development
5. Real-world applications and implications

Format your analysis in a well-structured, detailed manner using headings and bullet points where appropriate.`;
      break;

    case 'key_points':
      systemPrompt = `As a strategic analyst, identify and analyze the key points from these search results. Focus on:
1. Core concepts and fundamental principles
2. Critical relationships and dependencies
3. Key patterns and trends
4. Important contradictions or debates
5. Practical implications

Organize your analysis around the most significant findings and their interconnections.`;
      break;

    case 'synthesis':
      systemPrompt = `As an expert synthesist, create a final, integrated analysis combining previous analyses with these results. Focus on:
1. Synthesizing all gathered information into a coherent whole
2. Highlighting the most important insights
3. Resolving contradictions and clarifying ambiguities
4. Drawing well-supported conclusions
5. Providing actionable insights

Previous Analyses:
${previousAnalyses.join('\n\n---\n\n')}

Create a final, authoritative summary that brings together all the information.`;
      break;

    default:
      systemPrompt = `As a search analyst, analyze these results and provide a concise, well-organized summary that directly answers or addresses the query. Focus on:
1. Extracting and highlighting relevant information
2. Including specific facts and data
3. Citing sources using [Title](URL) format
4. Organizing information logically
5. Maintaining factual accuracy`;
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
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
            { role: 'user', content: `Query: ${query}\n\nSearch Results:\n${searchContent}` }
          ],
          temperature: mode === 'synthesis' ? 0.7 : 0.3,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data || !data.choices || !Array.isArray(data.choices) || !data.choices[0]?.message?.content) {
        throw new Error('Invalid API response structure');
      }

      const content = data.choices[0].message.content.trim();
      
      if (!content || content.length < 10) {
        throw new Error('Generated content is too short or empty');
      }

      return content;
    } catch (error) {
      console.error(`Analysis attempt ${attempt + 1} failed:`, error);
      
      if (attempt === MAX_RETRIES - 1) {
        return generateFallbackAnalysis(query, results);
      }
      
      await delay(RETRY_DELAY * Math.pow(2, attempt));
    }
  }

  throw new Error('Failed to analyze search results after multiple attempts');
}

function generateFallbackAnalysis(query: string, results: SearchResult[]): string {
  const relevantResults = results.slice(0, 3);
  
  const summary = `Here are the most relevant findings for "${query}":\n\n` + 
    relevantResults.map(result => 
      `• ${result.title}\n  ${result.description}\n  Source: ${result.url}`
    ).join('\n\n');
    
  return summary;
}
