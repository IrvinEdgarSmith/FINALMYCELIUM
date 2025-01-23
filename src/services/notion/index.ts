import { MAX_RETRIES, ERROR_MESSAGES, DEFAULT_PAGE_SIZE } from './constants';
import { createNotionClient, sanitizeText } from './client';
import { handleNotionError } from './errors';
import { delay, getExponentialBackoff, extractTitle, createSearchParams } from './utils';
import type { NotionPage, NotionDatabase, NotionSearchResponse } from './types';
import type { NotionContent, NotionPage as NotionPageResult } from '../../types/notion';

const retryOperation = async <T>(
  operation: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    if (retries > 0 && (error.code === 'network_error' || error.code === 'rate_limited')) {
      await delay(getExponentialBackoff(MAX_RETRIES - retries));
      return retryOperation(operation, retries - 1);
    }
    throw error;
  }
};

async function fetchAllResults(
  notion: any,
  type?: 'page' | 'database'
): Promise<(NotionPage | NotionDatabase)[]> {
  const results: (NotionPage | NotionDatabase)[] = [];
  let hasMore = true;
  let cursor: string | undefined;

  while (hasMore) {
    try {
      const response: NotionSearchResponse = await retryOperation(() =>
        notion.search(createSearchParams(type, cursor))
      );

      results.push(...response.results);

      if (response.has_more && response.next_cursor) {
        cursor = response.next_cursor;
      } else {
        hasMore = false;
      }

      // Respect rate limits
      await delay(100);
    } catch (error) {
      console.error('Error during pagination:', error);
      throw new Error(ERROR_MESSAGES.PAGINATION);
    }
  }

  return results;
}

export async function fetchNotionPages(apiKey: string): Promise<NotionPageResult[]> {
  try {
    const notion = createNotionClient(apiKey);

    // Verify access by getting current user
    await retryOperation(() => notion.users.me());

    // Fetch all pages and databases with pagination
    const [pages, databases] = await Promise.all([
      fetchAllResults(notion, 'page'),
      fetchAllResults(notion, 'database')
    ]);

    const mappedPages: NotionPageResult[] = pages.map(page => ({
      id: page.id,
      title: sanitizeText(extractTitle(page as NotionPage)).trim() || 'Untitled',
      type: 'page',
      selected: false
    }));

    const mappedDatabases: NotionPageResult[] = databases.map(db => ({
      id: db.id,
      title: sanitizeText(extractTitle(db as NotionDatabase)).trim() || 'Untitled Database',
      type: 'database',
      selected: false
    }));

    const results = [...mappedPages, ...mappedDatabases]
      .filter(page => page.title !== 'Untitled' && page.title !== 'Untitled Database')
      .sort((a, b) => a.title.localeCompare(b.title));

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
  if (!pageId || typeof pageId !== 'string') {
    throw new Error(ERROR_MESSAGES.INVALID_PAGE_ID);
  }

  try {
    const notion = createNotionClient(apiKey);

    // First verify page access with retry
    const page = await retryOperation(() => 
      notion.pages.retrieve({ page_id: pageId })
    );

    // Then fetch all blocks with pagination
    const blocks = [];
    let cursor;
    let hasMore = true;

    while (hasMore) {
      const response = await retryOperation(() =>
        notion.blocks.children.list({
          block_id: pageId,
          page_size: DEFAULT_PAGE_SIZE,
          start_cursor: cursor,
        })
      );

      blocks.push(...response.results);

      if (response.has_more && response.next_cursor) {
        cursor = response.next_cursor;
        await delay(100); // Respect rate limits
      } else {
        hasMore = false;
      }
    }

    const processText = (richText: any[]): string => {
      return richText
        ?.map((t: any) => sanitizeText(t.plain_text))
        .join('') || '';
    };

    const content = blocks
      .map(block => {
        try {
          switch (block.type) {
            case 'paragraph':
              return processText(block.paragraph.rich_text);
            case 'heading_1':
              return `# ${processText(block.heading_1.rich_text)}`;
            case 'heading_2':
              return `## ${processText(block.heading_2.rich_text)}`;
            case 'heading_3':
              return `### ${processText(block.heading_3.rich_text)}`;
            case 'bulleted_list_item':
              return `• ${processText(block.bulleted_list_item.rich_text)}`;
            case 'numbered_list_item':
              return `1. ${processText(block.numbered_list_item.rich_text)}`;
            case 'to_do':
              const checked = block.to_do.checked ? '☒' : '☐';
              return `${checked} ${processText(block.to_do.rich_text)}`;
            case 'code':
              return `\`\`\`\n${processText(block.code.rich_text)}\n\`\`\``;
            case 'quote':
              return `> ${processText(block.quote.rich_text)}`;
            case 'divider':
              return '---';
            default:
              return '';
          }
        } catch (error) {
          console.error('Error processing block:', error);
          return '';
        }
      })
      .filter(text => text.trim())
      .join('\n\n');

    if (!content.trim()) {
      throw new Error(ERROR_MESSAGES.NO_CONTENT);
    }

    return {
      id: pageId,
      content: content.trim()
    };
  } catch (error) {
    return handleNotionError(error);
  }
}
