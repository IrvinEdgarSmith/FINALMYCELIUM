import { Plus } from 'lucide-react';
import { Workspace } from '../types';
import WorkspaceCard from './WorkspaceCard';

interface SidebarProps {
  workspaces: Workspace[];
  onNewWorkspace: () => void;
  onNewThread: (workspaceId: string) => void;
  onRenameWorkspace: (workspaceId: string, newName: string) => void;
  onModelChange: (workspaceId: string, model: string) => void;
  onDeleteThread: (workspaceId: string, threadId: string) => void;
  onThreadSelect: (workspaceId: string, threadId: string) => void;
  selectedWorkspace: string | null;
  selectedThread: string | null;
  apiKey: string;
}

const Sidebar = ({ 
  workspaces, 
  onNewWorkspace, 
  onNewThread, 
  onRenameWorkspace,
  onModelChange,
  onDeleteThread,
  onThreadSelect,
  selectedWorkspace,
  selectedThread,
  apiKey,
}: SidebarProps) => {
  if (!Array.isArray(workspaces)) {
    console.error('Workspaces is not an array:', workspaces);
    return (
      <div className="w-80 h-screen bg-slate-900 border-r border-slate-800 p-4 flex flex-col gap-4">
        <div className="text-red-400">Error loading workspaces</div>
      </div>
    );
  }

  return (
    <div className="w-80 h-screen bg-slate-900 border-r border-slate-800 p-4 flex flex-col gap-4">
      <button
        onClick={onNewWorkspace}
        className="btn-primary flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        New Workspace
      </button>
      
      <div className="flex flex-col gap-3 overflow-y-auto">
        {workspaces.map((workspace) => (
          <WorkspaceCard
            key={workspace.id}
            workspace={workspace}
            onNewThread={() => onNewThread(workspace.id)}
            onRename={(newName) => onRenameWorkspace(workspace.id, newName)}
            onDeleteThread={(threadId) => onDeleteThread(workspace.id, threadId)}
            onThreadSelect={onThreadSelect}
            isSelected={workspace.id === selectedWorkspace}
            selectedThread={selectedThread}
          />
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
