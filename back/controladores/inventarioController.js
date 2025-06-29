import { conn } from "../bd/bd.js"

export const inventarioController = {
    getPrepararInventario: async (req, res) => {
        let connection;
        try {
            connection = await conn.getConnection();

            // Consulta para obtener los datos de bloquesConteo
            const [results] = await connection.query(
                `SELECT 
                    id, 
                    sku, 
                    idBloque, 
                    cantSistemaFemex, 
                    cantSistemaBlow, 
                    NULLIF(conteoFisico, 0) as conteoFisico, 
                    DATE_FORMAT(fechaConteo, '%Y-%m-%d %H:%i:%s') as fechaConteo, 
                    observacion 
                FROM bloquesConteo`
            );

            // Formatear los datos exactamente como los espera el frontend
            const datosParaFront = results.map(item => ({
                id: item.id,
                sku: item.sku,
                idBloque: item.idBloque,
                cantSistemaFemex: item.cantSistemaFemex || 0,  // Solo para cantidades
                cantSistemaBlow: item.cantSistemaBlow || 0,    // Solo para cantidades
                conteoFisico: item.conteoFisico,  // Puede ser NULL
                fechaConteo: item.fechaConteo,
                observacion: item.observacion
            }));

            res.status(200).json(datosParaFront);

        } catch (error) {
            console.error("Error al obtener bloques de conteo:", error);
            res.status(500).json({ 
                error: "Error al obtener los bloques de conteo",
                details: error.message 
            });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    },

    postActualizarConteos: async (req, res) => {
        let connection;
        try {
            const productosActualizados = req.body;
            if (!Array.isArray(productosActualizados)) {
                return res.status(400).json({ error: "Se esperaba un array de productos" });
            }

            connection = await conn.getConnection();
            await connection.beginTransaction();

            // Actualizar cada producto
            for (const producto of productosActualizados) {
                await connection.query(
                    `UPDATE bloquesConteo SET 
                        conteoFisico = NULLIF(?, 0), 
                        fechaConteo = NOW(), 
                        observacion = ? 
                    WHERE id = ?`,
                    [producto.conteoFisico, producto.observacion, producto.id]
                );
            }

            await connection.commit();
            res.status(200).json({ success: true, updatedCount: productosActualizados.length });

        } catch (error) {
            if (connection) await connection.rollback();
            console.error("Error al actualizar conteos:", error);
            res.status(500).json({ 
                error: "Error al actualizar los conteos físicos",
                details: error.message 
            });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    },

    // En tu inventarioController.js
putActualizarBloques: async (req, res) => {
    let connection;
    try {
        const { bloque, productos } = req.body;
        
        if (!bloque || !productos || !Array.isArray(productos)) {
            return res.status(400).json({ error: "Datos inválidos" });
        }

        connection = await conn.getConnection();
        await connection.beginTransaction();

        await connection.query(
            `UPDATE bloquesConteo SET 
                idBloque = ?
            WHERE id IN (?)`,
            [bloque, productos]
        );

        await connection.commit();
        res.status(200).json({ success: true });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error al actualizar bloques:", error);
        res.status(500).json({ error: "Error al actualizar bloques" });
    } finally {
        if (connection) connection.release();
    }
}
};

export default inventarioController;