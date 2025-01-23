export const NOTION_API_VERSION = '2022-06-28';
export const REQUEST_TIMEOUT = 10000; // 10 seconds
export const MAX_RETRIES = 3;
export const BASE_RETRY_DELAY = 1000; // 1 second
export const MAX_BLOCKS_PER_REQUEST = 100;
export const DEFAULT_PAGE_SIZE = 100;

export const ERROR_MESSAGES = {
  NETWORK: 'Network error. Please check your internet connection and try again.',
  TIMEOUT: 'Request timed out. Please try again.',
  INVALID_KEY: 'Invalid Notion API key. Please check your credentials.',
  ACCESS_DENIED: 'Access denied. Please check integration permissions.',
  NOT_FOUND: 'Resource not found. Please check if the page/database exists and is accessible.',
  RATE_LIMITED: 'Rate limited by Notion API. Please try again in a few moments.',
  NO_CONTENT: 'No readable content found in this page.',
  INVALID_PAGE_ID: 'Invalid page ID provided.',
  DEFAULT: 'An unexpected error occurred with the Notion API.',
  PAGINATION: 'Error during pagination: failed to fetch all results.',
};

export const SEARCH_DEFAULTS = {
  sort: {
    direction: 'descending' as const,
    timestamp: 'last_edited_time' as const,
  },
  page_size: DEFAULT_PAGE_SIZE,
};
