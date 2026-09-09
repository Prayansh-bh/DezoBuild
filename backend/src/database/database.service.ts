// Database Service abstraction interface for DEZOBUILD backend
export interface DatabaseConnectionStatus {
  isConnected: boolean;
  poolSize?: number;
  lastChecked: string;
}

export class DatabaseService {
  private static instance: DatabaseService;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async connect(): Promise<boolean> {
    this.isConnected = true;
    return true;
  }

  public async disconnect(): Promise<void> {
    this.isConnected = false;
  }

  public getStatus(): DatabaseConnectionStatus {
    return {
      isConnected: this.isConnected,
      lastChecked: new Date().toISOString(),
    };
  }
}
