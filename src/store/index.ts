import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AppState } from '../types/store';
import { Settings, Thread, Workspace } from '../types';

const DEFAULT_SETTINGS: Settings = {
  systemPrompt: "You are a helpful AI assistant. Be concise and clear in your responses.",
  apiKey: "",
  braveApiKey: "",
  searchModel: "",
  model: "anthropic/claude-2",
  memoryModel: "anthropic/claude-2",
};

// Migration function to handle state versions
const migrate = (persistedState: any, version: number) => {
  if (version === 0) {
    // Add any missing default fields
    return {
      ...persistedState,
      settings: {
        ...DEFAULT_SETTINGS,
        ...persistedState.settings,
      },
      workspaces: persistedState.workspaces || [],
      selectedWorkspaceId: persistedState.selectedWorkspaceId || null,
      selectedThreadId: persistedState.selectedThreadId || null,
    };
  }
  return persistedState;
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // State
      workspaces: [],
      selectedWorkspaceId: null,
      selectedThreadId: null,
      settings: DEFAULT_SETTINGS,
      isSettingsOpen: false,
      isModulesPanelOpen: false,
      isDebugPanelOpen: false,

      // Actions
      setWorkspaces: (workspaces) => set({ workspaces }),
      
      selectWorkspace: (id) => set({ selectedWorkspaceId: id }),
      
      selectThread: (id) => set({ selectedThreadId: id }),
      
      addWorkspace: (workspace) => set((state) => ({
        workspaces: [...state.workspaces, workspace],
        selectedWorkspaceId: workspace.id,
      })),
      
      updateWorkspace: (id, updates) => {
        if (!id) return;
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === id ? { ...w, ...updates } : w
          ),
        }));
      },
      
      addThread: (workspaceId, thread) => {
        if (!workspaceId || !thread) return;
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === workspaceId
              ? { ...w, threads: [...w.threads, thread] }
              : w
          ),
          selectedThreadId: thread.id,
        }));
      },
      
      updateThread: (workspaceId, threadId, updates) => {
        if (!workspaceId || !threadId) return;
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === workspaceId
              ? {
                  ...w,
                  threads: w.threads.map((t) =>
                    t.id === threadId ? { ...t, ...updates } : t
                  ),
                }
              : w
          ),
        }));
      },
      
      deleteThread: (workspaceId, threadId) => {
        if (!workspaceId || !threadId) return;
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === workspaceId
              ? { ...w, threads: w.threads.filter((t) => t.id !== threadId) }
              : w
          ),
          selectedThreadId:
            state.selectedThreadId === threadId ? null : state.selectedThreadId,
        }));
      },
      
      updateSettings: (settings) => {
        if (!settings) return;
        set((state) => ({
          settings: { 
            ...state.settings,
            ...settings 
          }
        }));
      },
      
      toggleSettingsPanel: () =>
        set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
      
      toggleModulesPanel: () =>
        set((state) => ({ isModulesPanelOpen: !state.isModulesPanelOpen })),
      
      toggleDebugPanel: () =>
        set((state) => ({ isDebugPanelOpen: !state.isDebugPanelOpen })),

      // Selectors
      getCurrentWorkspace: () => {
        const state = get();
        return state.workspaces.find((w) => w.id === state.selectedWorkspaceId) || undefined;
      },
      
      getCurrentThread: () => {
        const state = get();
        const workspace = state.workspaces.find(
          (w) => w.id === state.selectedWorkspaceId
        );
        return workspace?.threads.find((t) => t.id === state.selectedThreadId) || undefined;
      },
      
      getCurrentMessages: () => {
        const state = get();
        const workspace = state.workspaces.find(
          (w) => w.id === state.selectedWorkspaceId
        );
        const thread = workspace?.threads.find(
          (t) => t.id === state.selectedThreadId
        );
        return thread?.messages || [];
      },
    }),
    {
      name: 'nexus-chat-storage',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      migrate,
      partialize: (state) => ({
        workspaces: state.workspaces,
        selectedWorkspaceId: state.selectedWorkspaceId,
        selectedThreadId: state.selectedThreadId,
        settings: state.settings,
      }),
    }
  )
);

export const useCreateWorkspace = () => {
  const addWorkspace = useStore((state) => state.addWorkspace);
  
  return () => {
    const workspace: Workspace = {
      id: crypto.randomUUID(),
      name: 'New Workspace',
      threads: [],
      createdAt: Date.now(),
      modules: []
    };
    addWorkspace(workspace);
  };
};

export const useCreateThread = () => {
  const addThread = useStore((state) => state.addThread);
  const selectedWorkspaceId = useStore((state) => state.selectedWorkspaceId);
  
  return (workspaceId: string = selectedWorkspaceId!) => {
    if (!workspaceId) return;
    
    const thread: Thread = {
      id: crypto.randomUUID(),
      name: 'New Thread',
      messages: [],
      createdAt: Date.now(),
    };
    addThread(workspaceId, thread);
  };
};
