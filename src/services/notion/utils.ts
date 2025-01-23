import { NotionPage, NotionDatabase, SearchParams } from './types';
import { BASE_RETRY_DELAY, SEARCH_DEFAULTS } from './constants';
import { sanitizeText } from './client';

export const validateNotionKey = (apiKey: string): boolean => {
  return typeof apiKey === 'string' && 
         apiKey.startsWith('secret_') && 
         apiKey.length > 50;
};

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getExponentialBackoff = (attempt: number): number => {
  return Math.min(BASE_RETRY_DELAY * Math.pow(2, attempt), 10000);
};

export const extractTitle = (obj: NotionPage | NotionDatabase): string => {
  if ('title' in obj && Array.isArray(obj.title)) {
    // Database
    return obj.title[0]?.plain_text || obj.title[0]?.text?.content || 'Untitled Database';
  } else if (obj.properties) {
    // Page
    const titleProperty = obj.properties?.title?.title?.[0]?.plain_text ||
                         obj.properties?.Name?.title?.[0]?.plain_text;
    return sanitizeText(titleProperty || 'Untitled Page');
  }
  return 'Untitled';
};

export const createSearchParams = (
  type?: 'page' | 'database',
  cursor?: string
): SearchParams => {
  const params: SearchParams = {
    ...SEARCH_DEFAULTS,
  };

  if (type) {
    params.filter = {
      property: 'object',
      value: type,
    };
  }

  if (cursor) {
    params.start_cursor = cursor;
  }

  return params;
};

export const isDatabase = (obj: NotionPage | NotionDatabase): obj is NotionDatabase => {
  return obj.object === 'database';
};

export const isPage = (obj: NotionPage | NotionDatabase): obj is NotionPage => {
  return obj.object === 'page';
};
