import { conn } from "../bd/bd.js";

export const informeController = {
    // Obtener el stock de RMA (productos en coexistencia) para la selección en el informe
    getStockRMA: async (req, res) => {
        let connection;
        try {
            connection = await conn.getConnection();
            const [rows] = await connection.query(`
        SELECT 
          rma.idRma AS idRma,          
          p.sku AS sku,
          c.nombre AS cliente,
          m.nombre AS marca,
          op.nombre AS opLote,
          rma.cantidad AS cantidad  
        FROM r_m_a rma
        JOIN productos p ON rma.modelo = p.id
        JOIN marcas m ON rma.marca = m.id
        JOIN clientes c ON rma.idCliente = c.id
        LEFT JOIN OP op ON rma.opLote = op.id
        WHERE rma.enExistencia = TRUE  
        ORDER BY p.sku, m.nombre, op.nombre
      `);
            res.json(rows);
        } catch (error) {
            console.error("Error al obtener el stock de RMA:", error);
            res.status(500).json({ error: "Error interno del servidor" });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    },

    // Crear un lote de descarga antes de generar el Excel
    postCrearLoteDescarga: async (req, res) => {
        const { productos } = req.body; // Array de { rma_id, sku, cantidad, op }
        let connection;
        try {
            connection = await conn.getConnection();
            await connection.beginTransaction();

            // 1. Crear el registro en rma_lotes_descarga
            const [loteResult] = await connection.execute(
                `INSERT INTO rma_lotes_descarga (fecha_descarga, estado) 
         VALUES (NOW(), 'pendiente')`
            );

            const loteId = loteResult.insertId;

            // 2. Insertar los detalles en rma_lotes_detalle
            for (const producto of productos) {
                await connection.execute(
                    `INSERT INTO rma_lotes_detalle (lote_id, rma_id, sku, cantidad, op) 
           VALUES (?, ?, ?, ?, ?)`,
                    [loteId, producto.rma_id, producto.sku, producto.cantidad, producto.op]
                );
            }

            await connection.commit();
            res.status(200).json({
                success: true,
                loteId,
                message: 'Lote creado correctamente'
            });
        } catch (error) {
            if (connection) {
                await connection.rollback();
            }
            console.error('Error al crear lote de descarga:', error);
            res.status(500).json({
                success: false,
                message: 'Error al crear lote de descarga'
            });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    },

    // Confirmar la recepción de un lote (actualizar enExistencia en r_m_a)
    postConfirmarLote: async (req, res) => {
        const { loteId } = req.body;
        let connection;
        try {
            connection = await conn.getConnection();
            await connection.beginTransaction();

            // 1. Validar que el lote existe y está pendiente
            const [lote] = await connection.execute(
                `SELECT id, estado FROM rma_lotes_descarga WHERE id = ?`,
                [loteId]
            );

            if (lote.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Lote no encontrado'
                });
            }

            if (lote[0].estado !== 'pendiente') {
                return res.status(400).json({
                    success: false,
                    message: `El lote ya fue ${lote[0].estado}`
                });
            }

            // 2. Obtener todos los rma_id del lote
            const [detalles] = await connection.execute(
                `SELECT rma_id FROM rma_lotes_detalle WHERE lote_id = ?`,
                [loteId]
            );

            if (detalles.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'El lote no tiene productos asociados'
                });
            }

            const rmaIds = detalles.map(d => d.rma_id);

            // 3. Actualizar enExistencia = false para todos los productos del lote
            const placeholders = rmaIds.map(() => '?').join(',');
            const [updateResult] = await connection.execute(
                `UPDATE r_m_a SET enExistencia = false WHERE idRma IN (${placeholders})`,
                rmaIds
            );

            // 4. Marcar el lote como confirmado
            await connection.execute(
                `UPDATE rma_lotes_descarga 
         SET estado = 'confirmado', fecha_confirmacion = NOW() 
         WHERE id = ?`,
                [loteId]
            );

            await connection.commit();
            res.status(200).json({
                success: true,
                message: `Lote confirmado. ${updateResult.affectedRows} productos actualizados.`,
                productosActualizados: updateResult.affectedRows
            });
        } catch (error) {
            if (connection) {
                await connection.rollback();
            }
            console.error('Error al confirmar lote:', error);
            res.status(500).json({
                success: false,
                message: 'Error al confirmar lote'
            });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    },

    // Listar lotes (para el historial)
    getLotes: async (req, res) => {
        let connection;
        try {
            connection = await conn.getConnection();
            const [lotes] = await connection.query(`
        SELECT 
          l.id,
          l.fecha_descarga,
          l.estado,
          l.fecha_confirmacion,
          l.notas,
          COUNT(d.id) as total_productos
        FROM rma_lotes_descarga l
        LEFT JOIN rma_lotes_detalle d ON l.id = d.lote_id
        GROUP BY l.id
        ORDER BY l.fecha_descarga DESC
        LIMIT 50
      `);
            res.json(lotes);
        } catch (error) {
            console.error('Error al listar lotes:', error);
            res.status(500).json({ error: 'Error al listar lotes' });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    },

    // Revertir confirmación de un lote (volver enExistencia a true)
    postRevertirLote: async (req, res) => {
        const { loteId } = req.body;
        let connection;
        try {
            connection = await conn.getConnection();
            await connection.beginTransaction();

            // 1. Validar que el lote existe y está confirmado
            const [lote] = await connection.execute(
                `SELECT id, estado FROM rma_lotes_descarga WHERE id = ?`,
                [loteId]
            );

            if (lote.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Lote no encontrado'
                });
            }

            if (lote[0].estado !== 'confirmado') {
                return res.status(400).json({
                    success: false,
                    message: `El lote está en estado '${lote[0].estado}'. Solo se pueden revertir lotes confirmados.`
                });
            }

            // 2. Obtener todos los rma_id del lote
            const [detalles] = await connection.execute(
                `SELECT rma_id FROM rma_lotes_detalle WHERE lote_id = ?`,
                [loteId]
            );

            if (detalles.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'El lote no tiene productos asociados'
                });
            }

            const rmaIds = detalles.map(d => d.rma_id);

            // 3. Actualizar enExistencia = true para todos los productos del lote
            const placeholders = rmaIds.map(() => '?').join(',');
            const [updateResult] = await connection.execute(
                `UPDATE r_m_a SET enExistencia = true WHERE idRma IN (${placeholders})`,
                rmaIds
            );

            // 4. Marcar el lote como pendiente nuevamente
            await connection.execute(
                `UPDATE rma_lotes_descarga 
         SET estado = 'pendiente', fecha_confirmacion = NULL 
         WHERE id = ?`,
                [loteId]
            );

            await connection.commit();
            res.status(200).json({
                success: true,
                message: `Lote revertido. ${updateResult.affectedRows} productos actualizados.`,
                productosActualizados: updateResult.affectedRows
            });
        } catch (error) {
            if (connection) {
                await connection.rollback();
            }
            console.error('Error al revertir lote:', error);
            res.status(500).json({
                success: false,
                message: 'Error al revertir lote'
            });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    },

    // Eliminar un lote y sus detalles
    postEliminarLote: async (req, res) => {
        const { loteId } = req.body;
        let connection;
        try {
            connection = await conn.getConnection();
            await connection.beginTransaction();

            // 1. Eliminar los detalles del lote
            await connection.execute(
                `DELETE FROM rma_lotes_detalle WHERE lote_id = ?`,
                [loteId]
            );

            // 2. Eliminar el registro del lote
            const [result] = await connection.execute(
                `DELETE FROM rma_lotes_descarga WHERE id = ?`,
                [loteId]
            );

            if (result.affectedRows === 0) {
                await connection.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Lote no encontrado'
                });
            }

            await connection.commit();
            res.status(200).json({
                success: true,
                message: 'Lote eliminado correctamente'
            });
        } catch (error) {
            if (connection) {
                await connection.rollback();
            }
            console.error('Error al eliminar lote:', error);
            res.status(500).json({
                success: false,
                message: 'Error al eliminar lote'
            });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }
};
