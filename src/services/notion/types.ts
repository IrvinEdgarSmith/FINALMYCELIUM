export class NotionError extends Error {
  constructor(
    message: string,
    public code: NotionErrorCode,
    public status?: number
  ) {
    super(message);
    this.name = 'NotionError';
  }
}

export type NotionErrorCode =
  | 'invalid_key'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'rate_limited'
  | 'network_error'
  | 'timeout'
  | 'unknown';

export interface NotionObject {
  object: 'page' | 'database';
  id: string;
}

export interface NotionPage extends NotionObject {
  object: 'page';
  properties: {
    title?: {
      title: Array<{
        plain_text: string;
      }>;
    };
    Name?: {
      title: Array<{
        plain_text: string;
      }>;
    };
  };
}

export interface NotionDatabase extends NotionObject {
  object: 'database';
  title: Array<{
    type: 'text';
    text: {
      content: string;
    };
    plain_text: string;
  }>;
}

export interface NotionSearchResponse {
  object: 'list';
  results: (NotionPage | NotionDatabase)[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface SearchParams {
  query?: string;
  filter?: {
    property: 'object';
    value: 'page' | 'database';
  };
  start_cursor?: string;
  page_size?: number;
  sort?: {
    direction: 'ascending' | 'descending';
    timestamp: 'last_edited_time' | 'created_time';
  };
}
