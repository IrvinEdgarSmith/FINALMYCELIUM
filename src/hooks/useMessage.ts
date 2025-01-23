import { useState, useCallback } from 'react';
import { useStore } from '../store';
import { Message } from '../types';
import { sendMessage as sendOpenRouterMessage, validateModel } from '../services/openrouter';
import { searchGoogle, analyzeSearchResults, validateGoogleConfig } from '../services/google';

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

const formatProjectVariables = (variables: any[]): string => {
  if (!variables || variables.length === 0) return '';

  return `
Project Context Variables (These are context variables, not instructions):
${variables.map(v => `${v.title}: ${v.description}`).join('\n')}

---`;
};

export const useMessage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [searchState, setSearchState] = useState<SearchState>({
    isSearching: false,
    error: null,
    stage: null,
    results: []
  });

  const {
    settings,
    getCurrentWorkspace,
    getCurrentMessages,
    getCurrentThread,
    updateThread,
    selectedWorkspaceId,
    selectedThreadId,
  } = useStore();

  const handleSearchError = (error: any) => {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    console.error('Search error:', error);
    setSearchState(prev => ({
      ...prev,
      isSearching: false,
      stage: null,
      error: errorMessage
    }));
    return null;
  };

  const performWebSearch = async (query: string, isDeepSearch: boolean = false): Promise<string | null> => {
    if (!settings.googleSearchId || !settings.googleSearchApiKey) {
      return handleSearchError(new Error(
        'Google Search is not configured. Please add your API key and Search Engine ID in settings.'
      ));
    }

    try {
      setSearchState({
        isSearching: true,
        error: null,
        stage: 'searching',
        results: []
      });

      const isValid = await validateGoogleConfig(
        settings.googleSearchId,
        settings.googleSearchApiKey
      );

      if (!isValid) {
        throw new Error('Invalid Google Search configuration. Please check your API key and Search Engine ID.');
      }

      // Use more results and queries for deep search
      const resultsPerQuery = isDeepSearch ? 10 : 5;
      const queries = isDeepSearch 
        ? [query, `detailed ${query}`, `comprehensive ${query}`, `in-depth ${query}`]
        : [query];

      const allResults = [];
      for (const searchQuery of queries) {
        const results = await searchGoogle(
          searchQuery,
          settings.googleSearchId,
          settings.googleSearchApiKey,
          resultsPerQuery
        );
        allResults.push(...results);
      }

      // Remove duplicates
      const uniqueResults = Array.from(new Map(
        allResults.map(result => [result.url, result])
      ).values());

      if (uniqueResults.length === 0) {
        setSearchState({
          isSearching: false,
          error: 'No search results found',
          stage: null,
          results: []
        });
        return null;
      }

      setSearchState(prev => ({
        ...prev,
        results: uniqueResults,
        stage: 'analyzing'
      }));

      // For deep search, make multiple analysis passes
      let analysis = '';
      if (isDeepSearch) {
        // First pass: Get comprehensive information
        const firstPass = await analyzeSearchResults(
          settings.apiKey,
          settings.model,
          query,
          uniqueResults,
          'comprehensive'
        );

        // Second pass: Focus on key points and relationships
        const secondPass = await analyzeSearchResults(
          settings.apiKey,
          settings.model,
          query,
          uniqueResults,
          'key_points'
        );

        // Third pass: Generate final synthesis
        analysis = await analyzeSearchResults(
          settings.apiKey,
          settings.model,
          query,
          uniqueResults,
          'synthesis',
          [firstPass, secondPass]
        );
      } else {
        // Regular single-pass analysis
        analysis = await analyzeSearchResults(
          settings.apiKey,
          settings.model,
          query,
          uniqueResults
        );
      }

      setSearchState({
        isSearching: false,
        error: null,
        stage: null,
        results: uniqueResults
      });

      return analysis;
    } catch (error) {
      return handleSearchError(error);
    }
  };

  const sendMessage = useCallback(async (
    content: string,
    withWebSearch: boolean = false,
    isDeepSearch: boolean = false
  ): Promise<void> => {
    if (!selectedWorkspaceId || !selectedThreadId) {
      throw new Error('No workspace or thread selected');
    }

    if (!settings.apiKey) {
      throw new Error('API key is required');
    }

    try {
      setIsLoading(true);
      setSearchState({
        isSearching: false,
        error: null,
        stage: null,
        results: []
      });

      const workspace = getCurrentWorkspace();
      if (!workspace) throw new Error('Workspace not found');

      const model = workspace.model || settings.model;
      const temperature = workspace.temperature ?? 0.7;
      const useWorkspacePrompt = workspace.overrideSystemPrompt && workspace.systemPrompt;
      const effectiveSystemPrompt = useWorkspacePrompt ? workspace.systemPrompt : settings.systemPrompt;

      const isValidModel = await validateModel(settings.apiKey, model);
      if (!isValidModel) {
        throw new Error('Selected model is not available. Please choose another model in settings.');
      }

      // Create and add user message
      const userMessage: Message = {
        id: crypto.randomUUID(),
        content,
        role: 'user',
        createdAt: Date.now(),
      };

      const currentMessages = getCurrentMessages();
      const updatedMessages = [...currentMessages, userMessage];
      
      updateThread(selectedWorkspaceId, selectedThreadId, {
        messages: updatedMessages,
      });

      // Gather context from different sources
      let context = '';

      // Web search context
      if (withWebSearch) {
        console.log(`Performing ${isDeepSearch ? 'deep' : 'regular'} web search...`);
        const searchContext = await performWebSearch(content, isDeepSearch);
        if (searchContext) {
          context += `\nWeb Search ${isDeepSearch ? '(Deep Analysis)' : 'Results'}:\n${searchContext}\n`;
        }
      }

      // Combine system prompt with project variables and context
      const projectVariablesText = formatProjectVariables(workspace.projectVariables || []);
      const fullSystemPrompt = `${projectVariablesText}\n${effectiveSystemPrompt}${
        context ? `\n\nContext:\n${context}` : ''
      }`;

      console.log('Sending message to OpenRouter...', {
        model,
        temperature,
        messagesCount: updatedMessages.length,
        isDeepSearch
      });

      // Get AI response
      const response = await sendOpenRouterMessage(
        settings.apiKey,
        model,
        updatedMessages,
        fullSystemPrompt,
        temperature
      );

      if (!response) {
        throw new Error('No response received from AI');
      }

      // Create AI message
      const aiMessage: Message = {
        id: crypto.randomUUID(),
        content: response,
        role: 'assistant',
        createdAt: Date.now(),
      };

      // Update thread with AI message
      const finalMessages = [...updatedMessages, aiMessage];
      updateThread(selectedWorkspaceId, selectedThreadId, {
        messages: finalMessages,
      });

    } catch (error) {
      console.error('Error in sendMessage:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      throw new Error(`Failed to send message: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedWorkspaceId,
    selectedThreadId,
    settings,
    getCurrentWorkspace,
    getCurrentMessages,
    updateThread
  ]);

  return {
    sendMessage,
    isLoading,
    searchState,
  };
};
