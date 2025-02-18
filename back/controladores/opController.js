import dotenv from "dotenv";
import { conn } from "../bd/bd.js";
import events from "events";
events.EventEmitter.defaultMaxListeners = 15;

dotenv.config();



const listarOp = {
  getListarOp: async (req, res) => {
    try {
      const connection = await conn.getConnection();
      const [results] = await connection.query("SELECT op FROM OP ORDER BY op ASC");
      connection.release();
      res.json(results);
      
    } catch (error) {
      console.error("Error al obtener las Op:", error);
      res.status(500).send("Error al obtener las Op");
    }
  },

  postGuardarOp: async (req, res) => {
    const { op, fechaIngreso, productos } = req.body;
    console.log('req.body', req.body);
  
    if (!op || !fechaIngreso || !productos || productos.length === 0) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }
  
    const connection = await conn.getConnection();
    await connection.beginTransaction();
  
    try {
      // Insertar cada producto en la OP
      for (const item of productos) {
        const productoId = item.producto?.id; // Validación extra
        const cantidad = item.cantidad;
  
        if (!productoId || !cantidad) {
          throw new Error("Falta el ID del producto o la cantidad");
        }
  
        await connection.query(
          "INSERT INTO OP (op, producto, cantidad, fechaIngreso) VALUES (?, ?, ?, ?)",
          [op, productoId, cantidad, fechaIngreso]
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