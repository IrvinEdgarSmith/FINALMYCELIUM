import { Edit2, MessageSquarePlus, Save, Trash2, Settings } from 'lucide-react';
import { useState } from 'react';
import { Workspace } from '../types';
import WorkspaceSettings from './WorkspaceSettings';
import { useStore } from '../store';

interface WorkspaceCardProps {
  workspace: Workspace;
  onNewThread: (workspaceId: string) => void;
  onRename: (newName: string) => void;
  onDeleteThread: (workspaceId: string, threadId: string) => void;
  onThreadSelect: (workspaceId: string, threadId: string) => void;
  isSelected: boolean;
  selectedThread: string | null;
}

const WorkspaceCard = ({ 
  workspace, 
  onNewThread, 
  onRename,
  onDeleteThread,
  onThreadSelect,
  isSelected,
  selectedThread,
}: WorkspaceCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [name, setName] = useState(workspace.name);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingThreadName, setEditingThreadName] = useState('');
  const { settings, updateWorkspace, updateThread } = useStore();

  const handleRename = () => {
    if (name.trim()) {
      onRename(name);
      setIsEditing(false);
    }
  };

  const handleSettingsSave = (updates: Partial<Workspace>) => {
    updateWorkspace(workspace.id, updates);
  };

  const handleThreadClick = (threadId: string) => {
    onThreadSelect(workspace.id, threadId);
  };

  const handleKeyDown = (event: React.KeyboardEvent, threadId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleThreadClick(threadId);
    }
  };

  const handleDeleteThread = (threadId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (window.confirm('Are you sure you want to delete this thread?')) {
      onDeleteThread(workspace.id, threadId);
    }
  };

  const startRenamingThread = (threadId: string, currentName: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingThreadId(threadId);
    setEditingThreadName(currentName);
  };

  const handleThreadRename = (threadId: string, event: React.FormEvent) => {
    event.preventDefault();
    if (editingThreadName.trim()) {
      updateThread(workspace.id, threadId, { name: editingThreadName.trim() });
      setEditingThreadId(null);
      setEditingThreadName('');
    }
  };

  return (
    <div 
      className={`workspace-card p-4 rounded-lg transition-all duration-200
        ${isSelected ? 'ring-2 ring-purple-600 bg-slate-800' : 'bg-slate-900 hover:bg-slate-800'}`}
    >
      <div className="flex items-center justify-between mb-2">
        {isEditing ? (
          <div className="flex gap-2 w-full">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-700 px-2 py-1 rounded flex-1 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRename();
                }
              }}
            />
            <button
              onClick={handleRename}
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              <Save size={18} />
            </button>
          </div>
        ) : (
          <>
            <h3 className="font-medium text-sm text-slate-200">{workspace.name}</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="text-slate-400 hover:text-slate-300 transition-colors"
                title="Workspace Settings"
              >
                <Settings size={16} />
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="text-slate-400 hover:text-slate-300 transition-colors"
                title="Rename Workspace"
              >
                <Edit2 size={16} />
              </button>
            </div>
          </>
        )}
      </div>

      {workspace.model && (
        <div className="mb-2 text-xs text-slate-400">
          Model: {workspace.model.split('/').pop()}
        </div>
      )}

      <div className="space-y-3">
        <button
          onClick={() => onNewThread(workspace.id)}
          className="w-full btn-secondary text-sm flex items-center justify-center gap-2"
        >
          <MessageSquarePlus size={16} />
          New Thread
        </button>

        {workspace.threads.length > 0 && (
          <div className="space-y-1">
            {workspace.threads.map((thread) => (
              <div
                key={thread.id}
                onClick={() => handleThreadClick(thread.id)}
                onKeyDown={(e) => handleKeyDown(e, thread.id)}
                className={`flex items-center justify-between text-sm px-3 py-2 rounded cursor-pointer group transition-all
                  ${thread.id === selectedThread 
                    ? 'bg-purple-600 text-white' 
                    : 'hover:bg-slate-700 text-slate-300'}`}
                role="button"
                tabIndex={0}
                aria-selected={thread.id === selectedThread}
                aria-label={`Select thread: ${thread.name}`}
              >
                {editingThreadId === thread.id ? (
                  <form 
                    onSubmit={(e) => handleThreadRename(thread.id, e)}
                    className="flex-1 flex gap-2"
                    onClick={e => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      value={editingThreadName}
                      onChange={(e) => setEditingThreadName(e.target.value)}
                      className="bg-slate-700 px-2 py-1 rounded flex-1 text-sm text-white"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setEditingThreadId(null);
                        }
                      }}
                    />
                    <button
                      type="submit"
                      className="text-white/70 hover:text-white"
                    >
                      <Save size={14} />
                    </button>
                  </form>
                ) : (
                  <>
                    <span className="flex-1 truncate">{thread.name}</span>
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                      <button
                        onClick={(e) => startRenamingThread(thread.id, thread.name, e)}
                        className="text-white/70 hover:text-white transition-all"
                        aria-label="Rename thread"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteThread(thread.id, e)}
                        className="text-white/70 hover:text-white transition-all ml-1"
                        aria-label="Delete thread"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <WorkspaceSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        workspace={workspace}
        apiKey={settings.apiKey}
        onSave={handleSettingsSave}
      />
    </div>
  );
};

export default WorkspaceCard;
