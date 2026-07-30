/**
 * Database adapter interface
 * Defines the contract for all database implementations (SQLite, SQL Server)
 */
export interface DbAdapter {
  /**
   * Initialize database connection
   */
  init(): Promise<void>;

  /**
   * Close database connection
   */
  close(): Promise<void>;

  /**
   * Execute a query and return all results
   * @param query SQL query to execute
   * @param params Query parameters
   */
  all(query: string, params?: any[]): Promise<any[]>;

  /**
   * Execute a query that modifies data
   * @param query SQL query to execute
   * @param params Query parameters
   */
  run(query: string, params?: any[]): Promise<{ changes: number, lastID: number }>;

  /**
   * Execute multiple SQL statements
   * @param query SQL statements to execute
   */
  exec(query: string): Promise<void>;

  /**
   * Get database metadata
   */
  getMetadata(): { name: string, type: string, path?: string, server?: string, database?: string };

  /**
   * Get database-specific query for listing tables
   */
  getListTablesQuery(): string;

  /**
   * Get database-specific query for describing a table
   * @param tableName Table name
   */
  getDescribeTableQuery(tableName: string): string;
}

/**
 * Factory function to create the appropriate database adapter
 * Uses dynamic imports to avoid loading unused native dependencies
 */
export async function createDbAdapter(type: string, connectionInfo: any): Promise<DbAdapter> {
  switch (type.toLowerCase()) {
    case 'sqlite': {
      const { SqliteAdapter } = await import('./sqlite-adapter.js');
      // For SQLite, if connectionInfo is a string, use it directly as path
      if (typeof connectionInfo === 'string') {
        return new SqliteAdapter(connectionInfo);
      } else {
        return new SqliteAdapter(connectionInfo.path);
      }
    }
    case 'sqlserver': {
      const { SqlServerAdapter } = await import('./sqlserver-adapter.js');
      return new SqlServerAdapter(connectionInfo);
    }
    case 'postgresql':
    case 'postgres': {
      const { PostgresqlAdapter } = await import('./postgresql-adapter.js');
      return new PostgresqlAdapter(connectionInfo);
    }
    case 'mysql': {
      const { MysqlAdapter } = await import('./mysql-adapter.js');
      return new MysqlAdapter(connectionInfo);
    }
    default:
      throw new Error(`Unsupported database type: ${type}`);
  }
} 