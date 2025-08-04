import { conn } from "../bd/bd.js";

export const inventarioController = {
  getPrepararInventario: async (req, res) => {
    let connection;
   
    try {
      connection = await conn.getConnection();

      // Consulta para obtener los datos de productos
      const [results] = await connection.query(
        `SELECT 
                    id, 
                    sku, 
                    idBloque, 
                    cantSistemaFemex, 
                    cantSistemaBlow, 
                    NULLIF(conteoFisico, 0) as conteoFisico, 
                    DATE_FORMAT(fechaConteo, '%Y-%m-%d %H:%i:%s') as fechaConteo,
                    cantidadPorBulto                     
                FROM productos 
                WHERE isActive = 1`
      );

      // Formatear los datos exactamente como los espera el frontend
      const datosParaFront = results.map((item) => ({
        id: item.id,
        sku: item.sku,
        idBloque: item.idBloque,
        cantSistemaFemex: item.cantSistemaFemex || 0, // Solo para cantidades
        cantSistemaBlow: item.cantSistemaBlow || 0, // Solo para cantidades
        conteoFisico: item.conteoFisico, // Puede ser NULL
        fechaConteo: item.fechaConteo,
        cantidadPorBulto: item.cantidadPorBulto || 0,
      }));

      res.status(200).json(datosParaFront);
    } catch (error) {
      console.error("Error al obtener bloques de conteo:", error);
      res.status(500).json({
        error: "Error al obtener los bloques de conteo",
        details: error.message,
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
        return res
          .status(400)
          .json({ error: "Se esperaba un array de productos" });
      }

      connection = await conn.getConnection();
      await connection.beginTransaction();

      // Actualizar cada producto
      for (const producto of productosActualizados) {
        await connection.query(
          `UPDATE productos SET 
                        conteoFisico = NULLIF(?, 0), 
                        fechaConteo = NOW(),  
                    WHERE id = ?`,
          [producto.conteoFisico, producto.id]
        );
      }

      await connection.commit();
      res
        .status(200)
        .json({ success: true, updatedCount: productosActualizados.length });
    } catch (error) {
      if (connection) await connection.rollback();
      console.error("Error al actualizar conteos:", error);
      res.status(500).json({
        error: "Error al actualizar los conteos físicos",
        details: error.message,
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },

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
        `UPDATE productos SET 
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
  },

  putActualizarProductoInventario: async (req, res) => {
    let connection;
    try {
        const { productos, tipoArchivo, accion } = req.body;

        // Validaciones básicas
        if (!['Femex', 'Blow'].includes(tipoArchivo)) {
            return res.status(400).json({ error: "Tipo de archivo no válido" });
        }

        connection = await conn.getConnection();
        let updatedCount = 0;
        const fechaActual = new Date();

        if (accion === 'borrar') {
            // Borrado masivo: rápido y eficiente
            await connection.beginTransaction();
            const [result] = await connection.query(
                `UPDATE productos SET 
                ${tipoArchivo === 'Femex' ? 'cantSistemaFemex' : 'cantSistemaBlow'} = 0,
                fechaConteo = ?
                WHERE ${tipoArchivo === 'Femex' ? 'cantSistemaFemex' : 'cantSistemaBlow'} IS NOT NULL`,
                [fechaActual]
            );
            updatedCount = result.affectedRows;
            await connection.commit();
        } else {
            if (!Array.isArray(productos) || productos.length === 0) {
                return res.status(400).json({ error: "Se esperaba un array no vacío de productos" });
            }

            // Usar una sola columna dependiendo del tipo
            const columnaCantidad = tipoArchivo === 'Femex' ? 'cantSistemaFemex' : 'cantSistemaBlow';

            const batchSize = 100; // Ajusta según rendimiento (100-500)
            for (let i = 0; i < productos.length; i += batchSize) {
                const batch = productos.slice(i, i + batchSize);

                // Construir condiciones y valores
                const skus = batch.map(p => p.sku);
                const cantidades = batch.reduce((acc, p) => {
                    acc[p.sku] = p.cantidad;
                    return acc;
                }, {});

                // Generar condiciones: WHERE sku IN (?, ?, ?)
                const skuPlaceholders = skus.map(() => '?').join(',');

                // Generar el CASE para asignar cantidades por SKU
                const caseParts = skus.map(sku => `WHEN ? THEN ?`).join(' ');
                const caseValues = skus.flatMap(sku => [sku, cantidades[sku]]);

                // Valores para la consulta: [cantidad1, fecha, cantidad2, fecha, ...]
                const updateValues = [];
                for (const p of batch) {
                    updateValues.push(p.cantidad, fechaActual);
                }

                await connection.beginTransaction();

                // Opción 1: UPDATE con CASE (más eficiente)
                const [result] = await connection.query(
                    `
                    UPDATE productos 
                    SET 
                        ${columnaCantidad} = CASE sku 
                            ${caseParts}
                        END,
                        fechaConteo = ?
                    WHERE sku IN (${skuPlaceholders})
                    `,
                    [...caseValues, fechaActual, ...skus]
                );

                updatedCount += result.affectedRows;
                await connection.commit();
            }
        }

        res.status(200).json({
            success: true,
            updatedCount,
            message: accion === 'borrar'
                ? `Todos los valores de ${tipoArchivo} fueron reseteados a 0 (${updatedCount} registros)`
                : `${updatedCount} productos actualizados correctamente (${tipoArchivo})`
        });

    } catch (error) {
        if (connection) {
            await connection.rollback().catch(console.error);
        }
        console.error("Error al actualizar inventario:", error);
        res.status(500).json({
            error: "Error al actualizar el inventario",
            details: error.message
        });
    } finally {
        if (connection) connection.release();
    }
},

  putGuardarInventario: async (req, res) => {
    let connection;
    try {
      const productosActualizados = req.body;

      if (!Array.isArray(productosActualizados)) {
        return res.status(400).json({ error: "Se esperaba un array de productos" });
      }

      // Filtrar solo productos con conteo válido (no null)
      const productosValidos = productosActualizados.filter(
        p => p.conteoFisico !== null && p.conteoFisico !== undefined
      );

      if (productosValidos.length === 0) {
        return res.status(400).json({ error: "No hay conteos válidos para guardar" });
      }

      connection = await conn.getConnection();
      await connection.beginTransaction();

      // Actualización masiva con un solo query
      const [result] = await connection.query(
        `UPDATE productos 
         SET conteoFisico = CASE id
           ${productosValidos.map(p => `WHEN ${p.id} THEN ${p.conteoFisico}`).join(' ')}
           END,
           fechaConteo = NOW()
         WHERE id IN (${productosValidos.map(p => p.id).join(',')})`
      );

      await connection.commit();

      res.status(200).json({
        success: true,
        updatedCount: result.affectedRows,
        message: `${result.affectedRows} productos actualizados correctamente`
      });

    } catch (error) {
      if (connection) await connection.rollback();
      console.error("Error al guardar inventario:", error);
      res.status(500).json({
        error: "Error al guardar el inventario",
        details: error.message
      });
    } finally {
      if (connection) connection.release();
    }
  },

  putactualizarCantidadPorBulto: async (req, res) => {
    let connection;
    try {
      const { idProducto, nuevaCantidad } = req.body;

      if (!idProducto || nuevaCantidad === undefined || nuevaCantidad < 0) {
        return res.status(400).json({
          error: "Datos inválidos. Se requiere idProducto y nuevaCantidad válida"
        });
      }

      connection = await conn.getConnection();
      await connection.beginTransaction();

      const [result] = await connection.query(
        `UPDATE productos 
       SET cantidadPorBulto = ?
       WHERE id = ?`,
        [nuevaCantidad, idProducto]
      );

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ error: "Producto no encontrado" });
      }

      await connection.commit();
      res.status(200).json({
        success: true,
        message: "Cantidad por bulto actualizada correctamente"
      });

    } catch (error) {
      if (connection) await connection.rollback();
      console.error("Error al actualizar cantidad por bulto:", error);
      res.status(500).json({
        error: "Error al actualizar cantidad por bulto",
        details: error.message
      });
    } finally {
      if (connection) connection.release();
    }
  },

  //REPOSICION!!!!+++++++++++++++++++++++++++++++++++++
  postGuardarReposicion: async (req, res) => {
    let connection;
    console.log( 'guarddar', req.body);
    
    try {
      const { productos } = req.body;

      if (!Array.isArray(productos)) {
        return res.status(400).json({
          success: false,
          message: 'Se esperaba un array de productos'
        });
      }

      connection = await conn.getConnection();
      await connection.beginTransaction();

      // Para cada producto en la reposición
      for (const producto of productos) {
        // Primero verificamos si el SKU ya existe en la tabla
        const [existing] = await connection.query(
          `SELECT id FROM reposicion WHERE sku = ?`,
          [producto.sku]
        );

        if (existing && existing.length > 0) {
          // Si existe, actualizamos la cantidad
          await connection.query(
            `UPDATE reposicion SET cantidad = ? WHERE sku = ?`,
            [producto.cantidad, producto.sku]
          );
        } else {
          // Si no existe, insertamos nuevo registro
          await connection.query(
            `INSERT INTO reposicion (sku, cantidad) VALUES (?, ?)`,
            [producto.sku, producto.cantidad]
          );
        }
      }

      await connection.commit();

      res.status(200).json({
        success: true,
        message: `Reposición guardada correctamente`,
        productosCount: productos.length
      });

    } catch (error) {
      if (connection) await connection.rollback();
      console.error('Error al guardar reposición:', error);
      res.status(500).json({
        success: false,
        message: 'Error al guardar la reposición',
        error: error.message
      });
    } finally {
      if (connection) connection.release();
    }
  },

  getObtenerReposiciones: async (req, res) => {
    let connection;
    try {
      connection = await conn.getConnection();

      // Obtener solo reposiciones con cantidad > 0
      const [reposiciones] = await connection.query(`
        SELECT sku, cantidad 
        FROM reposicion 
        WHERE cantidad > 0
      `);

      res.status(200).json(reposiciones);

    } catch (error) {
      console.error('Error al obtener reposiciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener las reposiciones',
        error: error.message
      });
    } finally {
      if (connection) connection.release();
    }
  },

  // REPOSICIÓN - Limpiar reposiciones (opcional)
  deleteLimpiarReposiciones: async (req, res) => {
    console.log('eliminar', req.body);
    
    let connection;
    try {
      connection = await conn.getConnection();
      await connection.beginTransaction();

      const [result] = await connection.query(`
        UPDATE reposicion SET cantidad = 0
      `);

      await connection.commit();

      res.status(200).json({
        success: true,
        message: `Todas las reposiciones fueron limpiadas`,
        registrosAfectados: result.affectedRows
      });

    } catch (error) {
      if (connection) await connection.rollback();
      console.error('Error al limpiar reposiciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error al limpiar las reposiciones',
        error: error.message
      });
    } finally {
      if (connection) connection.release();
    }
  }
};

export default inventarioController;
