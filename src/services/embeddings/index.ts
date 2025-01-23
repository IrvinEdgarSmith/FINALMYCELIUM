import { pipeline } from '@xenova/transformers';

let embeddingModel: any = null;

export async function getEmbeddingModel() {
  if (!embeddingModel) {
    try {
      embeddingModel = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    } catch (error) {
      console.error('Failed to load embedding model:', error);
      throw new Error('Failed to initialize embedding model. Please try again.');
    }
  }
  return embeddingModel;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = await getEmbeddingModel();
    const output = await model(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  } catch (error) {
    console.error('Failed to generate embedding:', error);
    throw new Error('Failed to generate text embedding. Please try again.');
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}
