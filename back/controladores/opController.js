import dotenv from "dotenv";
import { conn } from "../bd/bd.js";
import events from "events";
events.EventEmitter.defaultMaxListeners = 15;

dotenv.config();



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
      console.log('results', results);
            
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
    let connection;
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
    let connection;
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
  }

  
  
};

export default listarOp;