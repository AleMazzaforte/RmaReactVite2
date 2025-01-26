import dotenv from "dotenv";
import { conn } from "../bd/bd.js";
import events from "events";
events.EventEmitter.defaultMaxListeners = 15;

dotenv.config();

// Definición de la función formatFecha
const formatFecha = (fecha) => {
  if (!fecha) {
    return ""; // Retorna una cadena vacía si la fecha es null o undefined
  }

  const date = new Date(fecha);
  if (isNaN(date.getTime())) {
    return ""; // Retorna una cadena vacía si la fecha no es válida
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Los meses en JavaScript van de 0 a 11
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const clienteController = {
  getListarClientesRma: async (req, res) => {
    try {
      const [clientes] = await conn.query("SELECT id, nombre FROM clientes");
      res.json(clientes); // Retorna los clientes en formato JSON
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error al listar los clientes" });
    }
  },
};

const productosGeneralController = {
  getListarProductos: async (req, res) => {
    const query = "SELECT id, sku, descripcion, marca, rubro FROM productos";
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

const listarMarcas = {
  getListarMarcas: async (req, res) => {
    try {
      const connection = await conn.getConnection();
      const [results] = await connection.query("SELECT * FROM marcas");
      connection.release();
      res.json(results);
    } catch (error) {
      console.error("Error al obtener las marcas:", error);
      res.status(500).send("Error al obtener las marcas");
    }
  },
};

const cargarRma = {
  postAgregarRma: async (req, res) => {
    // Desestructuración de los campos del cuerpo de la solicitud
    let {
      modelo,
      cantidad,
      marca,
      solicita,
      opLote,
      vencimiento,
      seEntrega,
      seRecibe,
      observaciones,
      nIngreso,
      nEgreso,
      idCliente,
    } = req.body;

    // Si los campos opcionales están vacíos, asignarlos como null
    opLote = opLote || null;
    vencimiento = vencimiento || null;
    seEntrega = seEntrega || null;
    seRecibe = seRecibe || null;
    observaciones = observaciones || null;
    nIngreso = nIngreso || null;
    nEgreso = nEgreso || null;

    let connection;
    try {
      connection = await conn.getConnection();
      // Inserción en la base de datos con valores null para los campos opcionales vacíos
      await connection.query(
        "INSERT INTO r_m_a (modelo, cantidad, marca, solicita, opLote, vencimiento, seEntrega, seRecibe, observaciones, nIngreso, nEgreso, idCliente) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          modelo,
          cantidad,
          marca,
          solicita,
          opLote,
          vencimiento,
          seEntrega,
          seRecibe,
          observaciones,
          nIngreso,
          nEgreso,
          idCliente,
        ]
      );
      res.status(200).json({ message: "RMA agregado correctamente" });
    } catch (error) {
      console.error("Error al agregar RMA:", error);
      res.status(500).json({ message: "Error al agregar RMA" });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },
};

const gestionarRma = {
  postActualizarCliente: async (req, res) => {
    const idRma = req.params.idRma;
    const {
      modelo,
      cantidad,
      marca,
      solicita,
      opLote,
      vencimiento,
      seEntrega,
      seRecibe,
      observaciones,
      nIngreso,
      nEgreso,
    } = req.body;
    let connection;
    try {
      connection = await conn.getConnection();
      const query = `
        UPDATE r_m_a
        SET modelo = ?, cantidad = ?, marca = ?, solicita = ?, opLote = ?, 
            vencimiento = ?, seEntrega = ?, seRecibe = ?, observaciones = ?, 
            nIngreso = ?, nEgreso = ?
        WHERE idRma = ?`;
      const [result] = await connection.execute(query, [
        modelo,
        cantidad,
        marca,
        solicita,
        opLote,
        vencimiento,
        seEntrega,
        seRecibe,
        observaciones,
        nIngreso,
        nEgreso,
        idRma,
      ]);

      if (result.affectedRows > 0) {
        res.status(200).json({
          success: true,
          message: "Producto actualizado correctamente.",
        });
      } else {
        res
          .status(404)
          .json({ success: false, message: "Producto no encontrado." });
      }
    } catch (error) {
      console.error("Error al actualizar producto:", error);
      res
        .status(500)
        .json({ success: false, message: "Error al actualizar producto." });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },

  deleteRma: async (req, res) => {
    const idRma = req.params.idRma;
    let connection;
    try {
      connection = await conn.getConnection();
      const query = "DELETE FROM r_m_a WHERE idRma = ?";
      const [result] = await connection.execute(query, [idRma]);

      if (result.affectedRows > 0) {
        res
          .status(200)
          .json({ success: true, message: "RMA eliminado correctamente." });
      } else {
        res.status(404).json({ success: false, message: "RMA no encontrado." });
      }
    } catch (error) {
      console.error("Error al eliminar RMA:", error);
      res
        .status(500)
        .json({ success: false, message: "Error al eliminar RMA." });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },

  getListarProductosRma: async (req, res) => {
    const idCliente = req.params.idCliente;

    const obtenerProductosPorCliente = async (idCliente) => {
      const query = `
      SELECT idRma, modelo, cantidad, marca, solicita, opLote, vencimiento, 
        seEntrega, seRecibe, observaciones, nIngreso, nEgreso 
      FROM r_m_a 
      WHERE idCliente = ?`;

      try {
        const [rows] = await conn.execute(query, [idCliente]);
        return rows;
      } catch (executeError) {
        console.error("Error en la ejecución de la consulta:", executeError);
        throw executeError;
      }
    };

    let connection;

    try {
      connection = await conn.getConnection();

      let productos = await obtenerProductosPorCliente(idCliente);

      productos = productos.map((producto) => ({
        modelo: producto.modelo || "",
        cantidad: producto.cantidad || "",
        marca: producto.marca || "",
        solicita: formatFecha(producto.solicita) || "",
        opLote: producto.opLote || "",
        vencimiento: formatFecha(producto.vencimiento || ""),
        seEntrega: formatFecha(producto.seEntrega) || "",
        seRecibe: formatFecha(producto.seRecibe) || "",
        observaciones: producto.observaciones || "",
        nIngreso: producto.nIngreso || "",
        nEgreso: producto.nEgreso || "",
        idRma: producto.idRma || "",
      }));

      res.json(productos);
    } catch (error) {
      console.error("Error al listar productos:", error);
      res.status(500).json({ error: "Error al listar productos" });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },
};

export {
  clienteController,
  productosGeneralController,
  listarMarcas,
  cargarRma,
  gestionarRma,
};
