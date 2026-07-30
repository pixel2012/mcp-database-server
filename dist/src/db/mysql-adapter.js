import mysql from "mysql2/promise";
import { Signer } from "@aws-sdk/rds-signer";
/**
 * MySQL database adapter implementation
 */
export class MysqlAdapter {
    constructor(connectionInfo) {
        this.pool = null;
        this.host = connectionInfo.host;
        this.database = connectionInfo.database;
        this.awsIamAuth = connectionInfo.awsIamAuth || false;
        this.awsRegion = connectionInfo.awsRegion;
        this.config = {
            host: connectionInfo.host,
            database: connectionInfo.database,
            port: connectionInfo.port || 3306,
            user: connectionInfo.user,
            password: connectionInfo.password,
            connectTimeout: connectionInfo.connectionTimeout || 30000,
            multipleStatements: true,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            enableKeepAlive: true,
            keepAliveInitialDelay: 10000,
        };
        if (typeof connectionInfo.ssl === 'object' || typeof connectionInfo.ssl === 'string') {
            this.config.ssl = connectionInfo.ssl;
        }
        else if (connectionInfo.ssl === true) {
            // For AWS IAM authentication, configure SSL appropriately for RDS
            if (this.awsIamAuth) {
                this.config.ssl = {
                    rejectUnauthorized: false // AWS RDS handles certificate validation
                };
            }
            else {
                this.config.ssl = {};
            }
        }
        // Validate port
        if (connectionInfo.port && typeof connectionInfo.port !== 'number') {
            const parsedPort = parseInt(connectionInfo.port, 10);
            if (isNaN(parsedPort)) {
                throw new Error(`Invalid port value for MySQL: ${connectionInfo.port}`);
            }
            this.config.port = parsedPort;
        }
        // Log the port for debugging
        console.error(`[DEBUG] MySQL connection will use port: ${this.config.port}`);
    }
    /**
     * Generate AWS RDS authentication token
     */
    async generateAwsAuthToken() {
        if (!this.awsRegion) {
            throw new Error("AWS region is required for IAM authentication");
        }
        if (!this.config.user) {
            throw new Error("AWS username is required for IAM authentication");
        }
        try {
            console.info(`[INFO] Generating AWS auth token for region: ${this.awsRegion}, host: ${this.host}, user: ${this.config.user}`);
            const signer = new Signer({
                region: this.awsRegion,
                hostname: this.host,
                port: this.config.port || 3306,
                username: this.config.user,
            });
            const token = await signer.getAuthToken();
            console.info(`[INFO] AWS auth token generated successfully`);
            return token;
        }
        catch (err) {
            console.error(`[ERROR] Failed to generate AWS auth token: ${err.message}`);
            throw new Error(`AWS IAM authentication failed: ${err.message}. Please check your AWS credentials and IAM permissions.`);
        }
    }
    /**
     * Initialize MySQL connection pool
     */
    async init() {
        try {
            console.info(`[INFO] Connecting to MySQL: ${this.host}, Database: ${this.database}`);
            // Handle AWS IAM authentication
            if (this.awsIamAuth) {
                console.info(`[INFO] Using AWS IAM authentication for user: ${this.config.user}`);
                try {
                    const authToken = await this.generateAwsAuthToken();
                    // Create a new config with the generated token as password
                    const awsConfig = {
                        ...this.config,
                        password: authToken
                    };
                    this.pool = mysql.createPool(awsConfig);
                }
                catch (err) {
                    console.error(`[ERROR] AWS IAM authentication failed: ${err.message}`);
                    throw new Error(`AWS IAM authentication failed: ${err.message}`);
                }
            }
            else {
                this.pool = mysql.createPool(this.config);
            }
            // Test the connection pool by getting and releasing a connection
            const testConnection = await this.pool.getConnection();
            testConnection.release();
            console.info(`[INFO] MySQL connection pool established successfully`);
        }
        catch (err) {
            console.error(`[ERROR] MySQL connection error: ${err.message}`);
            if (this.awsIamAuth) {
                throw new Error(`Failed to connect to MySQL with AWS IAM authentication: ${err.message}. Please verify your AWS credentials, IAM permissions, and RDS configuration.`);
            }
            else {
                throw new Error(`Failed to connect to MySQL: ${err.message}`);
            }
        }
    }
    /**
     * Execute a SQL query and get all results
     */
    async all(query, params = []) {
        if (!this.pool) {
            throw new Error("Database not initialized");
        }
        try {
            const [rows] = await this.pool.execute(query, params);
            return Array.isArray(rows) ? rows : [];
        }
        catch (err) {
            throw new Error(`MySQL query error: ${err.message}`);
        }
    }
    /**
     * Execute a SQL query that modifies data
     */
    async run(query, params = []) {
        if (!this.pool) {
            throw new Error("Database not initialized");
        }
        try {
            const [result] = await this.pool.execute(query, params);
            const changes = result.affectedRows || 0;
            const lastID = result.insertId || 0;
            return { changes, lastID };
        }
        catch (err) {
            throw new Error(`MySQL query error: ${err.message}`);
        }
    }
    /**
     * Execute multiple SQL statements
     */
    async exec(query) {
        if (!this.pool) {
            throw new Error("Database not initialized");
        }
        try {
            await this.pool.query(query);
        }
        catch (err) {
            throw new Error(`MySQL batch error: ${err.message}`);
        }
    }
    /**
     * Close the database connection
     */
    async close() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }
    }
    /**
     * Get database metadata
     */
    getMetadata() {
        return {
            name: "MySQL",
            type: "mysql",
            server: this.host,
            database: this.database,
        };
    }
    /**
     * Get database-specific query for listing tables
     */
    getListTablesQuery() {
        return `SELECT table_name AS name FROM information_schema.tables WHERE table_schema = '${this.database}'`;
    }
    /**
     * Get database-specific query for describing a table
     */
    getDescribeTableQuery(tableName) {
        return `DESCRIBE \`${tableName}\``;
    }
}
