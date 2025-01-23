const OPENAI_API_URL = 'https://api.openai.com/v1';

export class OpenAIError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'OpenAIError';
  }
}

export async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  if (!apiKey) {
    throw new OpenAIError('OpenAI API key is required');
  }

  try {
    const response = await fetch(`${OPENAI_API_URL}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        model: 'text-embedding-ada-002'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new OpenAIError(
        error.error?.message || `API error (${response.status}): ${response.statusText}`,
        response.status
      );
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    if (error instanceof OpenAIError) {
      throw error;
    }
    throw new OpenAIError(
      error instanceof Error ? error.message : 'Failed to generate embedding'
    );
  }
}

export async function processFile(file: File, apiKey: string): Promise<{
  content: string;
  embedding: number[];
}> {
  if (!apiKey) {
    throw new OpenAIError('OpenAI API key is required');
  }

  try {
    // Read file content
    const content = await readFileContent(file);

    // Generate embedding
    const embedding = await generateEmbedding(content, apiKey);

    return {
      content,
      embedding
    };
  } catch (error) {
    throw new OpenAIError(
      `Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string);
      } else {
        reject(new Error('Failed to read file'));
      }
    };

    reader.onerror = () => reject(reader.error);

    if (file.type === 'application/pdf') {
      // For PDF files, we need to handle them differently
      // This is a placeholder - you might want to use a PDF parsing library
      reject(new Error('PDF files are not supported yet'));
    } else {
      reader.readAsText(file);
    }
  });
}
