import { generateEmbedding, cosineSimilarity } from '../embeddings';
import { Memory } from '../../types/memory';

interface StoredMemory {
  id: string;
  embedding: number[];
  metadata: {
    type: Memory['type'];
    source: string;
    confidence: number;
    workspace?: string;
    thread?: string;
    timestamp: number;
    tags: string[];
  };
  content: string;
}

export class VectorStore {
  private memories: StoredMemory[] = [];
  private readonly storageKey = 'nexus-chat-vector-store';

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.memories = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load vector store from storage:', error);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.memories));
    } catch (error) {
      console.error('Failed to save vector store to storage:', error);
    }
  }

  async addMemory(memory: Memory): Promise<void> {
    try {
      const embedding = await generateEmbedding(memory.content);
      
      const storedMemory: StoredMemory = {
        id: memory.id,
        embedding,
        metadata: {
          type: memory.type,
          source: memory.source,
          confidence: memory.confidence,
          workspace: memory.metadata.workspace,
          thread: memory.metadata.thread,
          timestamp: memory.timestamp,
          tags: memory.metadata.tags || [],
        },
        content: memory.content
      };

      // Update if exists, otherwise add
      const index = this.memories.findIndex(m => m.id === memory.id);
      if (index >= 0) {
        this.memories[index] = storedMemory;
      } else {
        this.memories.push(storedMemory);
      }

      this.saveToStorage();
    } catch (error) {
      console.error('Failed to add memory to vector store:', error);
      throw error;
    }
  }

  async findSimilarMemories(
    content: string,
    limit: number = 5,
    minSimilarity: number = 0.7
  ): Promise<{ memory: Memory; similarity: number }[]> {
    try {
      const queryEmbedding = await generateEmbedding(content);
      
      const similarities = this.memories.map(storedMemory => ({
        storedMemory,
        similarity: cosineSimilarity(queryEmbedding, storedMemory.embedding)
      }));

      return similarities
        .filter(({ similarity }) => similarity >= minSimilarity)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map(({ storedMemory, similarity }) => ({
          similarity,
          memory: {
            id: storedMemory.id,
            content: storedMemory.content,
            type: storedMemory.metadata.type,
            source: storedMemory.metadata.source,
            confidence: storedMemory.metadata.confidence,
            timestamp: storedMemory.metadata.timestamp,
            connections: [], // Connections are managed separately in the memory store
            metadata: {
              workspace: storedMemory.metadata.workspace,
              thread: storedMemory.metadata.thread,
              tags: storedMemory.metadata.tags
            }
          }
        }));
    } catch (error) {
      console.error('Failed to find similar memories:', error);
      return [];
    }
  }

  async deleteMemory(id: string): Promise<void> {
    this.memories = this.memories.filter(m => m.id !== id);
    this.saveToStorage();
  }

  async clear(): Promise<void> {
    this.memories = [];
    this.saveToStorage();
  }
}

// Singleton instance
let vectorStore: VectorStore | null = null;

export function getVectorStore(): VectorStore {
  if (!vectorStore) {
    vectorStore = new VectorStore();
  }
  return vectorStore;
}
