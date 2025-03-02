import dotenv from "dotenv";
import { conn } from "../bd/bd.js";
import events from "events";
events.EventEmitter.defaultMaxListeners = 15;

dotenv.config();



const listarOp = {
  
  getListarOp: async (req, res) => {
    const { query } = req.params; // Obtener el parámetro de búsqueda desde la ruta

    try {
      const connection = await conn.getConnection();

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
      connection.release();
    } catch (error) {
      console.error("Error al obtener las OPs:", error);
      res.status(500).json({ error: "Error al obtener las OPs." });
    }
  },

  postGuardarOp: async (req, res) => {
    const { nombre, fechaIngreso, productos } = req.body;
  
    if (!nombre || !fechaIngreso || !productos || productos.length === 0) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }
  
    const connection = await conn.getConnection();
    await connection.beginTransaction();
  
    try {
      // Insertar cada producto en la nombre
      for (const item of productos) {
        const productoId = item.producto?.id; // Validación extra
        const cantidad = item.cantidad;
  
        if (!productoId || !cantidad) {
          throw new Error("Falta el ID del producto o la cantidad");
        }
  
        await connection.query(
          "INSERT INTO OP (nombre, producto, cantidad, fechaIngreso) VALUES (?, ?, ?, ?)",
          [nombre, productoId, cantidad, fechaIngreso]
        );
      }
  
      await connection.commit();
      connection.release();
  
      res.status(201).json({ message: "OP guardada correctamente" });
    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error("Error al guardar la OP:", error);
      res.status(500).json({ error: "Error al guardar la OP" });
    }
  },
  
};

export default listarOp;