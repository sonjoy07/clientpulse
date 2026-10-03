import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider } from '../interfaces/ai-provider.interface.js';

@Injectable()
export class OpenAiCompatibleProvider implements AiProvider {
  private readonly logger = new Logger(OpenAiCompatibleProvider.name);
  readonly modelName: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly maxTokens: number;
  private readonly temperature: number;

  constructor(private readonly configService: ConfigService) {
    this.modelName =
      this.configService.get<string>('ai.model') || 'gpt-4o-mini';
    this.apiKey = this.configService.get<string>('ai.apiKey') || '';
    this.baseUrl =
      this.configService.get<string>('ai.baseUrl') ||
      'https://api.openai.com/v1';
    this.maxTokens = this.configService.get<number>('ai.maxTokens') ?? 2000;
    this.temperature = this.configService.get<number>('ai.temperature') ?? 0.3;
  }

  async generateReport(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error(
        'AI_API_KEY is not configured for OpenAiCompatibleProvider',
      );
    }

    const endpoint = `${this.baseUrl.replace(/\/+$/, '')}/chat/completions`;

    const body = {
      model: this.modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: this.maxTokens,
      temperature: this.temperature,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(
        `OpenAI API request failed: status ${response.status} - ${errorText}`,
      );
      throw new Error(
        `OpenAI API request failed with status ${response.status}: ${errorText}`,
      );
    }

    interface ChatCompletionResponse {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI API returned response with empty content');
    }

    return content;
  }
}
