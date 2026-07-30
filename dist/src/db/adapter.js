// Import adapters using dynamic imports
import { SqliteAdapter } from './sqlite-adapter.js';
import { SqlServerAdapter } from './sqlserver-adapter.js';
import { PostgresqlAdapter } from './postgresql-adapter.js';
import { MysqlAdapter } from './mysql-adapter.js';
/**
 * Factory function to create the appropriate database adapter
 */
export function createDbAdapter(type, connectionInfo) {
    switch (type.toLowerCase()) {
        case 'sqlite':
            // For SQLite, if connectionInfo is a string, use it directly as path
            if (typeof connectionInfo === 'string') {
                return new SqliteAdapter(connectionInfo);
            }
            else {
                return new SqliteAdapter(connectionInfo.path);
            }
        case 'sqlserver':
            return new SqlServerAdapter(connectionInfo);
        case 'postgresql':
        case 'postgres':
            return new PostgresqlAdapter(connectionInfo);
        case 'mysql':
            return new MysqlAdapter(connectionInfo);
        default:
            throw new Error(`Unsupported database type: ${type}`);
    }
}
