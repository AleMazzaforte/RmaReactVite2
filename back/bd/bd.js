import dotenv from 'dotenv';
import mysql from 'mysql2';

dotenv.config(); // Cargar el archivo .env
console.log( 'log de variables de entorno', {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

// Verifica que las variables de entorno estén definidas
if (
    !process.env.DB_HOST ||
    !process.env.DB_USER ||
    !process.env.DB_PASSWORD ||
    !process.env.DB_NAME
) {
    throw new Error('Faltan variables de entorno para la conexión a la base de datos.');
}

const poolConnection = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: process.env.DB_CONNECTION_LIMIT,
    queueLimit: 0
});
console.log('Configuración del pool:', {
    host: poolConnection.config.connectionConfig.host,
    user: poolConnection.config.connectionConfig.user,
    password: poolConnection.config.connectionConfig.password,
    database: poolConnection.config.connectionConfig.database,
    port: poolConnection.config.connectionConfig.port
});


export const conn = poolConnection.promise();

