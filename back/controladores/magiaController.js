import dotenv from "dotenv";
import { conn } from "../bd/bd.js";
import events from "events";

events.EventEmitter.defaultMaxListeners = 15;

dotenv.config();

const cargarMagia = {
    postAgregarMagia: async (req, res) => {
        const { numeroPresupuesto, productos } = req.body;

        let connection;
        try {
            connection = await conn.getConnection();

            for (const producto of productos) {
                const { modelo, cantidad } = producto;

                await connection.query(
                    `INSERT INTO stockMagia (idSku, cantidad, bool1) VALUES (?, ?, ?)`,
                    [modelo, cantidad, numeroPresupuesto || null]
                );
            }

            res.status(200).json({ message: "Productos agregados correctamente" });
        } catch (error) {
            console.error("Error al agregar productos:", error);
            res.status(500).json({ message: "Error al agregar productos" });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    },

    postAgregarFacturaMagia: async (req, res) => {
        const { numFactura, productos } = req.body;

        let connection;
        try {
            connection = await conn.getConnection();

            for (const producto of productos) {
                const { modelo, cantidad } = producto;

                await connection.query(
                    `INSERT INTO facturacionMagia (idSku, cantidad, numFactura) VALUES (?, ?, ?)`,
                    [modelo, cantidad, numFactura]
                );
            }

            res.status(200).json({ message: "Factura agregada correctamente" });
        } catch (error) {
            console.error("Error al agregar factura:", error);
            res.status(500).json({ message: "Error al agregar factura" });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    },

    getStockMagia: async (req, res) => {
        let connection;
        try {
            connection = await conn.getConnection();

            const query = `
                SELECT 
                    p.sku,
                    p.descripcion,
                    COALESCE(SUM(s.cantidad), 0) AS totalEntregado,
                    COALESCE(SUM(f.cantidad), 0) AS totalFacturado,
                    COALESCE(SUM(s.cantidad), 0) - COALESCE(SUM(f.cantidad), 0) AS diferencia
                FROM productos p
                LEFT JOIN stockMagia s ON p.id = s.idSku
                LEFT JOIN facturacionMagia f ON p.id = f.idSku
                WHERE p.sku LIKE 'wm%' OR p.sku LIKE 'WM%'
                GROUP BY p.id, p.sku, p.descripcion
                HAVING totalEntregado > 0 OR totalFacturado > 0
                ORDER BY p.sku ASC
            `;

            const [rows] = await connection.query(query);
            res.json(rows);
        } catch (error) {
            console.error("Error al obtener stock:", error);
            res.status(500).json({ message: "Error al obtener stock" });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    },
};

export { cargarMagia };
