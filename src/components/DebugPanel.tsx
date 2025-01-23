import React, { useEffect, useState } from 'react';
import { Bug, X, RefreshCw, AlertTriangle } from 'lucide-react';
import { Settings, Workspace } from '../types';

interface DebugInfo {
  browserInfo: {
    userAgent: string;
    platform: string;
    language: string;
    screenSize: string;
  };
  reactInfo: {
    version: string;
    strictMode: boolean;
  };
  renderCounts: Record<string, number>;
  apiCalls: {
    timestamp: number;
    endpoint: string;
    status: number;
    duration: number;
    error?: string;
  }[];
  consoleErrors: {
    timestamp: number;
    message: string;
    stack?: string;
  }[];
  environmentInfo: {
    mode: string;
    baseUrl: string;
  };
  authState: {
    hasApiKey: boolean;
    hasNotionKey: boolean;
    hasBraveKey: boolean;
  };
}

interface DebugPanelProps {
  settings: Settings;
  workspaces: Workspace[];
  isVisible: boolean;
  onClose: () => void;
}

const DebugPanel = ({ settings, workspaces, isVisible, onClose }: DebugPanelProps) => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    browserInfo: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
    },
    reactInfo: {
      version: React.version,
      strictMode: true, // Assuming StrictMode is enabled in main.tsx
    },
    renderCounts: {},
    apiCalls: [],
    consoleErrors: [],
    environmentInfo: {
      mode: import.meta.env.MODE,
      baseUrl: window.location.origin,
    },
    authState: {
      hasApiKey: Boolean(settings.apiKey),
      hasNotionKey: Boolean(settings.notionKey),
      hasBraveKey: Boolean(settings.braveApiKey),
    },
  });

  useEffect(() => {
    // Intercept and track console errors
    const originalError = console.error;
    console.error = (...args) => {
      setDebugInfo(prev => ({
        ...prev,
        consoleErrors: [
          ...prev.consoleErrors,
          {
            timestamp: Date.now(),
            message: args.join(' '),
            stack: new Error().stack,
          },
        ].slice(-50), // Keep last 50 errors
      }));
      originalError.apply(console, args);
    };

    // Intercept fetch/XHR requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = Date.now();
      try {
        const response = await originalFetch.apply(window, args);
        setDebugInfo(prev => ({
          ...prev,
          apiCalls: [
            ...prev.apiCalls,
            {
              timestamp: startTime,
              endpoint: args[0].toString(),
              status: response.status,
              duration: Date.now() - startTime,
            },
          ].slice(-50), // Keep last 50 calls
        }));
        return response;
      } catch (error) {
        setDebugInfo(prev => ({
          ...prev,
          apiCalls: [
            ...prev.apiCalls,
            {
              timestamp: startTime,
              endpoint: args[0].toString(),
              status: 0,
              duration: Date.now() - startTime,
              error: error.message,
            },
          ].slice(-50),
        }));
        throw error;
      }
    };

    return () => {
      console.error = originalError;
      window.fetch = originalFetch;
    };
  }, []);

  if (!isVisible) return null;

  const hasErrors = debugInfo.consoleErrors.length > 0 || 
                   debugInfo.apiCalls.some(call => call.status >= 400);

  return (
    <div className="fixed inset-0 bg-black/50 z-50">
      <div className="absolute right-0 top-0 h-full w-[600px] bg-slate-900 shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bug className={hasErrors ? "text-red-500" : "text-green-500"} />
            <h2 className="text-lg font-semibold">Debug Panel</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="p-2 hover:bg-slate-800 rounded-lg"
              title="Refresh page"
            >
              <RefreshCw size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg"
              title="Close debug panel"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Environment Information */}
          <section className="space-y-2">
            <h3 className="text-sm font-medium text-slate-400">Environment</h3>
            <div className="bg-slate-800 p-3 rounded-lg space-y-1">
              <p className="text-sm">Mode: {debugInfo.environmentInfo.mode}</p>
              <p className="text-sm">Base URL: {debugInfo.environmentInfo.baseUrl}</p>
            </div>
          </section>

          {/* Authentication State */}
          <section className="space-y-2">
            <h3 className="text-sm font-medium text-slate-400">Authentication</h3>
            <div className="bg-slate-800 p-3 rounded-lg space-y-1">
              <p className="text-sm">
                OpenRouter API Key: {' '}
                <span className={debugInfo.authState.hasApiKey ? "text-green-500" : "text-red-500"}>
                  {debugInfo.authState.hasApiKey ? "Present" : "Missing"}
                </span>
              </p>
              <p className="text-sm">
                Notion Integration Key: {' '}
                <span className={debugInfo.authState.hasNotionKey ? "text-green-500" : "text-red-500"}>
                  {debugInfo.authState.hasNotionKey ? "Present" : "Missing"}
                </span>
              </p>
              <p className="text-sm">
                Brave Search API Key: {' '}
                <span className={debugInfo.authState.hasBraveKey ? "text-green-500" : "text-red-500"}>
                  {debugInfo.authState.hasBraveKey ? "Present" : "Missing"}
                </span>
              </p>
            </div>
          </section>

          {/* Console Errors */}
          <section className="space-y-2">
            <h3 className="text-sm font-medium text-slate-400">Console Errors</h3>
            <div className="space-y-2">
              {debugInfo.consoleErrors.length === 0 ? (
                <p className="text-sm text-green-500 bg-green-500/10 p-3 rounded-lg">
                  No console errors detected
                </p>
              ) : (
                debugInfo.consoleErrors.map((error, index) => (
                  <div key={index} className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={16} className="text-red-500 mt-1" />
                      <div>
                        <p className="text-sm text-red-400">{error.message}</p>
                        {error.stack && (
                          <pre className="mt-2 text-xs text-red-400/70 overflow-x-auto">
                            {error.stack}
                          </pre>
                        )}
                        <p className="text-xs text-red-400/50 mt-1">
                          {new Date(error.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* API Calls */}
          <section className="space-y-2">
            <h3 className="text-sm font-medium text-slate-400">Recent API Calls</h3>
            <div className="space-y-2">
              {debugInfo.apiCalls.map((call, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg ${
                    call.status >= 400
                      ? 'bg-red-500/10 border border-red-500/20'
                      : call.status >= 200
                      ? 'bg-green-500/10 border border-green-500/20'
                      : 'bg-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-sm font-mono">{call.endpoint}</p>
                      <p className="text-xs text-slate-400">
                        Status: {call.status} • Duration: {call.duration}ms
                      </p>
                    </div>
                    <span className="text-xs">
                      {new Date(call.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {call.error && (
                    <p className="mt-2 text-sm text-red-400">{call.error}</p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Application State */}
          <section className="space-y-2">
            <h3 className="text-sm font-medium text-slate-400">Application State</h3>
            <div className="bg-slate-800 p-3 rounded-lg space-y-2">
              <div>
                <h4 className="text-sm font-medium mb-1">Workspaces ({workspaces.length})</h4>
                <div className="space-y-1">
                  {workspaces.map(workspace => (
                    <div key={workspace.id} className="text-sm">
                      {workspace.name} ({workspace.threads.length} threads)
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Browser Information */}
          <section className="space-y-2">
            <h3 className="text-sm font-medium text-slate-400">Browser Information</h3>
            <div className="bg-slate-800 p-3 rounded-lg space-y-1">
              <p className="text-sm">User Agent: {debugInfo.browserInfo.userAgent}</p>
              <p className="text-sm">Platform: {debugInfo.browserInfo.platform}</p>
              <p className="text-sm">Language: {debugInfo.browserInfo.language}</p>
              <p className="text-sm">Screen Size: {debugInfo.browserInfo.screenSize}</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default DebugPanel;
