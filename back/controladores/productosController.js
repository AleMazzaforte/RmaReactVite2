import dotenv from "dotenv";
import { conn } from "../bd/bd.js";
import events from "events";
import { log } from "console";
events.EventEmitter.defaultMaxListeners = 15;

dotenv.config();

export const postCargarProducto = {
  postCargarProducto: async (req, res) => {
    const { sku, descripcion, marca, rubro, isActive, codigoBarras, pesoKgr, alto, ancho, largo } = req.body;

    let connection;
    try {
      connection = await conn.getConnection();

      // Verificar si el SKU ya existe
      const [existingProduct] = await connection.query(
        "SELECT sku FROM productos WHERE sku = ?",
        [sku]
      );

      if (existingProduct.length > 0) {
        return res
          .status(400)
          .json({ success: false, message: "El SKU ya existe" });
      }

      // Insertar el producto
      const [results] = await connection.query(
        "INSERT INTO productos (sku, descripcion, marca, rubro, isActive, codigoBarras, pesoKgr, alto, ancho, largo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [sku, descripcion, marca, rubro, isActive, codigoBarras, pesoKgr, alto, ancho, largo ]
      );

      if (results.affectedRows > 0) {
        res
          .status(201)
          .json({ success: true, message: "Producto cargado correctamente" });
      } else {
        res
          .status(500)
          .json({ success: false, message: "No se pudo cargar el producto" });
      }
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({
          success: false,
          message: "Error interno del servidor al cargar el producto",
        });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },

    postActualizarProductos: async (req, res) => {
    const { id, sku, descripcion, marca, rubro, isActive, codigoBarras, pesoKgr, alto, ancho, largo } = req.body;

    try {
      const results = await conn.query(
        "UPDATE productos SET sku = ?, descripcion = ?, marca = ?, rubro = ?, isActive = ?, codigoBarras = ?, pesoKgr = ?, alto = ?, ancho = ?, largo = ? WHERE id = ?",
        [sku, descripcion, marca, rubro, isActive, codigoBarras, pesoKgr, alto, ancho, largo, id]
      );
      if (results[0].affectedRows > 0) {
        res.status(201).json({ message: "Producto actualizado correctamente" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error al actualizar el producto" });
    }
  },

  // En tu archivo de rutas/controladores
postInactivarProducto: async (req, res) => {
  const { sku } = req.body;

  if (!sku) {
    return res.status(400).json({ message: "El campo 'sku' es requerido" });
  }

  try {
    const results = await conn.query(
      "UPDATE productos SET isActive = 0 WHERE sku = ?",
      [sku]
    );

    if (results[0].affectedRows > 0) {
      return res.status(200).json({ message: "Producto inactivado correctamente" });
    } else {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
  } catch (error) {
    console.error("Error al inactivar producto:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
},

  postELiminarProducto: async (req, res) => {
    const { sku } = req.params;
    try {
      const results = await conn.query("DELETE FROM productos WHERE sku = ?", [
        sku,
      ]);
      if (results[0].affectedRows > 0) {
        res.status(201).json({ message: "Producto eliminado correctamente" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error al eliminar el producto" });
    }
  },
 
  getListarProductos: async (req, res) => {
    const query =
      "SELECT id, sku, descripcion, marca, rubro, isActive, codigoBarras, pesoKgr, alto, ancho, largo FROM productos";
    let connection;

    try {
      // Obtiene una conexión del pool
      connection = await conn.getConnection();
      const [results] = await connection.query(query);
      res.json(results);
      
    } catch (error) {
      console.error("Error al listar productos:", error);
      res.status(500).send("Error al listar productos");
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },

};

export default postCargarProducto;
