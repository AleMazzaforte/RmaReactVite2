// controllers/backupController.js
import { conn } from "../bd/bd.js";
import { tmpdir } from 'os';
import { join } from 'path';
import { createWriteStream, createReadStream } from 'fs';
import { finished } from 'stream';
import { promisify } from 'util';

const finishedAsync = promisify(finished);

// Función para obtener todas las tablas y sus dependencias
const getTablesInfo = async (connection) => {
  // Obtener todas las tablas de la base de datos actual
  const [tables] = await connection.query(`
    SELECT TABLE_NAME 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_NAME
  `);

  const tableNames = tables.map(t => t.TABLE_NAME);

  // Obtener dependencias de claves foráneas para ordenar correctamente
  const [foreignKeys] = await connection.query(`
    SELECT 
      TABLE_NAME,
      REFERENCED_TABLE_NAME
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
    AND REFERENCED_TABLE_NAME IS NOT NULL
  `);

  // Crear un mapa de dependencias
  const dependencies = new Map();
  foreignKeys.forEach(fk => {
    if (!dependencies.has(fk.TABLE_NAME)) {
      dependencies.set(fk.TABLE_NAME, new Set());
    }
    dependencies.get(fk.TABLE_NAME).add(fk.REFERENCED_TABLE_NAME);
  });

  // Ordenar tablas topológicamente (respetando dependencias)
  const sortedTables = [];
  const visited = new Set();
  const tempMark = new Set();

  const visit = (tableName) => {
    if (tempMark.has(tableName)) {
      throw new Error('Ciclo detectado en dependencias de tablas');
    }
    if (!visited.has(tableName)) {
      tempMark.add(tableName);
      const deps = dependencies.get(tableName) || new Set();
      deps.forEach(dep => {
        if (tableNames.includes(dep)) {
          visit(dep);
        }
      });
      tempMark.delete(tableName);
      visited.add(tableName);
      sortedTables.push(tableName);
    }
  };

  tableNames.forEach(tableName => {
    if (!visited.has(tableName)) {
      visit(tableName);
    }
  });

  return sortedTables;
};

// Función para obtener el CREATE TABLE de una tabla específica
const getCreateTable = async (connection, tableName) => {
  const [result] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``);
  return result[0]['Create Table'];
};

const escapeSqlValue = (val) => {
  if (val === null) return 'NULL';
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
};

const backupController = {
  getBackup: async (req, res) => {
    let connection;
    let tempFile;

    try {
      connection = await conn.getConnection();

      const filename = `backup_${new Date().toISOString().split('T')[0]}.sql`;
      tempFile = join(tmpdir(), filename);
      const writeStream = createWriteStream(tempFile);

      writeStream.write(`-- Backup generado el ${new Date().toISOString()}\n`);
      writeStream.write(`-- Base de datos: ${await connection.query('SELECT DATABASE()')}\n\n`);
      writeStream.write(`SET FOREIGN_KEY_CHECKS = 0;\n\n`);

      // Obtener tablas ordenadas dinámicamente
      const tableNames = await getTablesInfo(connection);

      // Escribir esquema de todas las tablas
      for (const tableName of tableNames) {
        const createTable = await getCreateTable(connection, tableName);
        writeStream.write(`${createTable};\n\n`);
      }

      // Escribir datos de todas las tablas
      for (const tableName of tableNames) {
        const [rows] = await connection.query(`SELECT * FROM \`${tableName}\``);
        if (rows.length > 0) {
          const columns = Object.keys(rows[0]);
          const values = rows.map(row => {
            const vals = columns.map(col => escapeSqlValue(row[col]));
            return `(${vals.join(', ')})`;
          }).join(',\n    ');

          writeStream.write(
            `INSERT INTO \`${tableName}\` (\`${columns.join('`, `')}\`) VALUES\n    ${values};\n\n`
          );
        }
      }

      writeStream.write(`SET FOREIGN_KEY_CHECKS = 1;\n`);
      writeStream.write(`-- Backup completado exitosamente\n`);
      writeStream.end();
      await finishedAsync(writeStream);

      res.setHeader('Content-Type', 'application/sql');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      const fileStream = createReadStream(tempFile);
      fileStream.pipe(res);

    } catch (error) {
      console.error('Error en backup:', error);
      res.status(500).json({ error: 'Error al generar backup' });
    } finally {
      if (connection) connection.release();
    }
  }
};

export default backupController;