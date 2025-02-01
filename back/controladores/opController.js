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
};

export default listarOp;