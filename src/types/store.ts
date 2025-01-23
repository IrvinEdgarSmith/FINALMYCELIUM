import { Message, Settings, Thread, Workspace } from "./index";

export interface SearchState {
  isSearching: boolean;
  error: string | null;
  stage: 'searching' | 'analyzing' | null;
  results: Array<{
    title: string;
    description: string;
    url: string;
  }>;
}

export interface AppState {
  // Workspaces
  workspaces: Workspace[];
  selectedWorkspaceId: string | null;
  selectedThreadId: string | null;
  
  // Settings
  settings: Settings;
  
  // UI State
  isSettingsOpen: boolean;
  isModulesPanelOpen: boolean;
  isDebugPanelOpen: boolean;

  // Actions
  setWorkspaces: (workspaces: Workspace[]) => void;
  selectWorkspace: (id: string | null) => void;
  selectThread: (id: string | null) => void;
  
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  addThread: (workspaceId: string, thread: Thread) => void;
  updateThread: (workspaceId: string, threadId: string, updates: Partial<Thread>) => void;
  deleteThread: (workspaceId: string, threadId: string) => void;
  
  updateSettings: (settings: Settings) => void;
  
  toggleSettingsPanel: () => void;
  toggleModulesPanel: () => void;
  toggleDebugPanel: () => void;
  
  // Selectors
  getCurrentWorkspace: () => Workspace | undefined;
  getCurrentThread: () => Thread | undefined;
  getCurrentMessages: () => Message[];
}

export interface MessageResult {
  success: boolean;
  error?: string;
  message?: Message;
}
