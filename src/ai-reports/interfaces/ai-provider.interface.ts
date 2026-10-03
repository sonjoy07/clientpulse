export const AI_PROVIDER_TOKEN = 'AI_PROVIDER_TOKEN';

export interface AiProvider {
  readonly modelName: string;
  generateReport(systemPrompt: string, userPrompt: string): Promise<string>;
}
