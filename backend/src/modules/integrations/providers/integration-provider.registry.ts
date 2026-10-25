import type { IntegrationProvider } from './integration-provider.interface.js';
import { MockErpProvider } from './mock-erp.provider.js';

export class IntegrationProviderRegistry {
  private static instance: IntegrationProviderRegistry;
  private readonly providers: Map<string, IntegrationProvider> = new Map();

  private constructor() {
    // Register built-in default providers
    this.register(new MockErpProvider('mock_erp'));
    this.register(new MockErpProvider('tally_prime'));
  }

  public static getInstance(): IntegrationProviderRegistry {
    if (!this.instance) {
      this.instance = new IntegrationProviderRegistry();
    }
    return this.instance;
  }

  public register(provider: IntegrationProvider): void {
    this.providers.set(provider.providerKey, provider);
  }

  public get(providerKey: string): IntegrationProvider | undefined {
    return this.providers.get(providerKey);
  }

  public getAll(): IntegrationProvider[] {
    return Array.from(this.providers.values());
  }
}
