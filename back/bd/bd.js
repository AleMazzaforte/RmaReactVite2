import dotenv from 'dotenv';
import mysql from 'mysql2';

dotenv.config();

class MySQLDatabase {
    static #instance; // Private static field (ES2022+)
    pool;

    constructor() {
        this.pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: parseInt(process.env.DB_PORT),
            waitForConnections: true,
            connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
            queueLimit: 0
        });
    }

    static getInstance() {
        if (!this.#instance) {
            this.#instance = new MySQLDatabase();
        }
        return this.#instance;
    }
}

// Exporta el pool.promise() igual que antes
export const conn = MySQLDatabase.getInstance().pool.promise();