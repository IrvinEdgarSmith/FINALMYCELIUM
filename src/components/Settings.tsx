import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Settings as SettingsType } from '../types';
import { OpenRouterModel } from '../types/openrouter';
import { fetchModels } from '../services/openrouter';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SettingsType;
  onSave: (settings: SettingsType) => void;
}

const Settings = ({ isOpen, onClose, settings, onSave }: SettingsProps) => {
  const [formData, setFormData] = useState(settings);
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settings.apiKey) {
      loadModels();
    }
  }, [settings.apiKey]);

  const loadModels = async () => {
    try {
      const fetchedModels = await fetchModels(settings.apiKey);
      setModels(fetchedModels);
      setError(null);
    } catch (err) {
      setError("Failed to load models. Please check your API key.");
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-lg p-6 w-[500px] max-w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Global Settings</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-300"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* OpenRouter Settings */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-slate-300">OpenRouter Settings</h3>
            <div className="space-y-2">
              <label className="block text-sm font-medium">OpenRouter API Key</label>
              <input
                type="password"
                value={formData.apiKey}
                onChange={(e) =>
                  setFormData({ ...formData, apiKey: e.target.value })
                }
                className="w-full bg-slate-800 rounded px-3 py-2"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Default Chat Model</label>
              <select
                value={formData.model}
                onChange={(e) =>
                  setFormData({ ...formData, model: e.target.value })
                }
                className="w-full bg-slate-800 rounded px-3 py-2"
              >
                <option value="">Select a model</option>
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} (${model.pricing.prompt}/1k tokens)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* OpenAI Settings */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-slate-300">OpenAI Settings</h3>
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                OpenAI API Key
                <span className="ml-2 text-xs text-slate-400">
                  (Used for file embeddings)
                </span>
              </label>
              <input
                type="password"
                value={formData.openAIApiKey || ''}
                onChange={(e) =>
                  setFormData({ ...formData, openAIApiKey: e.target.value })
                }
                className="w-full bg-slate-800 rounded px-3 py-2"
                placeholder="sk-..."
              />
              <p className="text-xs text-slate-400">
                This key is used for generating embeddings when uploading files to workspaces
              </p>
            </div>
          </div>

          {/* Google Search Settings */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-slate-300">Google Search Settings</h3>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium">Search Engine ID</label>
              <input
                type="text"
                value={formData.googleSearchId || ''}
                onChange={(e) =>
                  setFormData({ ...formData, googleSearchId: e.target.value })
                }
                className="w-full bg-slate-800 rounded px-3 py-2"
                placeholder="Enter your Google Programmable Search Engine ID"
              />
              <p className="text-xs text-slate-400">
                Create a custom search engine at{' '}
                <a
                  href="https://programmablesearchengine.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300"
                >
                  Google Programmable Search
                </a>
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Search API Key</label>
              <input
                type="password"
                value={formData.googleSearchApiKey || ''}
                onChange={(e) =>
                  setFormData({ ...formData, googleSearchApiKey: e.target.value })
                }
                className="w-full bg-slate-800 rounded px-3 py-2"
                placeholder="Enter your Google Custom Search API key"
              />
              <p className="text-xs text-slate-400">
                Get your API key from the{' '}
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300"
                >
                  Google Cloud Console
                </a>
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">System Prompt</label>
            <textarea
              value={formData.systemPrompt}
              onChange={(e) =>
                setFormData({ ...formData, systemPrompt: e.target.value })
              }
              className="w-full bg-slate-800 rounded px-3 py-2 h-32 resize-none"
            />
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
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
