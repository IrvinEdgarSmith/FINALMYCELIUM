import { X, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { NotionPage, NotionSettings } from '../types/notion';
import { fetchNotionPages } from '../services/notion';

interface NotionIntegrationProps {
  isOpen: boolean;
  onClose: () => void;
  settings: NotionSettings;
  onSave: (settings: NotionSettings) => void;
}

const NotionIntegration = ({ isOpen, onClose, settings, onSave }: NotionIntegrationProps) => {
  const [integrationKey, setIntegrationKey] = useState(settings.integrationKey);
  const [pages, setPages] = useState<NotionPage[]>(settings.pages);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (integrationKey) {
      fetchPages();
    }
  }, [integrationKey, retryCount]);

  const fetchPages = async () => {
    if (!integrationKey) {
      setError('Please enter a Notion integration key');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const fetchedPages = await fetchNotionPages(integrationKey);
      setPages(fetchedPages);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch Notion pages');
      setPages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!integrationKey.startsWith('secret_')) {
      setError('Invalid Notion key format. Key should start with "secret_"');
      return;
    }
    onSave({
      integrationKey,
      pages
    });
    onClose();
  };

  const togglePageSelection = (pageId: string) => {
    setPages(pages.map(page => 
      page.id === pageId ? { ...page, selected: !page.selected } : page
    ));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-lg p-6 w-[600px] max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Notion Integration</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-300 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Notion Integration Key
              <span className="text-xs text-slate-400 ml-2">(starts with secret_)</span>
            </label>
            <input
              type="password"
              value={integrationKey}
              onChange={(e) => setIntegrationKey(e.target.value)}
              placeholder="secret_..."
              className="w-full bg-slate-800 rounded px-3 py-2 focus:ring-2 focus:ring-purple-600 outline-none"
            />
            <p className="text-xs text-slate-400">
              Note: Make sure your integration has access to:
              <br />• Internal integrations need admin access to workspaces
              <br />• Access to the specific pages you want to use
              <br />• Required capabilities: Read content, Read user information, Read page content
            </p>
          </div>

          {error && (
            <div className="text-red-400 text-sm p-3 bg-red-400/10 rounded-lg border border-red-400/20">
              {error}
              <button
                type="button"
                onClick={() => setRetryCount(count => count + 1)}
                className="ml-2 text-purple-400 hover:text-purple-300 underline"
              >
                Retry
              </button>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium">Available Pages and Databases</label>
              <button
                type="button"
                onClick={fetchPages}
                className={`text-slate-400 hover:text-slate-300 p-1 rounded-full transition-colors
                  ${loading ? 'animate-spin bg-slate-800' : ''}`}
                disabled={loading}
              >
                <RefreshCw size={16} />
              </button>
            </div>
            
            <div className="max-h-64 overflow-y-auto space-y-2 rounded-lg bg-slate-950 p-2">
              {loading ? (
                <div className="text-center p-4 text-slate-400">
                  Loading pages...
                </div>
              ) : pages.length > 0 ? (
                pages.map((page) => (
                  <div
                    key={page.id}
                    className="flex items-center space-x-3 p-2 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={page.selected}
                      onChange={() => togglePageSelection(page.id)}
                      className="rounded border-slate-600 text-purple-600 focus:ring-purple-600"
                    />
                    <div>
                      <div className="text-sm font-medium truncate max-w-[400px]">
                        {page.title}
                      </div>
                      <div className="text-xs text-slate-400">
                        {page.type === 'database' ? 'Database' : 'Page'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-slate-400 text-sm p-4 text-center">
                  {error ? 'Please fix the error above and try again' : 'No pages found'}
                </div>
              )}
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
              disabled={loading || !integrationKey}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NotionIntegration;
