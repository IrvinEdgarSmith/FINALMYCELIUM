import { useEffect } from 'react';
import { Settings as SettingsIcon, BookOpen } from 'lucide-react';
import ChatInterface from './components/ChatInterface';
import Sidebar from './components/Sidebar';
import Settings from './components/Settings';
import ModulesPanel from './components/ModulesPanel';
import ErrorBoundary from './components/ErrorBoundary';
import DebugPanel from './components/DebugPanel';
import { useStore, useCreateWorkspace, useCreateThread } from './store';

function App() {
  const {
    workspaces,
    settings,
    isSettingsOpen,
    isModulesPanelOpen,
    isDebugPanelOpen,
    toggleSettingsPanel,
    toggleModulesPanel,
    toggleDebugPanel,
    selectedWorkspaceId,
    selectedThreadId,
    updateWorkspace,
    deleteThread,
    selectWorkspace,
    selectThread,
  } = useStore();

  const createWorkspace = useCreateWorkspace();
  const createThread = useCreateThread();

  // Create initial workspace if none exists
  useEffect(() => {
    if (workspaces.length === 0) {
      createWorkspace();
    }
  }, [workspaces.length, createWorkspace]);

  // Debug keyboard shortcut
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
        event.preventDefault();
        toggleDebugPanel();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [toggleDebugPanel]);

  const handleThreadSelect = (workspaceId: string, threadId: string) => {
    selectWorkspace(workspaceId);
    selectThread(threadId);
  };

  return (
    <ErrorBoundary>
      <div className="flex h-screen overflow-hidden bg-slate-950">
        <Sidebar 
          workspaces={workspaces}
          onNewWorkspace={createWorkspace}
          onNewThread={createThread}
          onRenameWorkspace={(id, name) => updateWorkspace(id, { name })}
          onModelChange={(id, model) => updateWorkspace(id, { model })}
          onDeleteThread={deleteThread}
          onThreadSelect={handleThreadSelect}
          selectedWorkspace={selectedWorkspaceId}
          selectedThread={selectedThreadId}
          apiKey={settings.apiKey}
        />
        
        <div className="flex-1 relative">
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={toggleModulesPanel}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
              aria-label="Toggle Modules"
            >
              <BookOpen size={24} />
            </button>
            <button
              onClick={toggleSettingsPanel}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
              aria-label="Toggle Settings"
            >
              <SettingsIcon size={24} />
            </button>
          </div>
          
          <ChatInterface />
        </div>

        <Settings
          isOpen={isSettingsOpen}
          onClose={toggleSettingsPanel}
          settings={settings}
          onSave={useStore((state) => state.updateSettings)}
        />

        <ModulesPanel
          isOpen={isModulesPanelOpen}
          onClose={toggleModulesPanel}
        />

        <DebugPanel
          settings={settings}
          workspaces={workspaces}
          isVisible={isDebugPanelOpen}
          onClose={toggleDebugPanel}
        />
      </div>
    </ErrorBoundary>
  );
}

export default App;
