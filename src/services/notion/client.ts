import { Client } from '@notionhq/client';
import { NOTION_API_VERSION, REQUEST_TIMEOUT } from './constants';
import { validateNotionKey } from './utils';
import { NotionError } from './types';

export const createNotionClient = (apiKey: string): Client => {
  if (!validateNotionKey(apiKey)) {
    throw new NotionError('Invalid Notion API key format', 'invalid_key');
  }

  return new Client({
    auth: apiKey,
    notionVersion: NOTION_API_VERSION,
    timeoutMs: REQUEST_TIMEOUT,
    fetch: (url, init) => {
      // Ensure headers are properly encoded
      if (init?.headers) {
        const headers = new Headers(init.headers);
        init.headers = headers;
      }
      return fetch(url, {
        ...init,
        // Add required headers for Notion API
        headers: {
          ...init?.headers,
          'Notion-Version': NOTION_API_VERSION,
          'Content-Type': 'application/json',
        },
      });
    },
  });
};

// Add helper function to sanitize text content
export const sanitizeText = (text: string): string => {
  // Replace smart quotes and other problematic characters
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2026]/g, '...')
    .replace(/[^\x00-\x7F]/g, ''); // Remove non-ASCII characters
};
