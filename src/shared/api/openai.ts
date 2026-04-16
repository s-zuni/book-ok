/**
 * Shared OpenAI API helper — use this in all API routes to avoid duplication.
 *
 * Usage:
 *   import { callOpenAI } from '@shared/api/openai';
 *   const result = await callOpenAI({ model: 'gpt-4o-mini', messages: [...], ... });
 */

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIRequestOptions {
  model?: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' | 'text' };
}

export interface OpenAIResponse {
  choices: { message: OpenAIMessage }[];
  error?: { message: string };
}

/**
 * Makes a call to the OpenAI Chat Completions API.
 * Throws on HTTP error or missing API key.
 */
export async function callOpenAI(options: OpenAIRequestOptions): Promise<OpenAIMessage> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured. Set OPENAI_API_KEY in environment variables.');
  }

  const {
    model = 'gpt-4o-mini',
    messages,
    temperature = 0.7,
    max_tokens = 1500,
    response_format,
  } = options;

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature,
    max_tokens,
  };
  if (response_format) body.response_format = response_format;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const data: OpenAIResponse = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || `OpenAI API error: ${response.status}`);
  }

  const message = data.choices?.[0]?.message;
  if (!message) {
    throw new Error('No response from OpenAI');
  }

  return message;
}

/**
 * Parse a JSON string returned from OpenAI, with a typed fallback.
 * Avoids crashing on malformed JSON.
 */
export function parseOpenAIJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    console.error('[parseOpenAIJson] Failed to parse:', raw.slice(0, 200));
    return fallback;
  }
}
