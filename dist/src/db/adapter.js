/**
 * Factory function to create the appropriate database adapter
 * Uses dynamic imports to avoid loading unused native dependencies
 */
export async function createDbAdapter(type, connectionInfo) {
    switch (type.toLowerCase()) {
        case 'sqlite': {
            const { SqliteAdapter } = await import('./sqlite-adapter.js');
            // For SQLite, if connectionInfo is a string, use it directly as path
            if (typeof connectionInfo === 'string') {
                return new SqliteAdapter(connectionInfo);
            }
            else {
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
