import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Memory, MemoryState } from '../types/memory';
import { getVectorStore } from '../services/vectorStore';

const vectorStore = getVectorStore();

// Migration function for memory store
const migrateMemoryStore = (persistedState: any, version: number) => {
  if (version === 0) {
    return {
      ...persistedState,
      memories: persistedState.memories || [],
      isMemoryPanelOpen: false,
      activeFilter: 'all',
      searchQuery: '',
    };
  }
  return persistedState;
};

export const useMemoryStore = create<MemoryState>()(
  persist(
    (set, get) => ({
      memories: [],
      isMemoryPanelOpen: false,
      activeFilter: 'all',
      searchQuery: '',

      addMemory: async (memory) => {
        const newMemory = {
          ...memory,
          id: memory.id || crypto.randomUUID(),
          timestamp: memory.timestamp || Date.now(),
          confidence: memory.confidence || 1.0,
          connections: memory.connections || [],
          metadata: {
            ...memory.metadata,
            tags: memory.metadata?.tags || [],
          },
        };

        // Add to vector store first
        await vectorStore.addMemory(newMemory);

        // Then update local state
        set((state) => {
          const filteredMemories = state.memories.filter(m => 
            newMemory.id ? m.id !== newMemory.id : true
          );
          
          return {
            memories: [
              ...filteredMemories,
              newMemory,
            ].sort((a, b) => b.timestamp - a.timestamp),
          };
        });
      },

      removeMemory: async (id) => {
        await vectorStore.deleteMemory(id);
        set((state) => ({
          memories: state.memories.filter((m) => m.id !== id),
        }));
      },

      clearMemories: async () => {
        await vectorStore.clear();
        set({ memories: [] });
      },

      toggleMemoryPanel: () => set((state) => ({
        isMemoryPanelOpen: !state.isMemoryPanelOpen,
      })),

      setActiveFilter: (filter) => set({ activeFilter: filter }),

      setSearchQuery: (query) => set({ searchQuery: query }),

      addConnection: (sourceId, targetId, type, strength, description) => set((state) => ({
        memories: state.memories.map((memory) => {
          if (memory.id === sourceId) {
            const existingConnectionIndex = memory.connections.findIndex(
              conn => conn.targetId === targetId
            );

            const newConnection = {
              type,
              targetId,
              strength,
              description,
            };

            const connections = existingConnectionIndex >= 0
              ? [
                  ...memory.connections.slice(0, existingConnectionIndex),
                  newConnection,
                  ...memory.connections.slice(existingConnectionIndex + 1)
                ]
              : [...memory.connections, newConnection];

            return {
              ...memory,
              connections,
            };
          }
          return memory;
        }),
      })),

      removeConnection: (sourceId, targetId) => set((state) => ({
        memories: state.memories.map((memory) => {
          if (memory.id === sourceId) {
            return {
              ...memory,
              connections: memory.connections.filter(
                (conn) => conn.targetId !== targetId
              ),
            };
          }
          return memory;
        }),
      })),

      getRelatedMemories: async (id) => {
        const state = get();
        const target = state.memories.find(m => m.id === id);
        if (!target) return [];

        const similarMemories = await vectorStore.findSimilarMemories(target.content);
        const semanticMemories = new Map(similarMemories.map(m => [m.memory.id, m]));

        const relatedIds = new Set<string>();
        const relationStrengths = new Map<string, number>();
        
        target.connections.forEach(conn => {
          relatedIds.add(conn.targetId);
          relationStrengths.set(conn.targetId, conn.strength);
        });
        
        state.memories.forEach(memory => {
          memory.connections.forEach(conn => {
            if (conn.targetId === id) {
              relatedIds.add(memory.id);
              relationStrengths.set(
                memory.id,
                Math.max(conn.strength, relationStrengths.get(memory.id) || 0)
              );
            }
          });
        });

        const allRelatedMemories = Array.from(relatedIds)
          .map(relatedId => {
            const memory = state.memories.find(m => m.id === relatedId);
            const semanticMatch = semanticMemories.get(relatedId);
            if (!memory) return null;
            
            const explicitStrength = relationStrengths.get(relatedId) || 0;
            const semanticStrength = semanticMatch ? semanticMatch.similarity : 0;
            const combinedStrength = Math.max(explicitStrength, semanticStrength);
            
            return { memory, strength: combinedStrength };
          })
          .filter((item): item is { memory: Memory; strength: number } => item !== null)
          .sort((a, b) => b.strength - a.strength)
          .map(item => item.memory);

        semanticMemories.forEach((match, id) => {
          if (!relatedIds.has(id)) {
            allRelatedMemories.push(match.memory);
          }
        });

        return allRelatedMemories;
      },

      updateMemoryTags: async (id, tags) => {
        set((state) => {
          const updatedMemories = state.memories.map((memory) =>
            memory.id === id
              ? {
                  ...memory,
                  metadata: {
                    ...memory.metadata,
                    tags: tags,
                  },
                }
              : memory
          );

          const updatedMemory = updatedMemories.find(m => m.id === id);
          if (updatedMemory) {
            vectorStore.addMemory(updatedMemory).catch(console.error);
          }

          return { memories: updatedMemories };
        });
      },
    }),
    {
      name: 'nexus-chat-memories',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      migrate: migrateMemoryStore,
      partialize: (state) => ({
        memories: state.memories,
      }),
    }
  )
);
