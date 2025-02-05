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
      },

      postActualizarMarca: async (req, res) => {
        const { id, nombre } = req.body;
        console.log("Datos recibidos para actualizar:", req.body);
    
        let connection;
        try {
            connection = await conn.getConnection();
    
            // Obtener la marca actual desde la base de datos
            const [marcaActual] = await connection.query(
                "SELECT nombre FROM marcas WHERE id = ?", 
                [id]
            );
    
            // Comprobar si la marca existe
            if (!marcaActual || marcaActual.length === 0) {
                return res.status(404).json({ message: "Marca no encontrada" });
            }
    
            const nombreOriginal = marcaActual[0].nombre;
    
            // Validar si el nombre es el mismo
            if (nombreOriginal === nombre) {
                return res.status(400).json({ message: "El nuevo nombre no puede ser igual al original" });
            }
    
            // Actualizar la marca si el nombre es diferente
            const [resultado] = await connection.query(
                "UPDATE marcas SET nombre = ? WHERE id = ?",
                [nombre, id]
            );
    
            if (resultado.affectedRows === 1) {
                res.json({ message: "Marca actualizada correctamente" });
            } else {
                res.status(500).json({ message: "No se pudo actualizar la marca" });
            }
    
        } catch (error) {
            console.error("Error al actualizar la marca:", error);
            res.status(500).json({ message: "Error al actualizar la marca" });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }
      
};




  export {
    marcas
  }