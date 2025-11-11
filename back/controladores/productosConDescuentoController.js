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
        console.log(rowsvendidos);
        res.json(rowsvendidos);
    } catch (error) {
      console.error("Error fetching productos con descuento vendidos:", error);
      res
        .status(500)
        .json({ error: "Error al obtener los productos con descuento vendidos" });
    }
    finally {
      if (conection) {
        conection.release();
      }
    }
  },

  // En tu controlador (POST)
postGuardarVentasConDescuento: async (req, res) => {
    let connection;
  try {
    const ventas = Array.isArray(req.body) ? req.body : [req.body];
    
    connection = await conn.getConnection();
    const values = [];
    const placeholders = [];

    for (const venta of ventas) {
      const { idSku, canalVenta, numeroOperacion, cantidad, fecha } = venta;
      if (!idSku || !canalVenta || !numeroOperacion || !cantidad || !fecha) {
        return res.status(400).json({ error: "Faltan campos obligatorios" });
      }
      placeholders.push("(?, ?, ?, ?, ?)");
      values.push(idSku, canalVenta, numeroOperacion, cantidad, fecha);
    }

    const query = `
      INSERT INTO ventasConDescuento (idSku, canalVenta, numeroOperacion, cantidad, fecha)
      VALUES ${placeholders.join(", ")}
    `;

    await connection.query(query, values);
    res.status(200).json({ message: "Ventas guardadas correctamente", count: ventas.length });
  } catch (error) {
    console.error("Error saving ventas con descuento:", error);
    res.status(500).json({ error: "Error al guardar las ventas" });
  } finally {
    if (connection) connection.release();
  }
}
};

export default productosConDescuentoController;
