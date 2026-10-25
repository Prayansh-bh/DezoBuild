import type { AIProvider } from './ai-provider.interface.js';
import { RuleBasedAIProvider } from './rule-based-ai.provider.js';

export class AIProviderRegistry {
  private static instance: AIProviderRegistry;
  private readonly providers: Map<string, AIProvider> = new Map();
  private defaultProviderKey: string = 'rule_based_engine';

  private constructor() {
    const defaultEngine = new RuleBasedAIProvider();
    this.register(defaultEngine);
  }

  public static getInstance(): AIProviderRegistry {
    if (!this.instance) {
      this.instance = new AIProviderRegistry();
    }
    return this.instance;
  }

  public register(provider: AIProvider): void {
    this.providers.set(provider.providerKey, provider);
  }

  public get(providerKey?: string): AIProvider | undefined {
    return this.providers.get(providerKey || this.defaultProviderKey);
  }

  public getAll(): AIProvider[] {
    return Array.from(this.providers.values());
  }
}
