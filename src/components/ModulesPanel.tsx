import { useState } from 'react';
import { X, Plus, Upload, Trash2 } from 'lucide-react';
import { Module, ModuleFile } from '../types';
import { useStore } from '../store';

interface ModulesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const ModulesPanel = ({ isOpen, onClose }: ModulesPanelProps) => {
  const { getCurrentWorkspace, selectedWorkspaceId, updateWorkspace } = useStore();
  const [isCreating, setIsCreating] = useState(false);
  const [command, setCommand] = useState('');
  const [instructions, setInstructions] = useState('');
  const [files, setFiles] = useState<ModuleFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const workspace = getCurrentWorkspace();
  const modules = workspace?.modules || [];

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles) return;

    const newFiles: ModuleFile[] = [];
    for (const file of uploadedFiles) {
      try {
        const content = await readFileContent(file);
        newFiles.push({
          id: crypto.randomUUID(),
          name: file.name,
          content,
          type: file.type,
          size: file.size
        });
      } catch (error) {
        setError(`Failed to read file ${file.name}`);
      }
    }

    setFiles([...files, ...newFiles]);
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const handleCreateModule = () => {
    if (!command.trim() || !instructions.trim()) {
      setError('Command and instructions are required');
      return;
    }

    if (!command.startsWith('/')) {
      setError('Command must start with /');
      return;
    }

    const newModule: Module = {
      id: crypto.randomUUID(),
      command: command.trim(),
      instructions: instructions.trim(),
      files,
      createdAt: Date.now()
    };

    const currentModules = workspace?.modules || [];
    updateWorkspace(selectedWorkspaceId!, {
      modules: [...currentModules, newModule]
    });

    setIsCreating(false);
    setCommand('');
    setInstructions('');
    setFiles([]);
    setError(null);
  };

  const handleDeleteModule = (moduleId: string) => {
    const updatedModules = modules.filter(m => m.id !== moduleId);
    updateWorkspace(selectedWorkspaceId!, { modules: updatedModules });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-lg p-6 w-[600px] max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Modules</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-300"
          >
            <X size={24} />
          </button>
        </div>

        {isCreating ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Command</label>
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="/ExpertModule"
                className="w-full bg-slate-800 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Instructions</label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Instructions for the AI when this module is activated..."
                className="w-full bg-slate-800 rounded px-3 py-2 h-32 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Files</label>
              <div className="border-2 border-dashed border-slate-700 rounded-lg p-4">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  multiple
                  className="hidden"
                  id="module-file-upload"
                />
                <label
                  htmlFor="module-file-upload"
                  className="flex flex-col items-center gap-2 cursor-pointer"
                >
                  <Upload className="text-slate-400" />
                  <span className="text-sm text-slate-400">
                    Click to upload files
                  </span>
                </label>
              </div>

              {files.length > 0 && (
                <div className="mt-2 space-y-2">
                  {files.map(file => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between bg-slate-800 p-2 rounded"
                    >
                      <span className="text-sm">{file.name}</span>
                      <button
                        onClick={() => setFiles(files.filter(f => f.id !== file.id))}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsCreating(false);
                  setCommand('');
                  setInstructions('');
                  setFiles([]);
                  setError(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateModule}
                className="btn-primary"
              >
                Create Module
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => setIsCreating(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={20} />
              New Module
            </button>

            {modules.length > 0 ? (
              <div className="space-y-2">
                {modules.map(module => (
                  <div
                    key={module.id}
                    className="bg-slate-800 p-4 rounded-lg space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-purple-400">
                          {module.command}
                        </h3>
                        <p className="text-sm text-slate-400 mt-1">
                          {module.instructions}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteModule(module.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {module.files.length > 0 && (
                      <div className="text-xs text-slate-500">
                        {module.files.length} file(s) attached
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-center py-4">
                No modules created yet
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModulesPanel;
