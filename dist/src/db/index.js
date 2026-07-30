import { createDbAdapter } from './adapter.js';
// Store the active database adapter
let dbAdapter = null;
/**
 * Initialize the database connection
 * @param connectionInfo Connection information object or SQLite path string
 * @param dbType Database type ('sqlite' or 'sqlserver')
 */
export async function initDatabase(connectionInfo, dbType = 'sqlite') {
    try {
        // If connectionInfo is a string, assume it's a SQLite path
        if (typeof connectionInfo === 'string') {
            connectionInfo = { path: connectionInfo };
        }
        // Create appropriate adapter based on database type
        dbAdapter = createDbAdapter(dbType, connectionInfo);
        // Initialize the connection
        await dbAdapter.init();
    }
    catch (error) {
        throw new Error(`Failed to initialize database: ${error.message}`);
    }
}
/**
 * Execute a SQL query and get all results
 * @param query SQL query to execute
 * @param params Query parameters
 * @returns Promise with query results
 */
export function dbAll(query, params = []) {
    if (!dbAdapter) {
        throw new Error("Database not initialized");
    }
    return dbAdapter.all(query, params);
}
/**
 * Execute a SQL query that modifies data
 * @param query SQL query to execute
 * @param params Query parameters
 * @returns Promise with result info
 */
export function dbRun(query, params = []) {
    if (!dbAdapter) {
        throw new Error("Database not initialized");
    }
    return dbAdapter.run(query, params);
}
/**
 * Execute multiple SQL statements
 * @param query SQL statements to execute
 * @returns Promise that resolves when execution completes
 */
export function dbExec(query) {
    if (!dbAdapter) {
        throw new Error("Database not initialized");
    }
    return dbAdapter.exec(query);
}
/**
 * Close the database connection
 */
export function closeDatabase() {
    if (!dbAdapter) {
        return Promise.resolve();
    }
    return dbAdapter.close();
}
/**
 * Get database metadata
 */
export function getDatabaseMetadata() {
    if (!dbAdapter) {
        throw new Error("Database not initialized");
    }
    return dbAdapter.getMetadata();
}
/**
 * Get database-specific query for listing tables
 */
export function getListTablesQuery() {
    if (!dbAdapter) {
        throw new Error("Database not initialized");
    }
    return dbAdapter.getListTablesQuery();
}
/**
 * Get database-specific query for describing a table
 * @param tableName Table name
 */
export function getDescribeTableQuery(tableName) {
    if (!dbAdapter) {
        throw new Error("Database not initialized");
    }
    return dbAdapter.getDescribeTableQuery(tableName);
}
