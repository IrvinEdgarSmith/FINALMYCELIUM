import { Loader, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { SearchResult } from '../types';

interface SearchContextProps {
  isSearching: boolean;
  error?: string | null;
  stage?: 'extracting' | 'searching' | 'analyzing' | null;
  progress?: {
    current: number;
    total: number;
  } | null;
  results?: Array<{
    query: string;
    results: SearchResult[];
    error?: string;
  }>;
  selectedModel?: string;
  onRetry?: () => void;
}

const SearchContext = ({
  isSearching,
  error,
  stage,
  progress,
  results,
  selectedModel,
  onRetry
}: SearchContextProps) => {
  if (!isSearching && !error && !results?.length) {
    return null;
  }

  const totalResults = results?.reduce((acc, curr) => acc + curr.results.length, 0) ?? 0;
  const failedSearches = results?.filter(r => r.error)?.length ?? 0;

  return (
    <div className="mb-4 space-y-2">
      {isSearching && (
        <div className="flex items-center gap-2 text-purple-400 bg-purple-400/10 px-3 py-2 rounded-lg text-sm">
          <Loader size={16} className="animate-spin" />
          <span>
            {stage === 'extracting' && `Analyzing your question using ${selectedModel}...`}
            {stage === 'searching' && progress && 
              `Processing search ${progress.current + 1} of ${progress.total}...`}
            {stage === 'analyzing' && 'Analyzing search results...'}
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between text-red-400 bg-red-400/10 px-3 py-2 rounded-lg text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
            >
              <RefreshCw size={14} />
              <span>Retry</span>
            </button>
          )}
        </div>
      )}

      {!isSearching && !error && results && results.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-green-400 bg-green-400/10 px-3 py-2 rounded-lg text-sm">
            <CheckCircle size={16} />
            <span>
              Found {totalResults} relevant results from {results.length} searches
              {failedSearches > 0 && ` (${failedSearches} failed)`}
            </span>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-2 bg-slate-800/50 rounded-lg p-2">
            {results.map((queryResult, index) => (
              <div key={index} className="space-y-2">
                <h4 className="text-sm font-medium text-purple-400 px-2">
                  Search: "{queryResult.query}"
                  {queryResult.error && (
                    <span className="text-red-400 ml-2">- {queryResult.error}</span>
                  )}
                </h4>
                {queryResult.results.length > 0 ? (
                  <div className="space-y-1">
                    {queryResult.results.map((result, resultIndex) => (
                      <div key={resultIndex} className="text-sm space-y-1 bg-slate-800 rounded p-2">
                        <h5 className="font-medium text-purple-400">{result.title}</h5>
                        <p className="text-slate-300 text-xs">{result.description}</p>
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300 truncate block"
                        >
                          {result.url}
                        </a>
                      </div>
                    ))}
                  </div>
                ) : !queryResult.error && (
                  <p className="text-sm text-slate-400 px-2">No results found for this query</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchContext;
