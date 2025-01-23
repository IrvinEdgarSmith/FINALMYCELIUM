import axios from 'axios';
import { ERROR_MESSAGES } from './constants';
import { NotionError } from './types';

export const handleNotionError = (error: unknown): never => {
  console.error('Notion API Error:', error);

  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') {
      throw new NotionError(ERROR_MESSAGES.TIMEOUT, 'timeout');
    }
    if (!error.response) {
      throw new NotionError(ERROR_MESSAGES.NETWORK, 'network_error');
    }
  }

  if (error instanceof NotionError) {
    throw error;
  }

  const statusCode = (error as any)?.status;
  switch (statusCode) {
    case 401:
      throw new NotionError(ERROR_MESSAGES.INVALID_KEY, 'unauthorized');
    case 403:
      throw new NotionError(ERROR_MESSAGES.ACCESS_DENIED, 'forbidden');
    case 404:
      throw new NotionError(ERROR_MESSAGES.NOT_FOUND, 'not_found');
    case 429:
      throw new NotionError(ERROR_MESSAGES.RATE_LIMITED, 'rate_limited');
    default:
      throw new NotionError(
        (error as Error)?.message || ERROR_MESSAGES.DEFAULT,
        'unknown'
      );
  }
};
