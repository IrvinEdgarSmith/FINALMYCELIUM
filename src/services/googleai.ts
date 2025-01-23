import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GoogleAIModel {
  name: string;
  displayName: string;
  description: string;
  supportedGenerationMethods: string[];
  temperature?: {
    minimum: number;
    maximum: number;
  };
  version?: string;
}

export class GoogleAIError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'GoogleAIError';
  }
}

export async function fetchGoogleAIModels(apiKey: string): Promise<GoogleAIModel[]> {
  if (!apiKey) {
    throw new GoogleAIError('Google AI API key is required');
  }

  try {
    // Instead of fetching models from the API, we'll provide a static list of available models
    // This avoids OAuth requirements and simplifies the integration
    const availableModels: GoogleAIModel[] = [
      {
        name: 'embedding-001',
        displayName: 'Gemini Embedding Model',
        description: 'Text embedding model optimized for semantic similarity',
        supportedGenerationMethods: ['embedText'],
        version: '001'
      }
    ];

    return availableModels;
  } catch (error: any) {
    console.error('Google AI API Error:', error);
    throw new GoogleAIError(
      'Failed to initialize Gemini models. Please check your API key and try again.'
    );
  }
}

export async function generateEmbedding(apiKey: string, text: string): Promise<number[]> {
  if (!apiKey) {
    throw new GoogleAIError('API key is required');
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'embedding-001' });
    const result = await model.embedContent(text);
    if (!result || !result.embedding) {
      throw new GoogleAIError('Failed to generate embedding');
    }
    return result.embedding;
  } catch (error: any) {
    console.error('Embedding generation error:', error);
    if (error.message?.includes('PERMISSION_DENIED')) {
      throw new GoogleAIError('Invalid API key or insufficient permissions');
    }
    throw new GoogleAIError(
      error.message || 'Failed to generate embedding'
    );
  }
}
