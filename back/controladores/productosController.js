import dotenv from "dotenv";
import { conn } from "../bd/bd.js";
import events from "events";

events.EventEmitter.defaultMaxListeners = 15;
dotenv.config();

export const postCargarProducto = {
  
  postCargarProducto: async (req, res) => {
    const { sku, descripcion, marca, rubro, isActive, codigoBarras, pesoKgr, alto, ancho, largo } = req.body;

    try {
      // 1. Verificar si el SKU ya existe
      const [existingProduct] = await conn.query(
        "SELECT sku FROM productos WHERE sku = ?",
        [sku]
      );

      if (existingProduct.length > 0) {
        return res.status(400).json({ success: false, message: "El SKU ya existe" });
      }

      // 2. Insertar el producto
      const [results] = await conn.query(
        "INSERT INTO productos (sku, descripcion, marca, rubro, isActive, codigoBarras, pesoKgr, alto, ancho, largo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [sku, descripcion, marca, rubro, isActive, codigoBarras, pesoKgr, alto, ancho, largo]
      );

      if (results.affectedRows > 0) {
        return res.status(201).json({ success: true, message: "Producto cargado correctamente" });
      } else {
        return res.status(500).json({ success: false, message: "No se pudo cargar el producto" });
      }
    } catch (error) {
      console.error("Error al cargar producto:", error);
      return res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
  },

  postActualizarProductos: async (req, res) => {
    const { id, sku, descripcion, marca, rubro, isActive, codigoBarras, pesoKgr, alto, ancho, largo } = req.body;

    try {
      const [results] = await conn.query(
        "UPDATE productos SET sku = ?, descripcion = ?, marca = ?, rubro = ?, isActive = ?, codigoBarras = ?, pesoKgr = ?, alto = ?, ancho = ?, largo = ? WHERE id = ?",
        [sku, descripcion, marca, rubro, isActive, codigoBarras, pesoKgr, alto, ancho, largo, id]
      );
      
      if (results.affectedRows > 0) {
        return res.status(200).json({ success: true, message: "Producto actualizado correctamente" });
      } else {
        // IMPORTANTE: Responder si no se encontró el ID
        return res.status(404).json({ success: false, message: "Producto no encontrado o sin cambios" });
      }
    } catch (error) {
      console.error("Error al actualizar producto:", error);
      return res.status(500).json({ success: false, message: "Error al actualizar el producto" });
    }
  },

  postInactivarProducto: async (req, res) => {
    const { sku } = req.body;

    if (!sku) {
      return res.status(400).json({ success: false, message: "El campo 'sku' es requerido" });
    }

    try {
      const [results] = await conn.query(
        "UPDATE productos SET isActive = 0 WHERE sku = ?",
        [sku]
      );

      if (results.affectedRows > 0) {
        return res.status(200).json({ success: true, message: "Producto inactivado correctamente" });
      } else {
        return res.status(404).json({ success: false, message: "Producto no encontrado" });
      }
    } catch (error) {
      console.error("Error al inactivar producto:", error);
      return res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
  },

  postELiminarProducto: async (req, res) => {
    // NOTA: Aquí usas req.params. Asegúrate que en tu ruta sea: router.delete('/productos/:sku')
    // Si tu ruta espera el SKU por body, cámbialo a: const { sku } = req.body;
    const { sku } = req.params; 
    
    try {
      const [results] = await conn.query("DELETE FROM productos WHERE sku = ?", [sku]);
      
      if (results.affectedRows > 0) {
        return res.status(200).json({ success: true, message: "Producto eliminado correctamente" });
      } else {
        return res.status(404).json({ success: false, message: "Producto no encontrado" });
      }
    } catch (error) {
      console.error("Error al eliminar producto:", error);
      return res.status(500).json({ success: false, message: "Error al eliminar el producto" });
    }
  },
 
  getListarProductos: async (req, res) => {
    const query = "SELECT id, sku, descripcion, marca, rubro, isActive, codigoBarras, pesoKgr, alto, ancho, largo FROM productos";

    try {
      const [results] = await conn.query(query);
      return res.status(200).json(results);
    } catch (error) {
      console.error("Error al listar productos:", error);
      return res.status(500).json({ success: false, message: "Error al listar productos" });
    }
  },

};

export default postCargarProducto;