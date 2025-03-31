import dotenv from "dotenv";
import { conn } from "../bd/bd.js";
import events from "events";
events.EventEmitter.defaultMaxListeners = 15;

dotenv.config();


let connection;
const listarOp = {
  
  getListarOp: async (req, res) => {
    const { query } = req.params; // Obtener el parámetro de búsqueda desde la ruta
    
    const connection = await conn.getConnection();
    try {
      

      // Consulta para buscar OPs que coincidan con el parámetro de búsqueda (insensible a mayúsculas/minúsculas)
      const [results] = await connection.query(
        "SELECT * FROM OP WHERE LOWER(nombre) LIKE LOWER(?) ORDER BY nombre ASC",
        [`%${query}%`] // Usar el valor de query en el patrón LIKE
      );
            
      // Verificar si se encontraron resultados
      if (results.length === 0) {
        return res.status(404).json({ message: "No se encontraron OPs." });
      }

      // Devolver los resultados en el formato esperado
      res.json(results);
      
    } catch (error) {
      console.error("Error al obtener las OPs:", error);
      res.status(500).json({ error: "Error al obtener las OPs." });
    } finally {
      if (connection) connection.release();
    }
  },

  postGuardarOp: async (req, res) => {
    
    try {
        const { op, fechaIngreso } = req.body;

        if (!op || !fechaIngreso) {
            return res.status(400).json({ message: "Faltan datos obligatorios", success: false });
        }

        connection = await conn.getConnection();
        await connection.beginTransaction();

        // Verificar si la OP ya existe
        const [existingOp] = await connection.query(
            "SELECT id FROM OP WHERE nombre = ?",
            [op]
        );

        if (existingOp.length > 0) {
            return res.status(400).json({ message: "La OP ya existe", success: false });
        }

        await connection.query(
            "INSERT INTO OP (nombre, fechaIngreso) VALUES (?, ?)",
            [op, fechaIngreso]
        );

        const id = await connection.query("SELECT LAST_INSERT_ID() AS id");

        const idOp = id[0][0].id;
        
        
        await connection.commit();
        res.status(201).json({ message: "OP guardada correctamente", success: true, idOp });
    } catch (error) {
        console.error("Error al guardar la OP:", error);
        if (connection) await connection.rollback();
        res.status(500).json({ message: "Error interno del servidor", success: false });
    } finally {
        if (connection) connection.release();
    }
  },

  postGuardarOpProductos: async (req, res) => {
    
    try {
        const productos = req.body; // Array de productos: [{ idOp, sku, cantidad }]
  
        if (!Array.isArray(productos) || productos.length === 0) {
            return res.status(400).json({ message: "Debe enviar al menos un producto", success: false });
        }
  
        connection = await conn.getConnection();
        await connection.beginTransaction();
  
        // Verificar si la OP existe
        const [opExistente] = await connection.query(
            "SELECT id FROM OP WHERE id = ?",
            [productos[0].idOp]
        );
  
        if (opExistente.length === 0) {
            return res.status(400).json({ message: "La OP no existe", success: false });
        }
  
        // Insertar los productos en opProductos con idSku
        for (const producto of productos) {
            const { idOp, sku, cantidad } = producto;
  
            if (!idOp || !sku || !cantidad) {
                throw new Error("Faltan datos obligatorios en uno o más productos");
            }
  
            // Obtener el id del producto correspondiente al sku
            const [productoInfo] = await connection.query(
                "SELECT id FROM productos WHERE sku = ?",
                [sku]
            );
  
            if (productoInfo.length === 0) {
                throw new Error(`No se encontró el producto con SKU: ${sku}`);
            }
  
            const idSku = productoInfo[0].id;
  
            await connection.query(
                "INSERT INTO opProductos (idOp, sku, cantidad, idSku) VALUES (?, ?, ?, ?)",
                [idOp, sku, cantidad, idSku]
            );
        }
  
        await connection.commit();
        res.status(201).json({ message: "Productos guardados correctamente", success: true });
    } catch (error) {
        console.error("Error al guardar los productos en opProductos:", error);
  
        if (connection) {
            await connection.rollback();
        }
  
        res.status(500).json({ 
            message: error.message || "Error interno del servidor", 
            success: false 
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
  },

  getListarOpProductos: async (req, res) => {
    const { idOp } = req.params;
    connection = await conn.getConnection();
    try {
      const [results] = await connection.query(
        "SELECT * FROM opProductos WHERE idOp = ? ORDER BY idSku",
        [idOp]
      );
      res.json(results);
    } catch (error) {
      console.error("Error al obtener los productos de la OP:", error);
      res.status(500).json({ message: "Error al obtener los productos de la OP" });
    } finally {
      if (connection) connection.release();
    }
  },

  getSku: async (req, res) => {
    const { idsProductos } = req.params;
    console.log('idsProductos recibidos:', idsProductos);
    
    connection = await conn.getConnection();
    try {
        // Convertir la cadena de IDs a un array
        const idsArray = idsProductos.split(',').map(id => parseInt(id.trim()));
        
        // Crear placeholders para cada ID
        const placeholders = idsArray.map(() => '?').join(',');
        
        const [results] = await connection.query(
            `SELECT id, sku FROM productos WHERE id IN (${placeholders})`,
            idsArray
        );
        
        console.log('Resultados de SKUs:', results);
        res.json(results);
    } catch (error) {
        console.error("Error al obtener los SKUs de los productos:", error);
        res.status(500).json({ message: "Error al obtener los SKUs de los productos" });
    } finally {
        if (connection) connection.release();
    }
  },

  // Actualizar cantidad de un producto existente en la OP
  postActualizarOp: async (req, res) => {
    const { idOp, productos } = req.body;
  const connection = await conn.getConnection();
  
  try {
    await connection.beginTransaction();

    // Procesar cada producto individualmente
    for (const producto of productos) {
      if (producto.idOpProducto) {
        // Actualizar producto existente
        await connection.query(
          `UPDATE opProductos 
           SET cantidad = ?
           WHERE id = ? AND idOp = ?`,
          [producto.cantidad, producto.idOpProducto, idOp]
        );
      } else {
        // Insertar nuevo producto
        await connection.query(
          `INSERT INTO opProductos (idOp, idSku, cantidad)
           VALUES (?, ?, ?)`,
          [idOp, producto.idSku, producto.cantidad]
        );
      }
    }

    await connection.commit();
    
    res.json({ 
      success: true,
      message: "Actualización selectiva completada",
      productosProcesados: productos.length
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error en actualización selectiva:", error);
    res.status(500).json({ 
      success: false,
      message: "Error en la actualización selectiva" 
    });
  } finally {
    connection.release();
  }
},

  // Agregar nuevo producto a la OP
  postAgregarProductoOp: async (req, res) => {
    const { idOp, idSku, cantidad } = req.body;
    const connection = await conn.getConnection();
        
    try {
          // Verificar si el producto ya existe en la OP
      const [existente] = await connection.query(
        `SELECT id FROM opProductos 
         WHERE idOp = ? AND idSku = ?`,
        [idOp, idSku]
      );
      
      if (existente.length > 0) {
        return res.status(400).json({
          success: false,
          message: "El producto ya existe en esta OP"
        });
      }
      
          // Insertar nuevo producto
          const [result] = await connection.query(
            `INSERT INTO opProductos (idOp, idSku, cantidad)
             VALUES (?, ?, ?)`,
            [idOp, idSku, cantidad]
          );
      
          res.json({
            success: true,
            insertId: result.insertId
          });
    } catch (error) {
      console.error("Error al agregar producto:", error);
      res.status(500).json({ success: false, message: "Error al agregar producto" });
    } finally {
      connection.release();
    }
  },

  // En tu archivo de controlador (opController.js)
eliminarProductoOp: async (req, res) => {
    const { idOp, idOpProducto } = req.body;
    const connection = await conn.getConnection();
    
    try {
      await connection.beginTransaction();
  
      const [result] = await connection.query(
        `DELETE FROM opProductos 
         WHERE idOp = ? AND id = ?`,
        [idOp, idOpProducto]
      );
  
      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Producto no encontrado en esta OP"
        });
      }
  
      await connection.commit();
      
      res.json({
        success: true,
        message: "Producto eliminado correctamente"
      });
    } catch (error) {
      await connection.rollback();
      console.error("Error eliminando producto:", error);
      res.status(500).json({ 
        success: false,
        message: "Error al eliminar producto" 
      });
    } finally {
      connection.release();
    }
  },

  
  
};

export default listarOp;