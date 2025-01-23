import { Client } from '@notionhq/client';
import axios from 'axios';
import { NotionPage, NotionContent } from '../types/notion';

const NOTION_API_VERSION = '2022-06-28';
const MAX_RETRIES = 3;
const TIMEOUT = 10000; // 10 seconds

interface NotionError extends Error {
  status?: number;
  code?: string;
}

const validateNotionKey = (apiKey: string): boolean => {
  return apiKey.startsWith('secret_') && apiKey.length > 50;
};

const createNotionClient = (apiKey: string): Client => {
  return new Client({
    auth: apiKey,
    notionVersion: NOTION_API_VERSION,
    timeoutMs: TIMEOUT,
  });
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const handleNotionError = (error: any): never => {
  console.error('Notion API Error:', error);

  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') {
      throw new Error('Connection timeout. Please try again.');
    }
    if (!error.response) {
      throw new Error('Network error. Please check your internet connection.');
    }
  }

  const notionError = error as NotionError;
  
  if (notionError.status === 401) {
    throw new Error('Invalid Notion API key. Please check your credentials.');
  }
  if (notionError.status === 403) {
    throw new Error('Access denied. Please check integration permissions.');
  }
  if (notionError.status === 404) {
    throw new Error('Resource not found. Please check if the page/database exists and is accessible.');
  }
  if (notionError.status === 429) {
    throw new Error('Rate limited by Notion API. Please try again in a few moments.');
  }
  
  throw new Error(notionError.message || 'An unexpected error occurred with the Notion API.');
};

const retryOperation = async <T>(
  operation: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (retries > 0 && (axios.isAxiosError(error) || (error as NotionError).code === 'rate_limited')) {
      await delay(2 ** (MAX_RETRIES - retries) * 1000); // Exponential backoff
      return retryOperation(operation, retries - 1);
    }
    throw error;
  }
};

export async function fetchNotionPages(apiKey: string): Promise<NotionPage[]> {
  if (!validateNotionKey(apiKey)) {
    throw new Error('Invalid Notion API key format. Key should start with "secret_" and be longer than 50 characters.');
  }

  try {
    const notion = createNotionClient(apiKey);

    // Verify access by getting current user
    await retryOperation(() => notion.users.me());

    // Fetch pages and databases in parallel
    const [pagesResponse, dbResponse] = await Promise.all([
      retryOperation(() => 
        notion.search({
          filter: { property: 'object', value: 'page' },
          page_size: 100,
          sort: { direction: 'descending', timestamp: 'last_edited_time' }
        })
      ),
      retryOperation(() =>
        notion.search({
          filter: { property: 'object', value: 'database' },
          page_size: 100,
          sort: { direction: 'descending', timestamp: 'last_edited_time' }
        })
      )
    ]);

    const pages: NotionPage[] = pagesResponse.results.map((page: any) => {
      let title = 'Untitled';
      
      // Handle different title property structures
      if (page.properties?.title?.title?.[0]?.plain_text) {
        title = page.properties.title.title[0].plain_text;
      } else if (page.properties?.Name?.title?.[0]?.plain_text) {
        title = page.properties.Name.title[0].plain_text;
      } else if (Array.isArray(page.title) && page.title[0]?.plain_text) {
        title = page.title[0].plain_text;
      }

      return {
        id: page.id,
        title: title.trim() || 'Untitled',
        type: 'page',
        selected: false
      };
    });

    const databases: NotionPage[] = dbResponse.results.map((db: any) => ({
      id: db.id,
      title: (
        db.title?.[0]?.plain_text ||
        db.properties?.title?.title?.[0]?.plain_text ||
        'Untitled Database'
      ).trim(),
      type: 'database',
      selected: false
    }));

    const results = [...pages, ...databases].filter(page => page.title !== 'Untitled');

    if (results.length === 0) {
      throw new Error(
        'No accessible pages or databases found. Please ensure your integration has the correct permissions and access to content.'
      );
    }

    return results;
  } catch (error) {
    return handleNotionError(error);
  }
}

export async function fetchPageContent(apiKey: string, pageId: string): Promise<NotionContent> {
  if (!validateNotionKey(apiKey)) {
    throw new Error('Invalid Notion API key format. Key should start with "secret_" and be longer than 50 characters.');
  }

  if (!pageId || typeof pageId !== 'string') {
    throw new Error('Invalid page ID provided.');
  }

  try {
    const notion = createNotionClient(apiKey);

    // First verify page access
    const page = await retryOperation(() => 
      notion.pages.retrieve({ page_id: pageId })
    );

    // Then fetch all blocks
    const blocks = await retryOperation(() =>
      notion.blocks.children.list({
        block_id: pageId,
        page_size: 100,
      })
    );

    const content = await processBlocks(blocks.results);

    // If no content was processed, throw an error
    if (!content.trim()) {
      throw new Error('No readable content found in this page.');
    }

    return {
      id: pageId,
      content: content.trim()
    };
  } catch (error) {
    return handleNotionError(error);
  }
}

async function processBlocks(blocks: any[]): Promise<string> {
  const contents: string[] = [];

  for (const block of blocks) {
    try {
      if (!block || typeof block !== 'object') continue;

      if ('paragraph' in block) {
        const text = block.paragraph.rich_text
          ?.map((text: any) => text.plain_text)
          .join('') ?? '';
        if (text.trim()) contents.push(text);
      } 
      else if ('heading_1' in block) {
        const text = block.heading_1.rich_text
          ?.map((text: any) => text.plain_text)
          .join('') ?? '';
        if (text.trim()) contents.push(`# ${text}`);
      } 
      else if ('heading_2' in block) {
        const text = block.heading_2.rich_text
          ?.map((text: any) => text.plain_text)
          .join('') ?? '';
        if (text.trim()) contents.push(`## ${text}`);
      } 
      else if ('heading_3' in block) {
        const text = block.heading_3.rich_text
          ?.map((text: any) => text.plain_text)
          .join('') ?? '';
        if (text.trim()) contents.push(`### ${text}`);
      } 
      else if ('bulleted_list_item' in block) {
        const text = block.bulleted_list_item.rich_text
          ?.map((text: any) => text.plain_text)
          .join('') ?? '';
        if (text.trim()) contents.push(`• ${text}`);
      }
      else if ('to_do' in block) {
        const text = block.to_do.rich_text
          ?.map((text: any) => text.plain_text)
          .join('') ?? '';
        const checked = block.to_do.checked ? '☒' : '☐';
        if (text.trim()) contents.push(`${checked} ${text}`);
      }
      else if ('code' in block) {
        const text = block.code.rich_text
          ?.map((text: any) => text.plain_text)
          .join('') ?? '';
        if (text.trim()) contents.push(`\`\`\`\n${text}\n\`\`\``);
      }
    } catch (error) {
      console.error('Error processing block:', error);
      continue; // Skip problematic blocks instead of failing entirely
    }
  }

  return contents.join('\n\n');
}
