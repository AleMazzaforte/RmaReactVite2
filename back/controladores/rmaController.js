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

const convertirFechaParaBackend = (fecha) => {
  if (!fecha) return null; // Si es null o undefined, retorna null

  const partes = fecha.split("/");
  if (partes.length !== 3) return null; // Verifica que tenga tres partes (dd/mm/aaaa)

  const [dia, mes, anio] = partes;
  return `${anio}-${mes}-${dia}`; // Retorna en formato aaaa/mm/dd
};


const clienteController = {
  getListarClientesRma: async (req, res) => {
    try {
      const [clientes] = await conn.query("SELECT id, nombre FROM clientes ORDER BY nombre ASC");
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
      connection.release();
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

  getUltimoNum: async (req, res) => {
    let ultimoNIngreso
    try {
      const [rows] = await conn.query("SELECT MAX(nIngreso) AS ultimoNIngreso FROM r_m_a");
      console.log('ultimo numero', ultimoNIngreso)
      if (rows.length > 0 && rows[0].ultimoNIngreso !== null) {
        res.json({ nIngreso: rows[0].ultimoNIngreso });
      } else {
        res.json({ nIngreso: 0 }); // Si no hay registros, devolver 0
      }
    } catch (error) {
      console.error("Error al obtener el último número de ingreso:", error);
      res.status(500).json({ error: "Error al obtener el último número de ingreso" });
    }
  }
};

const gestionarRma = {
  postActualizarCliente: async (req, res) => {
    const idRma = req.params.idRma;
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
    } = req.body;
  
    // Cambio de formato de fecha
    solicita = convertirFechaParaBackend(solicita);
    vencimiento = convertirFechaParaBackend(vencimiento);
    seEntrega = convertirFechaParaBackend(seEntrega);
    seRecibe = convertirFechaParaBackend(seRecibe);
  
    let connection;
    try {
      connection = await conn.getConnection();
  
      // Obtener el ID del modelo (producto) a partir del SKU
      const [producto] = await connection.execute(
        'SELECT id FROM productos WHERE sku = ?',
        [modelo]
      );
  
      if (producto.length === 0) {
        throw new Error('Modelo no encontrado');
      }
  
      const productoId = producto[0].id;
  
      // Obtener el ID de la marca a partir del nombre
      const [marcaResult] = await connection.execute(
        'SELECT id FROM marcas WHERE nombre = ?',
        [marca]
      );
  
      if (marcaResult.length === 0) {
        throw new Error('Marca no encontrada');
      }
  
      const marcaId = marcaResult[0].id;
  
      const query = `
        UPDATE r_m_a
        SET modelo = ?, cantidad = ?, marca = ?, solicita = ?, opLote = ?, 
            vencimiento = ?, seEntrega = ?, seRecibe = ?, observaciones = ?, 
            nIngreso = ?, nEgreso = ?
        WHERE idRma = ?`;
  
      const [result] = await connection.execute(query, [
        productoId,
        cantidad,
        marcaId,
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
      SELECT rma.idRma, p.sku AS modelo_sku, rma.cantidad, m.nombre AS marca_nombre, 
             rma.solicita, rma.opLote, rma.vencimiento, rma.seEntrega, rma.seRecibe, 
             rma.observaciones, rma.nIngreso, rma.nEgreso 
      FROM r_m_a rma
      JOIN productos p ON rma.modelo = p.id
      JOIN marcas m ON rma.marca = m.id
      WHERE rma.idCliente = ?`;
  
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
        modelo: producto.modelo_sku || "",  // Asegúrate de que el `sku` está siendo tomado correctamente
        cantidad: producto.cantidad || "",
        marca: producto.marca_nombre || "",  // Asegúrate de que el nombre de la marca está siendo tomado correctamente
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
  
  cargarRma,
  gestionarRma,
};
