import dotenv from "dotenv";
import { conn } from "../bd/bd.js";
import events from "events";
events.EventEmitter.defaultMaxListeners = 15;

dotenv.config();

const marcas = {
    getListarMarcas: async (req, res) => {
        let connection = await conn.getConnection();
      try {
        
        const [results] = await connection.query("SELECT * FROM marcas");
        connection.release();
        //console.log("Marcas:", results);
        res.json(results);
        
      } catch (error) {
        console.error("Error al obtener las marcas:", error);
        res.status(500).send("Error al obtener las marcas");
      } finally {
        if (connection) {
            connection.release();
        }
      }
    },

    postCargarMarca: async (req, res) => {
        const marcaNueva = req.body;
        let connection = await conn.getConnection();
        try {
          
          const [marca] = await connection.query("INSERT INTO marcas SET ?", marcaNueva);
          if (marca.affectedRows === 1) {
            res.json(marca);
          } else {
            res.status(500).json({ message: 'No se pudo insertar la nueva marca' });
          }
        } catch (error) {
          console.error('Error al cargar la marca', error);
          res.status(500).json({ message: 'Error al cargar la marca' });
        } finally {
          if (connection) { 
            connection.release()
            };
        }
      }
      
};




  export {
    marcas
  }