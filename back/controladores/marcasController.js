import dotenv from "dotenv";
import { conn } from "../bd/bd.js";
import events from "events";
events.EventEmitter.defaultMaxListeners = 15;

dotenv.config();

const marcas = {
    getListarMarcas: async (req, res) => {
        let connection = await conn.getConnection();
      try {
        
        const [results] = await connection.query("SELECT id, nombre FROM marcas ORDER By nombre ASC");
        
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
              res.status(201).json({ success: true, data: marca });
          } else {
              res.status(500).json({ success: false, message: 'No se pudo insertar la nueva marca' });
          }
      } catch (error) {
          console.error('Error al cargar la marca', error);
  
          // Manejo de errores específicos
          if (error.code === 'ER_DUP_ENTRY') {
              res.status(400).json({ success: false, message: 'La marca ya existe' });
          } else if (error.code === 'ER_NO_REFERENCED_ROW') {
              res.status(400).json({ success: false, message: 'Referencia inválida en los datos' });
          } else {
              res.status(500).json({ success: false, message: 'Error interno del servidor' });
          }
      } finally {
          if (connection) {
              connection.release();
          }
      }
  },

  postActualizarMarca: async (req, res) => {
    const { id, nombre } = req.body;
   

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
            return res.status(404).json({ success: false, message: "Marca no encontrada" });
        }

        const nombreOriginal = marcaActual[0].nombre;

        // Validar si el nombre es el mismo
        if (nombreOriginal === nombre) {
            return res.status(400).json({ success: false, message: "El nuevo nombre no puede ser igual al original" });
        }

        // Actualizar la marca si el nombre es diferente
        const [resultado] = await connection.query(
            "UPDATE marcas SET nombre = ? WHERE id = ?",
            [nombre, id]
        );

        if (resultado.affectedRows === 1) {
            res.json({ success: true, message: "Marca actualizada correctamente" });
        } else {
            res.status(500).json({ success: false, message: "No se pudo actualizar la marca" });
        }

    } catch (error) {
        console.error("Error al actualizar la marca:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor al actualizar la marca" });
    } finally {
        if (connection) {
            connection.release();
        }
    }
  },

  postEliminarMarca: async (req, res) => {
    const { id } = req.body; // Obtener el ID de la marca a eliminar

    let connection;
    try {
        connection = await conn.getConnection(); // Obtener una conexión del pool

        // Verificar si la marca existe antes de intentar eliminarla
        const [marca] = await connection.query(
            "SELECT id FROM marcas WHERE id = ?", 
            [id]
        );

        if (!marca || marca.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Marca no encontrada" 
            });
        }

        // Eliminar la marca
        const [resultado] = await connection.query(
            "DELETE FROM marcas WHERE id = ?",
            [id]
        );

        // Verificar si la marca fue eliminada correctamente
        if (resultado.affectedRows === 1) {
            res.json({ 
                success: true, 
                message: "Marca eliminada correctamente" 
            });
        } else {
            res.status(500).json({ 
                success: false, 
                message: "No se pudo eliminar la marca" 
            });
        }
    } catch (error) {
        console.error("Error al eliminar la marca:", error);
        res.status(500).json({ 
            success: false, 
            message: "Error interno del servidor al eliminar la marca" 
        });
    } finally {
        if (connection) {
            connection.release(); // Liberar la conexión al pool
        }
    }
  }
      
};




  export {
    marcas
  }