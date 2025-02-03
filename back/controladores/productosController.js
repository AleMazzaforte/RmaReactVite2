import dotenv from "dotenv";
import { conn } from "../bd/bd.js";
import events from "events";
events.EventEmitter.defaultMaxListeners = 15;

dotenv.config();



export const postCargarProducto = {   
    postCargarProducto: async (req, res) => {
        const { sku, descripcion, marca, rubro } = req.body;        
        try {
           const results = await conn.query(
                "INSERT INTO productos (sku, descripcion, marca, rubro) VALUES (?, ?, ?, ?)",
                [sku, descripcion, marca, rubro]
            );
            if (results[0].affectedRows > 0) {                
                res.status(201).json({ message: "Producto cargado correctamente" });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al cargar el producto" });
        }
    },
    postActualizarProductos: async (req, res) => {
        const { sku, descripcion, marca, rubro } = req.body;  
        console.log('req.body en actualizarproductos', req.body);      
        try {
           const results = await conn.query(
                "UPDATE productos SET descripcion = ?, marca = ?, rubro = ? WHERE sku = ?",
                [descripcion, marca, rubro, sku]
            );
            if (results[0].affectedRows > 0) {                
                res.status(201).json({ message: "Producto actualizado correctamente" });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al actualizar el producto" });
        }
    },

    postELiminarProducto: async (req, res) => {
        const { sku } = req.params;     
        try {
           const results = await conn.query(
                "DELETE FROM productos WHERE sku = ?",
                [sku]
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

export default postCargarProducto;