import { X, Plus, Trash2, Settings, Upload, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchModels } from '../services/openrouter';
import { OpenRouterModel } from '../types/openrouter';
import { Workspace, ProjectVariable, WorkspaceFile } from '../types';
import { processFile } from '../services/openai';
import { useStore } from '../store';

interface WorkspaceSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: Workspace;
  apiKey: string;
  onSave: (updates: Partial<Workspace>) => void;
}

const WorkspaceSettings = ({
  isOpen,
  onClose,
  workspace,
  apiKey,
  onSave,
}: WorkspaceSettingsProps) => {
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [selectedModel, setSelectedModel] = useState(workspace.model || 'anthropic/claude-2');
  const [temperature, setTemperature] = useState(workspace.temperature || 0.7);
  const [projectVariables, setProjectVariables] = useState<ProjectVariable[]>(
    workspace.projectVariables || []
  );
  const [overrideSystemPrompt, setOverrideSystemPrompt] = useState(workspace.overrideSystemPrompt || false);
  const [systemPrompt, setSystemPrompt] = useState(workspace.systemPrompt || '');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { settings } = useStore();

  useEffect(() => {
    if (isOpen && apiKey) {
      loadModels();
    }
  }, [isOpen, apiKey]);

  const loadModels = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedModels = await fetchModels(apiKey);
      setModels(fetchedModels);
    } catch (err) {
      setError("Failed to load models. Please check your API key.");
    } finally {
      setIsLoading(false);
    }
  };

  const addProjectVariable = () => {
    setProjectVariables([
      ...projectVariables,
      {
        id: crypto.randomUUID(),
        title: '',
        description: '',
      },
    ]);
  };

  const updateProjectVariable = (id: string, field: 'title' | 'description', value: string) => {
    setProjectVariables(
      projectVariables.map((variable) =>
        variable.id === id ? { ...variable, [field]: value } : variable
      )
    );
  };

  const removeProjectVariable = (id: string) => {
    setProjectVariables(projectVariables.filter((variable) => variable.id !== id));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!settings.openAIApiKey) {
      setUploadError('OpenAI API key is required for file uploads. Please add it in global settings.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const file = files[0];
      const processed = await processFile(file, settings.openAIApiKey);

      const newFile: WorkspaceFile = {
        id: crypto.randomUUID(),
        name: file.name,
        content: processed.content,
        embedding: processed.embedding,
        uploadedAt: Date.now(),
        type: file.type,
        size: file.size,
      };

      const currentFiles = workspace.files || [];
      onSave({
        files: [...currentFiles, newFile]
      });

      // Reset file input
      event.target.value = '';
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (fileId: string) => {
    const updatedFiles = (workspace.files || []).filter(f => f.id !== fileId);
    onSave({ files: updatedFiles });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out empty project variables
    const validProjectVariables = projectVariables.filter(
      variable => variable.title.trim() && variable.description.trim()
    );
    
    onSave({
      model: selectedModel,
      temperature,
      projectVariables: validProjectVariables,
      overrideSystemPrompt,
      systemPrompt: overrideSystemPrompt ? systemPrompt : undefined,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-lg p-6 w-[600px] max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Workspace Settings</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-300"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Model Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Language Model</label>
            {isLoading ? (
              <div className="animate-pulse bg-slate-800 h-10 rounded"></div>
            ) : error ? (
              <div className="text-red-400 text-sm p-3 bg-red-400/10 rounded-lg">
                {error}
              </div>
            ) : (
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-slate-800 rounded px-3 py-2"
              >
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} (${model.pricing.prompt}/1k tokens)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* System Prompt Override */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium">Override System Prompt</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={overrideSystemPrompt}
                  onChange={(e) => setOverrideSystemPrompt(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
            {overrideSystemPrompt && (
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Enter workspace-specific system prompt..."
                className="w-full bg-slate-800 rounded px-3 py-2 h-32 resize-none"
              />
            )}
          </div>

          {/* Temperature Control */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Temperature ({temperature})
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-slate-400">
              Lower values make responses more focused and deterministic, higher values make them more creative and varied.
            </p>
          </div>

          {/* File Upload Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium">Workspace Files</label>
              <div className="relative">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  accept=".txt,.md,.json,.csv"
                  disabled={isUploading || !settings.openAIApiKey}
                />
                <label
                  htmlFor="file-upload"
                  className={`flex items-center gap-2 text-sm ${
                    settings.openAIApiKey
                      ? 'text-purple-400 hover:text-purple-300 cursor-pointer'
                      : 'text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Upload size={16} />
                  Upload File
                </label>
              </div>
            </div>

            {uploadError && (
              <div className="text-red-400 text-sm p-3 bg-red-400/10 rounded-lg">
                {uploadError}
              </div>
            )}

            {isUploading && (
              <div className="text-purple-400 text-sm p-3 bg-purple-400/10 rounded-lg flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent"></div>
                Processing file...
              </div>
            )}

            <div className="space-y-2">
              {workspace.files && workspace.files.length > 0 ? (
                workspace.files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between bg-slate-800 p-3 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-slate-400" />
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(file.uploadedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(file.id)}
                      className="text-red-400 hover:text-red-300 p-1"
                      title="Remove file"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">
                  No files uploaded yet
                </p>
              )}
            </div>
          </div>

          {/* Project Variables */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium">Project Variables</label>
              <button
                type="button"
                onClick={addProjectVariable}
                className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300"
              >
                <Plus size={16} />
                New Project Variable
              </button>
            </div>

            <div className="space-y-4">
              {projectVariables.map((variable) => (
                <div
                  key={variable.id}
                  className="flex gap-4 items-start bg-slate-800 p-3 rounded-lg"
                >
                  <div className="flex-1 space-y-3">
                    <input
                      type="text"
                      value={variable.title}
                      onChange={(e) =>
                        updateProjectVariable(variable.id, 'title', e.target.value)
                      }
                      placeholder="Variable Title"
                      className="w-full bg-slate-700 px-3 py-2 rounded"
                    />
                    <textarea
                      value={variable.description}
                      onChange={(e) =>
                        updateProjectVariable(variable.id, 'description', e.target.value)
                      }
                      placeholder="Variable Description"
                      className="w-full bg-slate-700 px-3 py-2 rounded resize-none h-20"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeProjectVariable(variable.id)}
                    className="text-red-400 hover:text-red-300 p-1"
                    title="Remove Variable"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkspaceSettings;
