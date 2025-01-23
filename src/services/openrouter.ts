import { OpenRouterModel, OpenRouterResponse } from "../types/openrouter";
import { Message } from "../types";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

class OpenRouterError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'OpenRouterError';
  }
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function fetchModels(apiKey: string): Promise<OpenRouterModel[]> {
  if (!apiKey) {
    throw new OpenRouterError('OpenRouter API key is required');
  }

  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      const response = await fetch(`${OPENROUTER_API_URL}/models`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": "NexusChat",
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new OpenRouterError(
          error.message || `HTTP error ${response.status}`,
          response.status,
          response.status === 429 || response.status >= 500
        );
      }

      const data = await response.json();
      
      if (!Array.isArray(data.data)) {
        throw new OpenRouterError('Invalid response format from OpenRouter API');
      }

      return data.data.sort((a: OpenRouterModel, b: OpenRouterModel) => {
        const aPrice = parseFloat(a.pricing.prompt);
        const bPrice = parseFloat(b.pricing.prompt);
        return aPrice - bPrice;
      });
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      if (
        error instanceof OpenRouterError &&
        error.isRetryable &&
        attempt < MAX_RETRIES - 1
      ) {
        await wait(RETRY_DELAY * Math.pow(2, attempt));
        attempt++;
        continue;
      }
      throw error;
    }
  }

  throw new OpenRouterError('Maximum retry attempts exceeded');
}

export async function validateModel(apiKey: string, modelId: string): Promise<boolean> {
  try {
    const models = await fetchModels(apiKey);
    return models.some(model => model.id === modelId);
  } catch (error) {
    console.error('Error validating model:', error);
    return false;
  }
}

export async function sendMessage(
  apiKey: string,
  model: string,
  messages: Message[],
  systemPrompt: string,
  temperature: number = 0.7
): Promise<string> {
  if (!apiKey) {
    throw new OpenRouterError('OpenRouter API key is required');
  }

  if (!model) {
    throw new OpenRouterError('Model must be selected');
  }

  const formattedMessages = messages.map(msg => ({
    role: msg.role,
    content: msg.content,
  }));

  const systemMessage = {
    role: "system",
    content: systemPrompt
  };

  const requestBody = {
    model,
    messages: [systemMessage, ...formattedMessages],
    temperature,
    max_tokens: 2000,
  };

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < MAX_RETRIES) {
    try {
      console.log(`Sending request to OpenRouter (attempt ${attempt + 1}):`, {
        model,
        messagesCount: requestBody.messages.length,
        temperature
      });

      const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'NexusChat',
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('OpenRouter API error response:', responseData);
        throw new OpenRouterError(
          responseData.error?.message || `API error (${response.status}): ${response.statusText}`,
          response.status,
          response.status === 429 || response.status >= 500
        );
      }

      console.log('OpenRouter API response:', responseData);
      
      if (!responseData.choices?.[0]?.message?.content) {
        throw new OpenRouterError('Invalid response format: missing message content');
      }

      return responseData.choices[0].message.content;
    } catch (error) {
      console.error(`Error in sendMessage attempt ${attempt + 1}:`, error);
      lastError = error;

      if (
        error instanceof OpenRouterError &&
        error.isRetryable &&
        attempt < MAX_RETRIES - 1
      ) {
        console.log(`Retrying in ${RETRY_DELAY * Math.pow(2, attempt)}ms...`);
        await wait(RETRY_DELAY * Math.pow(2, attempt));
        attempt++;
        continue;
      }

      break;
    }
  }

  throw lastError || new OpenRouterError('Failed to send message after all retry attempts');
}
