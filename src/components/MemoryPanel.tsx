import { Brain, X, Search, Trash2, RefreshCw, Plus, Edit2, AlertTriangle, Database, Loader } from 'lucide-react';
import { useMemoryStore } from '../store/memoryStore';
import { Memory } from '../types/memory';
import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { fetchGoogleAIModels, GoogleAIModel } from '../services/googleai';

interface MemoryFormData {
  type: 'fact' | 'concept' | 'relationship';
  content: string;
  confidence: number;
  source: string;
  tags: string[];
}

const MemoryPanel = () => {
  const {
    memories,
    isMemoryPanelOpen,
    activeFilter,
    searchQuery,
    toggleMemoryPanel,
    setActiveFilter,
    setSearchQuery,
    removeMemory,
    clearMemories,
    getRelatedMemories,
    addMemory,
  } = useMemoryStore();

  const { chromaSettings, updateChromaSettings } = useStore();

  const [selectedMemory, setSelectedMemory] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'memories'>('memories');
  const [formData, setFormData] = useState<MemoryFormData>({
    type: 'fact',
    content: '',
    confidence: 1.0,
    source: '',
    tags: [],
  });
  
  // Google AI Models state
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<GoogleAIModel[]>([]);

  useEffect(() => {
    if (chromaSettings.geminiApiKey && activeTab === 'settings') {
      loadGoogleModels();
    }
  }, [chromaSettings.geminiApiKey, activeTab]);

  const loadGoogleModels = async () => {
    setIsLoadingModels(true);
    setModelError(null);
    try {
      const models = await fetchGoogleAIModels(chromaSettings.geminiApiKey);
      setAvailableModels(models);
    } catch (error) {
      setModelError(error instanceof Error ? error.message : 'Failed to load models');
      setAvailableModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  };

  if (!isMemoryPanelOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-lg w-[800px] max-h-[80vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Brain className="text-purple-400" size={24} />
            <h2 className="text-xl font-semibold">Memory Management</h2>
          </div>
          <button
            onClick={toggleMemoryPanel}
            className="text-slate-400 hover:text-slate-300 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setActiveTab('memories')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'memories'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Memory Management
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'settings'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Chroma DB Settings
          </button>
        </div>

        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 130px)' }}>
          {activeTab === 'settings' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Database className="text-purple-400" size={20} />
                <h3 className="text-lg font-medium">Chroma DB Configuration</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Host</label>
                  <input
                    type="text"
                    value={chromaSettings.host}
                    onChange={(e) => updateChromaSettings({ ...chromaSettings, host: e.target.value })}
                    className="w-full bg-slate-800 rounded px-3 py-2"
                    placeholder="localhost"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Port</label>
                  <input
                    type="number"
                    value={chromaSettings.port}
                    onChange={(e) => updateChromaSettings({ ...chromaSettings, port: parseInt(e.target.value) || 8000 })}
                    className="w-full bg-slate-800 rounded px-3 py-2"
                    placeholder="8000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Collection Name</label>
                  <input
                    type="text"
                    value={chromaSettings.collection}
                    onChange={(e) => updateChromaSettings({ ...chromaSettings, collection: e.target.value })}
                    className="w-full bg-slate-800 rounded px-3 py-2"
                    placeholder="memories"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Gemini API Key
                    <span className="ml-2 text-xs text-slate-400">
                      (Get your API key from Google AI Studio)
                    </span>
                  </label>
                  <input
                    type="password"
                    value={chromaSettings.geminiApiKey}
                    onChange={(e) => updateChromaSettings({ ...chromaSettings, geminiApiKey: e.target.value })}
                    className="w-full bg-slate-800 rounded px-3 py-2"
                    placeholder="Enter your Gemini API key"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Your API key should start with 'AI'
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Embedding Model</label>
                  <div className="relative">
                    <select
                      value={chromaSettings.embeddingModel}
                      onChange={(e) => updateChromaSettings({ ...chromaSettings, embeddingModel: e.target.value })}
                      className="w-full bg-slate-800 rounded px-3 py-2 appearance-none"
                      disabled={isLoadingModels || !chromaSettings.geminiApiKey}
                    >
                      <option value="">Select a model</option>
                      {availableModels.map((model) => (
                        <option key={model.name} value={model.name}>
                          {model.displayName}
                        </option>
                      ))}
                    </select>
                    {isLoadingModels && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader size={16} className="animate-spin text-purple-400" />
                      </div>
                    )}
                  </div>
                  {modelError && (
                    <p className="text-red-400 text-sm mt-1">{modelError}</p>
                  )}
                  {!chromaSettings.geminiApiKey && (
                    <p className="text-yellow-400 text-sm mt-1">
                      Enter a Gemini API key to load available models
                    </p>
                  )}
                </div>

                <button
                  onClick={() => updateChromaSettings(chromaSettings)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-4 py-2 transition-colors"
                >
                  Save Chroma Settings
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Memory Management UI will go here */}
              <div className="text-slate-400">
                Memory management interface under development
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemoryPanel;
