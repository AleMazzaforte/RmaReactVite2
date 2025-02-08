import dotenv from "dotenv";
import { conn } from "../bd/bd.js";
import events from "events";
events.EventEmitter.defaultMaxListeners = 15;

dotenv.config();

const etiquetas = {
  // Controlador para buscar en la tabla r_m_a
  getBuscarRma: async (req, res) => {
    const { idCliente } = req.query; // Obtener el idCliente de la consulta

    if (!idCliente) {
      return res.status(400).json({ message: "El parámetro idCliente es requerido." });
    }

    try {
      // Consultar la tabla r_m_a para buscar filas con el idCliente proporcionado
      const [results] = await conn.query(
        "SELECT * FROM r_m_a WHERE idCliente = ? AND (nEgreso IS NULL OR nEgreso = '')",
        [idCliente]
      );

      // Verificar si hay filas con nEgreso vacío o nulo
      if (results.length > 0) {
        return res.status(200).json(results); // Devolver las filas encontradas
      } else {
        return res.status(200).json([]); // Devolver un array vacío si no hay filas
      }
    } catch (error) {
      console.error("Error al buscar en la tabla r_m_a:", error);
      return res.status(500).json({ message: "Error al buscar en la tabla r_m_a." });
    }
  },
};

export default etiquetas;