import { AlertCircle, CheckCircle, Loader, Globe } from 'lucide-react';

interface SearchState {
  isSearching: boolean;
  error: string | null;
  stage: 'searching' | 'analyzing' | null;
  results: Array<{
    title: string;
    description: string;
    url: string;
  }>;
}

interface SearchStatusProps {
  searchState: SearchState;
  isDeepSearch?: boolean;
}

const SearchStatus = ({ searchState, isDeepSearch }: SearchStatusProps) => {
  const { isSearching, error, stage, results } = searchState;

  if (!isSearching && !error && !results.length) {
    return null;
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-400 bg-red-400/10 px-3 py-2 rounded-lg text-sm">
        <AlertCircle size={16} />
        <span>{error}</span>
      </div>
    );
  }

  if (isSearching) {
    return (
      <div className="flex items-center gap-2 text-purple-400 bg-purple-400/10 px-3 py-2 rounded-lg text-sm">
        <Loader size={16} className="animate-spin" />
        <span>
          {stage === 'searching' 
            ? `${isDeepSearch ? 'Deep searching' : 'Searching'} the web for relevant information...`
            : `${isDeepSearch ? 'Thoroughly analyzing' : 'Analyzing'} search results...`}
        </span>
      </div>
    );
  }

  if (results.length > 0) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-green-400 bg-green-400/10 px-3 py-2 rounded-lg text-sm">
          <CheckCircle size={16} />
          <span>
            {isDeepSearch 
              ? `Found and deeply analyzed ${results.length} comprehensive results`
              : `Found ${results.length} relevant results`}
          </span>
        </div>
        <div className="flex items-center gap-2 text-blue-400 bg-blue-400/10 px-3 py-2 rounded-lg text-sm">
          <Globe size={16} />
          <span>
            {isDeepSearch
              ? 'Comprehensive web search results will be incorporated into the response'
              : 'Web search results will be incorporated into the response'}
          </span>
        </div>
      </div>
    );
  }

  return null;
};

export default SearchStatus;
