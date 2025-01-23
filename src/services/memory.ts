import { Memory } from '../types/memory';
import { Message } from '../types';
import { getVectorStore } from './vectorStore';

const SYSTEM_PROMPT = `You are a memory and knowledge graph manager. Analyze conversations and extract:
1. Facts: Concrete, verifiable information
2. Concepts: Abstract ideas or principles discussed
3. Relationships: Connections between entities or concepts

Also identify connections between memories with these relationship types:
- related_to: General association
- part_of: Component or subset relationship
- depends_on: Dependency relationship
- causes: Causal relationship
- similar_to: Analogous or similar concepts

Format your response as JSON with the following structure:
{
  "memories": [
    {
      "type": "fact|concept|relationship",
      "content": "The extracted information",
      "confidence": 0.0-1.0,
      "connections": [
        {
          "type": "relationship_type",
          "targetContent": "The related information to look up",
          "strength": 0.0-1.0,
          "description": "Why these are connected"
        }
      ],
      "metadata": {
        "context": "Additional context",
        "tags": ["relevant", "tags"]
      }
    }
  ]
}`;

export class MemoryService {
  private apiKey: string;
  private model: string;
  private vectorStore = getVectorStore();

  constructor(apiKey: string, model: string) {
    if (!apiKey) {
      throw new Error('API key is required for memory management');
    }
    if (!model) {
      throw new Error('Model is required for memory management');
    }
    this.apiKey = apiKey;
    this.model = model;
  }

  private async callOpenRouter(prompt: string): Promise<string> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'NexusChat'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error('Failed to process memory extraction');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async extractMemoriesFromMessages(messages: Message[]): Promise<Omit<Memory, 'id' | 'timestamp'>[]> {
    const conversation = messages.map(msg => 
      `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`
    ).join('\n\n');
    
    return this.extractMemories(conversation);
  }

  async extractMemories(
    conversation: string,
    existingMemories: Memory[] = []
  ): Promise<Omit<Memory, 'id' | 'timestamp'>[]> {
    try {
      // Get relevant memories from vector store
      const similarMemories = await this.vectorStore.findSimilarMemories(conversation, 5);
      const relevantMemories = [...existingMemories, ...similarMemories.map(m => m.memory)];
      
      // Create context using similar memories
      const memoryContext = relevantMemories
        .map(m => `${m.type.toUpperCase()}: ${m.content} (ID: ${m.id})`)
        .join('\n');

      const prompt = `Analyze this conversation and extract memories. Use existing memories to identify connections and enhance understanding.\n\nExisting Memories:\n${memoryContext}\n\nNew Conversation:\n${conversation}`;
      
      const response = await this.callOpenRouter(prompt);
      
      try {
        const parsed = JSON.parse(response);
        const memories = parsed.memories.map((memory: any) => ({
          type: memory.type,
          content: memory.content,
          confidence: memory.confidence || 1.0,
          source: conversation.slice(0, 100) + '...',
          connections: memory.connections
            .map((conn: any) => {
              // Try to find matching existing memory for the connection
              const targetMemory = relevantMemories.find(m => 
                m.content.toLowerCase().includes(conn.targetContent.toLowerCase())
              );

              return targetMemory ? {
                type: conn.type,
                targetId: targetMemory.id,
                strength: conn.strength,
                description: conn.description
              } : null;
            })
            .filter((conn: any) => conn !== null),
          metadata: {
            ...memory.metadata,
            timestamp: Date.now(),
            tags: memory.metadata?.tags || [],
          }
        }));

        // Store new memories in vector store
        for (const memory of memories) {
          const fullMemory = {
            ...memory,
            id: crypto.randomUUID(),
            timestamp: Date.now()
          };
          await this.vectorStore.addMemory(fullMemory);
        }

        return memories;
      } catch (e) {
        console.error('Failed to parse memory extraction result:', e);
        return [];
      }
    } catch (e) {
      console.error('Failed to extract memories:', e);
      return [];
    }
  }

  async findSimilarMemories(
    content: string,
    limit: number = 5,
    threshold: number = 0.7
  ): Promise<Memory[]> {
    const results = await this.vectorStore.findSimilarMemories(content, limit, threshold);
    return results.map(r => r.memory);
  }
}
