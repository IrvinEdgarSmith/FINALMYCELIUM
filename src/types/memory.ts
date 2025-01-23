export interface Memory {
  id: string;
  type: 'fact' | 'concept' | 'relationship';
  content: string;
  source: string;
  timestamp: number;
  confidence: number;
  // Knowledge graph structure
  connections: {
    type: 'related_to' | 'part_of' | 'depends_on' | 'causes' | 'similar_to';
    targetId: string;
    strength: number; // 0-1
    description?: string;
  }[];
  metadata: {
    workspace?: string;
    thread?: string;
    context?: string;
    tags?: string[];
  };
}

export interface MemoryState {
  memories: Memory[];
  isMemoryPanelOpen: boolean;
  activeFilter: 'all' | 'facts' | 'concepts' | 'relationships';
  searchQuery: string;
  
  // CRUD operations
  addMemory: (memory: Partial<Memory> & { content: string; type: Memory['type'] }) => void;
  removeMemory: (id: string) => void;
  clearMemories: () => void;
  
  // UI state management
  toggleMemoryPanel: () => void;
  setActiveFilter: (filter: MemoryState['activeFilter']) => void;
  setSearchQuery: (query: string) => void;
  
  // Knowledge graph operations
  getRelatedMemories: (id: string) => Memory[];
  addConnection: (
    sourceId: string,
    targetId: string,
    type: Memory['connections'][0]['type'],
    strength: number,
    description?: string
  ) => void;
  removeConnection: (sourceId: string, targetId: string) => void;
  
  // Tag management
  updateMemoryTags: (id: string, tags: string[]) => void;
}
