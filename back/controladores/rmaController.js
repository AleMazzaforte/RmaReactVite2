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
      const [clientes] = await conn.query(
        "SELECT id, nombre FROM clientes ORDER BY nombre ASC"
      );
      res.json(clientes); // Retorna los clientes en formato JSON
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error al listar los clientes" });
    }
  },
};

const productosGeneralController = {
  getListarProductos: async (req, res) => {
    const query =
      "SELECT id, sku, descripcion, marca, rubro, isActive FROM productos";
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

const cargarRma = {
  postAgregarRma: async (req, res) => {
    const {
      cliente,
      solicita,
      vencimiento,
      seEntrega,
      seRecibe: seRecibeGlobal, // ← Renombramos para evitar conflicto
      observaciones,
      nIngreso,
      nEgreso,
      productos,
    } = req.body;

    let connection;
    try {
      connection = await conn.getConnection();

      for (const producto of productos) {
        const {
          modelo,
          cantidad,
          marca,
          opLote: productoOpLote,
          observaciones: productoObservaciones,
          vencimiento: vencimientoProducto,
          seEntrega: seEntregaProducto,
          seRecibe: seRecibeProducto, // ← Fecha de recepción del producto
          nEgreso: nEgresoProducto,
        } = producto;

        // ✅ Calcular enExistencia: false si seRecibe está vacío, true si tiene valor
        const seRecibeFinal = seRecibeProducto || seRecibeGlobal || null;
        const enExistencia = !!(seRecibeFinal && seRecibeFinal.trim() !== "");

        await connection.query(
          `INSERT INTO r_m_a 
        (modelo, cantidad, marca, solicita, opLote, vencimiento, seEntrega, seRecibe, observaciones, nIngreso, nEgreso, idCliente, enExistencia) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            modelo,
            cantidad,
            marca,
            solicita,
            productoOpLote,
            vencimientoProducto || vencimiento || null,
            seEntregaProducto || seEntrega || null,
            seRecibeFinal,
            productoObservaciones || observaciones || null,
            nIngreso,
            nEgresoProducto || nEgreso || null,
            cliente,
            enExistencia,
          ]
        );
      }

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
    try {
      const [rows] = await conn.query(
        "SELECT MAX(nIngreso) AS ultimoNIngreso FROM r_m_a"
      );
      if (rows.length > 0 && rows[0].ultimoNIngreso !== null) {
        res.json({ nIngreso: rows[0].ultimoNIngreso });
      } else {
        res.json({ nIngreso: 0 });
      }
    } catch (error) {
      console.error("Error al obtener el último número de ingreso:", error);
      res
        .status(500)
        .json({ error: "Error al obtener el último número de ingreso" });
    }
  },
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

    // ✅ Calcular enExistencia: true si seRecibe tiene fecha válida, false si no
    const enExistencia = !!seRecibe && seRecibe.trim() !== "" && !isNaN(new Date(seRecibe).getTime());

    let connection;
    try {
      connection = await conn.getConnection();

      // Obtener el ID del modelo (producto) a partir del SKU
      const [producto] = await connection.execute(
        "SELECT id FROM productos WHERE sku = ?",
        [modelo]
      );

      if (producto.length === 0) {
        throw new Error("Modelo no encontrado");
      }

      const productoId = producto[0].id;

      // Obtener el ID de la marca a partir del nombre
      const [marcaResult] = await connection.execute(
        "SELECT id FROM marcas WHERE nombre = ?",
        [marca]
      );

      if (marcaResult.length === 0) {
        throw new Error("Marca no encontrada");
      }

      const marcaId = marcaResult[0].id;

      // Obtener el ID de la op a partir del nombre
      const [opResult] = await connection.execute(
        "SELECT id FROM OP WHERE nombre = ?",
        [opLote]
      );

      if (opResult.length === 0) {
        throw new Error("OP no encontrada");
      }

      const opId = opResult[0].id;

      const query = `
      UPDATE r_m_a
      SET modelo = ?, cantidad = ?, marca = ?, solicita = ?, opLote = ?, 
          vencimiento = ?, seEntrega = ?, seRecibe = ?, observaciones = ?, 
          nIngreso = ?, nEgreso = ?, enExistencia = ?  
      WHERE idRma = ?`;

      const [result] = await connection.execute(query, [
        productoId,
        cantidad,
        marcaId,
        solicita,
        opId,
        vencimiento,
        seEntrega,
        seRecibe,
        observaciones,
        nIngreso,
        nEgreso,
        enExistencia,
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
        SELECT 
          rma.idRma, 
          p.sku AS modelo_sku, 
          rma.cantidad, 
          m.nombre AS marca_nombre, 
          rma.solicita, 
          OP.nombre AS opLote_nombre,  -- Cambiamos opLote por el nombre de la OP
          rma.vencimiento, 
          rma.seEntrega, 
          rma.seRecibe, 
          rma.observaciones, 
          rma.nIngreso, 
          rma.nEgreso 
        FROM r_m_a rma
        JOIN productos p ON rma.modelo = p.id
        JOIN marcas m ON rma.marca = m.id
        LEFT JOIN OP ON rma.opLote = OP.id  -- Hacemos un JOIN con la tabla OP
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
        modelo: producto.modelo_sku || "", // Asegúrate de que el `sku` está siendo tomado correctamente
        cantidad: producto.cantidad || "",
        marca: producto.marca_nombre || "", // Asegúrate de que el nombre de la marca está siendo tomado correctamente
        solicita: formatFecha(producto.solicita) || "",
        opLote: producto.opLote_nombre || "", // Usamos el nombre de la OP
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

  // actualizar SOLO opLote por idRma
  postActualizarOpPorSku: async (req, res) => {
    const idRma = req.params.idRma; // ← ID del registro a actualizar
    const { opLote } = req.body;    // ← Nueva OP (nombre, no ID)

    let connection;
    try {
      connection = await conn.getConnection();

      // Obtener el ID de la OP a partir de su nombre
      const [opResult] = await connection.execute(
        "SELECT id FROM OP WHERE nombre = ?",
        [opLote]
      );

      if (opResult.length === 0) {
        return res.status(404).json({ error: `OP no encontrada: ${opLote}` });
      }

      const opId = opResult[0].id;

      // Actualizar SOLO el campo opLote del registro específico
      const [result] = await connection.execute(
        "UPDATE r_m_a SET opLote = ? WHERE idRma = ?",
        [opId, idRma]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Registro no encontrado" });
      }

      res.status(200).json({
        success: true,
        message: "OP actualizada correctamente.",
      });
    } catch (error) {
      console.error("Error al actualizar OP:", error);
      res.status(500).json({ error: "Error al actualizar OP" });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },

  getRmaNoEntregados: async (req, res) => {
    let connection;
    try {
      connection = await conn.getConnection();

      // Consulta: obtenemos los RMA no entregados (seEntrega y nEgreso = NULL)
      // Ordenamos por cliente (c.nombre) y luego por modelo para consistencia
      const query = `
      SELECT 
        rma.idRma,
        p.sku AS modelo_sku,
        rma.cantidad,
        m.nombre AS marca_nombre,
        c.nombre AS cliente_nombre,
        rma.solicita,
        OP.nombre AS opLote_nombre,
        rma.vencimiento,
        rma.seEntrega,
        rma.seRecibe,
        rma.observaciones,
        rma.nIngreso,
        rma.nEgreso
      FROM r_m_a rma
      JOIN productos p ON rma.modelo = p.id
      JOIN marcas m ON rma.marca = m.id
      JOIN clientes c ON rma.idCliente = c.id
      LEFT JOIN OP ON rma.opLote = OP.id
      WHERE rma.seEntrega IS NULL 
        AND rma.nEgreso IS NULL
      ORDER BY c.nombre ASC, p.sku ASC
    `;

      const [rows] = await connection.execute(query);

      // Agrupamos los resultados por cliente_nombre
      const agrupados = {};
      rows.forEach((item) => {
        const cliente = item.cliente_nombre || "Cliente sin nombre";
        if (!agrupados[cliente]) {
          agrupados[cliente] = [];
        }
        agrupados[cliente].push({
          idRma: item.idRma || "",
          modelo: item.modelo_sku || "",
          cantidad: item.cantidad || "",
          marca: item.marca_nombre || "",
          solicita: formatFecha(item.solicita) || "",
          opLote: item.opLote_nombre || "",
          vencimiento: formatFecha(item.vencimiento) || "",
          seEntrega: formatFecha(item.seEntrega) || "",
          seRecibe: formatFecha(item.seRecibe) || "",
          observaciones: item.observaciones || "",
          nIngreso: item.nIngreso || "",
          nEgreso: item.nEgreso || "",
        });
      });

      // Convertimos el objeto en un array de { cliente, rmas }
      const resultado = Object.keys(agrupados)
        .sort() // Aseguramos orden alfabético (aunque ya venga ordenado)
        .map(cliente => ({
          cliente,
          rmas: agrupados[cliente]
        }));

      res.json(resultado);
    } catch (error) {
      console.error("Error al obtener RMA no entregados agrupados:", error);
      res.status(500).json({ error: "Error al cargar los RMA pendientes de entrega" });
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
