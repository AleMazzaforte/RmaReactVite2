import { conn } from "../bd/bd.js";

let conection;
export const productosConDescuentoController = {
  getProductosConDescuento: async (req, res) => {
    try {
      //const uno = 1;
      conection = await conn.getConnection();
      const [rows] = await conection.query(
        `SELECT id, sku, totalUnidadesConDescuento
        FROM productos
        WHERE conDescuento = 1`
      );
      res.json(rows);
      //const rowsRespondidas = res.json();
    } catch (error) {
      console.error("Error fetching productos con descuento:", error);
      res
        .status(500)
        .json({ error: "Error al obtener los productos con descuento" });
    } finally {
      if (conection) {
        conection.release();
      }
    }
  },

  getProductosConDescuentoVendidos: async (req, res) => {
    try {
      conection = await conn.getConnection();
      const [rowsvendidos] = await conection.query(
        `SELECT idVendido, idSku, canalVenta, numeroOperacion, cantidad, fecha, sku
            FROM ventasConDescuento
            LEFT JOIN productos ON ventasConDescuento.idSku = productos.id
            Order BY sku `
      );
     
      res.json(rowsvendidos);
    } catch (error) {
      console.error("Error fetching productos con descuento vendidos:", error);
      res
        .status(500)
        .json({
          error: "Error al obtener los productos con descuento vendidos",
        });
    } finally {
      if (conection) {
        conection.release();
      }
    }
  },

  postGuardarVentasConDescuento: async (req, res) => {
    
  let connection;
  try {
    const ventas = Array.isArray(req.body) ? req.body : [req.body];
  
    
    if (ventas.length === 0) {
      return res.status(400).json({ error: "No se enviaron ventas" });
    }

    // Validar campos obligatorios
    for (const venta of ventas) {
      const { idSku, canalVenta, numeroOperacion, cantidad, fecha } = venta;
      if (idSku == null || canalVenta == null || numeroOperacion == null || cantidad == null || fecha == null) {
        return res.status(400).json({ error: "Faltan campos obligatorios en una de las ventas" });
      }
    }

    connection = await conn.getConnection();

    const numerosOperacion = [...new Set(ventas.map(v => v.numeroOperacion))]; // Evitar repetidos innecesarios


    if (numerosOperacion.length > 0) {
      const placeholders = numerosOperacion.map(() => '?').join(',');
      const [existingRows] = await connection.query(
        `SELECT DISTINCT numeroOperacion FROM ventasConDescuento WHERE numeroOperacion IN (${placeholders})`,
        numerosOperacion
      );

      const existingNumeros = new Set(existingRows.map(row => row.numeroOperacion));

      // Filtrar: solo mantener ventas cuyo numeroOperacion NO exista en la base
      let ventasFiltradas = ventas.filter(venta => !existingNumeros.has(venta.numeroOperacion));


      if (ventasFiltradas.length === 0) {
        return res.status(200).json({
          message: "Todas las operaciones ya estaban registradas. Ninguna fue insertada.",
          count: 0,
          skipped: ventas.length
        });
      }

      const values = [];
      const insertPlaceholders = [];

      for (const venta of ventasFiltradas) {
        const { idSku, canalVenta, numeroOperacion, cantidad, fecha } = venta;
        insertPlaceholders.push("(?, ?, ?, ?, ?)");
        values.push(idSku, canalVenta, numeroOperacion, cantidad, fecha);
      }

      const insertQuery = `
        INSERT INTO ventasConDescuento (idSku, canalVenta, numeroOperacion, cantidad, fecha)
        VALUES ${insertPlaceholders.join(", ")}
      `;

      await connection.query(insertQuery, values);

      return res.status(200).json({
        message: "Ventas guardadas correctamente",
        count: ventasFiltradas.length,
        skipped: ventas.length - ventasFiltradas.length,
      });
    } else {
      return res.status(400).json({ error: "No se proporcionaron números de operación válidos" });
    }

  } catch (error) {
    console.error("Error saving ventas con descuento:", error);
    res.status(500).json({ error: "Error al guardar las ventas" });
  } finally {
    if (connection) connection.release();
  }
},

verificarExistencia : async (req, res) => {
  const { numerosOperacion } = req.body;

  if (!Array.isArray(numerosOperacion) || numerosOperacion.length === 0) {
    return res.status(400).json({ existentes: [] });
  }

  try {
    const placeholders = numerosOperacion.map(() => '?').join(',');
    const [rows] = await conn.query(
      `SELECT DISTINCT numeroOperacion FROM ventasConDescuento WHERE numeroOperacion IN (${placeholders})`,
      numerosOperacion
    );
    const existentes = rows.map(row => row.numeroOperacion);
    res.json({ existentes });
  } catch (error) {
    console.error("Error al verificar existencia:", error);
    res.status(500).json({ existentes: [] });
  }

},
eliminarOrdenes : async (req, res) => {
  const { numerosOperacion } = req.body;

  if (!Array.isArray(numerosOperacion) || numerosOperacion.length === 0) {
    return res.status(400).json({ success: false, message: "Lista vacía" });
  }

  try {
    const placeholders = numerosOperacion.map(() => '?').join(',');
    const [result] = await conn.query(
      `DELETE FROM ventasConDescuento WHERE numeroOperacion IN (${placeholders})`,
      numerosOperacion
    );
    res.json({ success: true, deletedCount: result.affectedRows });
  } catch (error) {
    console.error("Error al eliminar órdenes:", error);
    res.status(500).json({ success: false, message: "Error al eliminar" });
  }
}
}

export default productosConDescuentoController;
