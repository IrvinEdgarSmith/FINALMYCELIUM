import { useState } from 'react';
import { useStore } from '../store';
import { extractSearchQueries, performMultiSearch, analyzeSearchResults } from '../services/search';
import { SearchState } from '../types/store';

export const useSearch = () => {
  const { settings } = useStore();
  const [searchState, setSearchState] = useState<SearchState>({
    isSearching: false,
    error: null,
    stage: null,
    progress: null,
  });

  const performWebSearch = async (content: string): Promise<string | null> => {
    if (!settings.searchModel) {
      setSearchState({
        isSearching: false,
        error: 'Search functionality requires a Search Model to be configured in settings',
        stage: null,
        progress: null,
      });
      return null;
    }

    try {
      setSearchState({
        isSearching: true,
        error: null,
        stage: 'extracting',
        progress: null,
      });

      const queries = await extractSearchQueries(
        settings.apiKey,
        settings.searchModel,
        content
      );

      setSearchState((prev) => ({
        ...prev,
        stage: 'searching',
        progress: { current: 0, total: queries.length },
      }));

      const searchResults = await performMultiSearch(queries);

      setSearchState((prev) => ({
        ...prev,
        stage: 'analyzing',
        progress: null,
      }));

      const analysis = await analyzeSearchResults(
        settings.apiKey,
        settings.searchModel,
        searchResults,
        content
      );

      setSearchState({
        isSearching: false,
        error: null,
        stage: null,
        progress: null,
      });

      return analysis;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to perform web search';
      setSearchState({
        isSearching: false,
        error: errorMessage,
        stage: null,
        progress: null,
      });
      return null;
    }
  };

  return {
    performWebSearch,
    searchState,
  };
};
