import dotenv from "dotenv";
import { conn } from "../bd/bd.js";
import events from "events";
events.EventEmitter.defaultMaxListeners = 15;

dotenv.config();



export const transportes = {
    postCargarTransporte: async (req, res) => {
        const { nombre, direccionLocal, telefono } = req.body;

        let connection;
        try {
            connection = await conn.getConnection();

            // Insertar el producto
            const [results] = await connection.query(
                "INSERT INTO transportes (nombre, direccionLocal, telefono) VALUES (?, ?, ?)",
                [nombre, direccionLocal, telefono]
            );

            if (results.affectedRows > 0) {
                res.status(201).json({ success: true, message: "Transporte cargado correctamente" });
            } else {
                res.status(500).json({ success: false, message: "No se pudo cargar el transporte" });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: "Error interno del servidor al cargar el transporte" });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    },

    getBuscarTransporte: async (req, res) => {
        
        try {
            const query = req.query.query;
            const [results] = await conn.query(
                "SELECT * FROM transportes",                
            );
            res.status(200).json(results);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al buscar el transporte" });

        }
    },

    postActualizarTransporte: async (req, res) => {
        const { id, nombre, direccionLocal, telefono} = req.body;   
        console.log(req.body);     
        try {
           const results = await conn.query(
                "UPDATE transportes SET nombre = ?, direccionLocal = ?, telefono = ? WHERE idTransporte = ?",
                [nombre, direccionLocal, telefono, id]
            );
            if (results[0].affectedRows > 0) {                
                res.status(201).json({ message: "Producto actualizado correctamente" });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al actualizar el producto" });
        }
    },
    postEliminarTransporte: async (req, res) => {
        const { id } = req.body;     console.log(req.body);
        try {
           const results = await conn.query(
                "DELETE FROM transportes WHERE idTransporte = ?",
                [id]
            );
            if (results[0].affectedRows > 0) {                
                res.status(201).json({ message: "Producto eliminado correctamente" });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al eliminar el producto" });
        }
    }

};

export default transportes;





 