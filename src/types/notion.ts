export interface NotionSettings {
  integrationKey: string;
  pages: NotionPage[];
}

export interface NotionPage {
  id: string;
  title: string;
  type: 'page' | 'database';
  selected?: boolean;
}

export interface NotionContent {
  id: string;
  content: string;
}
