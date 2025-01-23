import { useRef, useState, useEffect } from 'react';
import { Send, Globe } from 'lucide-react';
import { useStore } from '../store';
import { useMessage } from '../hooks/useMessage';
import MessageList from './MessageList';
import SearchStatus from './SearchStatus';

const ChatInterface = () => {
  const [input, setInput] = useState('');
  const [isWebAssisted, setIsWebAssisted] = useState(false);
  const [isDeepSearch, setIsDeepSearch] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const {
    selectedThreadId,
    selectedWorkspaceId,
    settings,
    getCurrentWorkspace,
    getCurrentMessages,
    getCurrentThread,
  } = useStore();

  const { sendMessage, isLoading, searchState } = useMessage();
  
  // Auto-focus input when thread changes
  useEffect(() => {
    if (selectedThreadId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedThreadId]);

  // Scroll to bottom when messages change or thread is selected
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [getCurrentMessages(), selectedThreadId]);

  const handleWebAssistClick = () => {
    const currentTime = Date.now();
    const timeDiff = currentTime - lastClickTime;
    
    // Check for double click (time difference less than 300ms)
    if (timeDiff < 300) {
      setIsDeepSearch(true);
      setIsWebAssisted(true);
    } else {
      setIsDeepSearch(false);
      setIsWebAssisted(!isWebAssisted);
    }
    
    setLastClickTime(currentTime);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const workspace = getCurrentWorkspace();
    if (!workspace) {
      console.error('No workspace selected');
      return;
    }

    try {
      await sendMessage(
        input.trim(),
        isWebAssisted,
        isDeepSearch
      );

      setInput('');
      setIsDeepSearch(false); // Reset deep search after sending
      inputRef.current?.focus();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!selectedThreadId || !selectedWorkspaceId) {
    return (
      <div className="flex-1 flex items-center justify-center h-screen bg-slate-950">
        <p className="text-slate-500">Select a thread to start chatting</p>
      </div>
    );
  }

  const currentThread = getCurrentThread();
  const currentWorkspace = getCurrentWorkspace();
  const isInputDisabled = isLoading;

  const showWebAssist = Boolean(settings.googleSearchId && settings.googleSearchApiKey);

  return (
    <div className="flex-1 flex flex-col h-screen bg-slate-950">
      <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-slate-300">
              {currentThread?.name}
            </h2>
            <p className="text-xs text-slate-500">
              Using {currentWorkspace?.model || settings.model}
            </p>
          </div>
        </div>
      </div>

      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto"
      >
        <MessageList messages={getCurrentMessages()} />
      </div>

      <div className="p-4 border-t border-slate-800">
        <SearchStatus searchState={searchState} isDeepSearch={isDeepSearch} />

        <div className="flex gap-2 mt-2">
          {showWebAssist && (
            <button
              type="button"
              onClick={handleWebAssistClick}
              className={`p-2 rounded-lg transition-colors relative ${
                isWebAssisted 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-800 text-slate-400'
              }`}
              title={`${isDeepSearch ? 'Deep Search' : 'Web Search'} ${isWebAssisted ? 'Enabled' : 'Disabled'}`}
              disabled={isInputDisabled}
            >
              <Globe size={20} />
              {isDeepSearch && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full animate-pulse" />
              )}
            </button>
          )}
          
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isInputDisabled
                ? "Please wait..."
                : "Type your message..."
            }
            className="flex-1 bg-slate-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600 resize-none"
            disabled={isInputDisabled}
            style={{
              minHeight: '42px',
              maxHeight: '200px',
            }}
          />
          
          <button
            onClick={() => handleSubmit()}
            disabled={!input.trim() || isInputDisabled}
            className={`px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2 transition-colors
              ${(!input.trim() || isInputDisabled) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>

        {isLoading && (
          <div className="mt-2 text-sm text-slate-400 flex items-center gap-2">
            <div className="animate-spin w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full" />
            Processing response...
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;
