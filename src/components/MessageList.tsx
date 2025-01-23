import { useEffect, useRef } from 'react';
import { UserCircle, Bot } from 'lucide-react';
import { Message } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageListProps {
  messages: Message[];
}

const MessageList = ({ messages }: MessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500">
        Start a conversation by typing a message below
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex gap-3 rounded-lg p-4
            ${message.role === 'assistant'
              ? 'bg-gradient-to-r from-purple-950/80 via-indigo-900/80 to-indigo-950/80' // Updated assistant gradient to start with darker purple
              : 'bg-gradient-to-r from-cyan-900/80 to-purple-900/80'}`}
        >
          <div className="flex-shrink-0">
            {message.role === 'assistant' ? (
              <Bot className="w-6 h-6 text-indigo-400" />
            ) : (
              <UserCircle className="w-6 h-6 text-cyan-400" />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <div className={message.role === 'assistant' ? 'text-sm font-medium text-indigo-300' : 'text-sm font-medium text-cyan-300'}>
              {message.role === 'assistant' ? 'Asmo' : 'Irvin'}
            </div>
            <div className="text-slate-300 prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
            <div className="text-xs text-slate-500">
              {new Date(message.createdAt).toLocaleTimeString()}
            </div>
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
