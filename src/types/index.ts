export interface Workspace {
  id: string;
  name: string;
  threads: Thread[];
  createdAt: number;
  model?: string;
  temperature?: number;
  projectVariables?: ProjectVariable[];
  files?: WorkspaceFile[];
  modules?: Module[];
  systemPrompt?: string;
  overrideSystemPrompt?: boolean;
}

export interface Module {
  id: string;
  command: string;
  instructions: string;
  files: ModuleFile[];
  createdAt: number;
}

export interface ModuleFile {
  id: string;
  name: string;
  content: string;
  type: string;
  size: number;
}

export interface WorkspaceFile {
  id: string;
  name: string;
  content: string;
  embedding?: number[];
  uploadedAt: number;
  type: string;
  size: number;
}

export interface ProjectVariable {
  id: string;
  title: string;
  description: string;
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
  model: string;
  memoryModel: string;
  googleSearchId?: string;
  googleSearchApiKey?: string;
  openAIApiKey?: string;
}

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}
