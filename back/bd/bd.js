import dotenv from 'dotenv';
import mysql from 'mysql2';

dotenv.config(); // Cargar el archivo .env


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



export const conn = poolConnection.promise();

