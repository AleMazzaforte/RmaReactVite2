// controllers/backupController.js
import { conn } from "../bd/bd.js";
import { tmpdir } from 'os';
import { join } from 'path';
import { createWriteStream, createReadStream } from 'fs';
import { finished } from 'stream';
import { promisify } from 'util';

const finishedAsync = promisify(finished);

// ✅ SCHEMA LIMPIO (solo CREATE TABLE, sin comentarios ni SET)
const SCHEMA_SQL = `
CREATE TABLE \`clientes\` (
  \`id\` int NOT NULL AUTO_INCREMENT,
  \`nombre\` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_tr_0900_as_cs DEFAULT NULL,
  \`cuit\` bigint DEFAULT NULL,
  \`provincia\` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_tr_0900_as_cs DEFAULT NULL,
  \`ciudad\` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_tr_0900_as_cs DEFAULT NULL,
  \`domicilio\` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_tr_0900_as_cs DEFAULT NULL,
  \`telefono\` bigint DEFAULT NULL,
  \`transporte\` varchar(50) COLLATE utf8mb4_tr_0900_as_cs DEFAULT NULL,
  \`seguro\` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_tr_0900_as_cs DEFAULT NULL,
  \`condicionDeEntrega\` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_tr_0900_as_cs DEFAULT NULL,
  \`condicionDePago\` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_tr_0900_as_cs DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`nombre\` (\`nombre\`),
  UNIQUE KEY \`cuit\` (\`cuit\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_tr_0900_as_cs;

CREATE TABLE \`configuracionDeImpresion\` (
  \`id\` int NOT NULL AUTO_INCREMENT,
  \`config\` varchar(100) COLLATE utf8mb4_tr_0900_as_cs NOT NULL,
  \`bool1\` tinyint(1) NOT NULL,
  \`bool2\` tinyint(1) NOT NULL,
  \`bool3\` tinyint(1) NOT NULL,
  \`bool4\` tinyint(1) NOT NULL,
  \`bool5\` tinyint(1) NOT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_tr_0900_as_cs;

CREATE TABLE \`devoluciones\` (
  \`id\` int NOT NULL AUTO_INCREMENT,
  \`idCliente\` int NOT NULL,
  \`fechaIngreso\` date NOT NULL,
  \`sku\` varchar(50) COLLATE utf8mb4_tr_0900_as_cs NOT NULL,
  \`cantidad\` int NOT NULL,
  \`marca\` varchar(20) COLLATE utf8mb4_tr_0900_as_cs NOT NULL,
  \`motivo\` varchar(100) COLLATE utf8mb4_tr_0900_as_cs NOT NULL,
  \`ventaMeli\` bigint DEFAULT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_tr_0900_as_cs;

CREATE TABLE \`kits\` (
  \`id\` int NOT NULL AUTO_INCREMENT,
  \`idSkuKit\` int NOT NULL,
  \`idSku1\` int DEFAULT NULL,
  \`idSku2\` int DEFAULT NULL,
  \`idSku3\` int DEFAULT NULL,
  \`idSku4\` int DEFAULT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_tr_0900_as_cs;

CREATE TABLE \`logo\` (
  \`id\` int NOT NULL AUTO_INCREMENT,
  \`nombre\` varchar(25) CHARACTER SET utf8mb4 COLLATE utf8mb4_tr_0900_as_cs DEFAULT NULL,
  \`imagen\` longblob,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_tr_0900_as_cs;

CREATE TABLE \`marcas\` (
  \`id\` smallint NOT NULL AUTO_INCREMENT,
  \`nombre\` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_tr_0900_as_cs NOT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`nombre\` (\`nombre\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_tr_0900_as_cs;

CREATE TABLE \`OP\` (
  \`id\` int NOT NULL AUTO_INCREMENT,
  \`nombre\` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_tr_0900_as_cs NOT NULL,
  \`fechaIngreso\` date NOT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`op\` (\`nombre\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_tr_0900_as_cs;

CREATE TABLE \`opProductos\` (
  \`id\` int NOT NULL AUTO_INCREMENT,
  \`idOp\` int NOT NULL,
  \`cantidad\` int NOT NULL,
  \`idSku\` int NOT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_tr_0900_as_cs;

CREATE TABLE \`productos\` (
  \`id\` smallint NOT NULL AUTO_INCREMENT,
  \`sku\` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_tr_0900_as_cs NOT NULL,
  \`marca\` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_tr_0900_as_cs DEFAULT NULL,
  \`descripcion\` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_tr_0900_as_cs DEFAULT NULL,
  \`rubro\` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_tr_0900_as_cs DEFAULT NULL,
  \`idBloque\` int DEFAULT NULL,
  \`cantSistemaFemex\` int DEFAULT NULL,
  \`cantSistemaBlow\` int DEFAULT NULL,
  \`conteoFisico\` int DEFAULT NULL,
  \`fechaConteo\` datetime DEFAULT NULL,
  \`cantidadPorBulto\` int DEFAULT NULL,
  \`isActive\` tinyint(1) DEFAULT '1',
  \`bolean2\` tinyint(1) DEFAULT NULL,
  UNIQUE KEY \`id\` (\`id\`),
  UNIQUE KEY \`sku\` (\`sku\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_tr_0900_as_cs;

CREATE TABLE \`productosViejos\` (
  \`id\` int NOT NULL AUTO_INCREMENT,
  \`sku\` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_tr_0900_as_cs NOT NULL,
  \`cantidad\` int NOT NULL,
  \`idSku\` int DEFAULT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_tr_0900_as_cs;

CREATE TABLE \`reposicion\` (
  \`id\` int NOT NULL AUTO_INCREMENT,
  \`sku\` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_tr_0900_as_cs DEFAULT NULL,
  \`cantidad\` bigint DEFAULT NULL,
  \`bool1\` tinyint(1) DEFAULT NULL,
  \`bool2\` tinyint(1) DEFAULT NULL,
  \`bool3\` tinyint(1) DEFAULT NULL,
  \`bool4\` tinyint(1) DEFAULT NULL,
  \`bool5\` tinyint(1) DEFAULT NULL,
  \`bool6\` tinyint(1) DEFAULT NULL,
  \`bool7\` tinyint(1) DEFAULT NULL,
  \`bool8\` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`nombre\` (\`sku\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_tr_0900_as_cs;

CREATE TABLE \`r_m_a\` (
  \`idRma\` int NOT NULL AUTO_INCREMENT,
  \`modelo\` smallint NOT NULL,
  \`cantidad\` int NOT NULL,
  \`marca\` smallint NOT NULL,
  \`solicita\` date NOT NULL,
  \`opLote\` int DEFAULT NULL,
  \`vencimiento\` date DEFAULT NULL,
  \`seEntrega\` date DEFAULT NULL,
  \`seRecibe\` date DEFAULT NULL,
  \`observaciones\` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_tr_0900_as_cs DEFAULT NULL,
  \`nIngreso\` int DEFAULT NULL,
  \`nEgreso\` varchar(12) CHARACTER SET utf8mb4 COLLATE utf8mb4_tr_0900_as_cs DEFAULT NULL,
  \`idCliente\` int DEFAULT NULL,
  \`numVenta\` bigint DEFAULT NULL,
  \`enExistencia\` tinyint(1) DEFAULT NULL,
  \`bool2\` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (\`idRma\`),
  KEY \`fk_marca\` (\`marca\`),
  CONSTRAINT \`fk_marca\` FOREIGN KEY (\`marca\`) REFERENCES \`marcas\` (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_tr_0900_as_cs;

CREATE TABLE \`transportes\` (
  \`nombre\` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_tr_0900_as_cs NOT NULL,
  \`idTransporte\` int NOT NULL AUTO_INCREMENT,
  \`direccionLocal\` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_tr_0900_as_cs DEFAULT NULL,
  \`telefono\` bigint DEFAULT NULL,
  PRIMARY KEY (\`idTransporte\`),
  UNIQUE KEY \`nombre\` (\`nombre\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_tr_0900_as_cs;

CREATE TABLE \`usuarios\` (
  \`id\` int NOT NULL AUTO_INCREMENT,
  \`nombre\` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_tr_0900_as_cs NOT NULL,
  \`password\` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_tr_0900_as_cs NOT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`idx_nombre\` (\`nombre\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_tr_0900_as_cs;
`.trim();

const TABLES_IN_ORDER = [
  'marcas',
  'clientes',
  'configuracionDeImpresion',
  'devoluciones',
  'kits',
  'logo',
  'OP',
  'opProductos',
  'productos',
  'productosViejos',
  'reposicion',
  'r_m_a',
  'transportes',
  'usuarios'
];

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

      writeStream.write(`-- Backup generado el ${new Date().toISOString()}\n\n`);
      writeStream.write(`SET FOREIGN_KEY_CHECKS = 0;\n\n`);
      writeStream.write(SCHEMA_SQL + '\n\n');

      for (const tableName of TABLES_IN_ORDER) {
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