export interface Workspace {
  id: string;
  name: string;
  threads: Thread[];
  createdAt: number;
}

export interface Thread {
  id: string;
  name: string;
  messages: Message[];
  createdAt: number;
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: number;
}

export interface Settings {
  systemPrompt: string;
  apiKey: string;
  braveApiKey: string;
  searchModel: string;
  model: string;
}

export interface SearchResult {
  title: string;
  description: string;
  url: string;
}
