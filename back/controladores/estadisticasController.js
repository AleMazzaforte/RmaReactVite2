import { conn } from "../bd/bd.js";

// controllers/estadisticasController.js

export const getEstadisticasRMA = async (req, res) => {
  let connection;
  try {
    connection = await conn.getConnection();

    const [results] = await connection.query(`
      -- Primero obtenemos todos los productos con sus importaciones
      WITH importaciones AS (
        SELECT 
          p.id AS producto_id,
          p.sku AS producto_sku,
          p.cantSistemaFemex AS cantidadSistemaFemex,
          p.cantSistemaBlow AS cantidadSistemaBlow,
          SUM(op.cantidad) AS total_importado
        FROM 
          productos p
        JOIN 
          opProductos op ON op.idSku = p.id
        GROUP BY 
          p.id, p.sku, p.cantSistemaFemex, p.cantSistemaBlow
      ),

      -- Luego obtenemos las devoluciones de r_m_a
      devoluciones_rma AS (
        SELECT 
          r.modelo AS producto_id,
          SUM(r.cantidad) AS total_devuelto
        FROM 
          r_m_a r
        GROUP BY 
          r.modelo
      ),

      -- Y las devoluciones de productosViejos
      devoluciones_viejos AS (
        SELECT 
          pv.idSku AS producto_id,
          SUM(pv.cantidad) AS total_devuelto
        FROM 
          productosViejos pv
        GROUP BY 
          pv.idSku
      )

      -- Combinamos todos los datos
      SELECT 
        i.producto_id,
        i.producto_sku,
        i.total_importado,
        i.cantidadSistemaFemex,
        i.cantidadSistemaBlow,
        GREATEST(0, i.total_importado - (i.cantidadSistemaFemex + i.cantidadSistemaBlow)) AS total_vendido,
        COALESCE(dr.total_devuelto, 0) + COALESCE(dv.total_devuelto, 0) AS total_devuelto,
        CASE 
          WHEN (i.total_importado - (i.cantidadSistemaFemex + i.cantidadSistemaBlow)) > 0 THEN 
            ROUND(
              (COALESCE(dr.total_devuelto, 0) + COALESCE(dv.total_devuelto, 0)) * 100.0 / 
              (i.total_importado - (i.cantidadSistemaFemex + i.cantidadSistemaBlow)), 
              2
            )
          ELSE 0 
        END AS porcentaje_fallados
      FROM 
        importaciones i
      LEFT JOIN 
        devoluciones_rma dr ON dr.producto_id = i.producto_id
      LEFT JOIN 
        devoluciones_viejos dv ON dv.producto_id = i.producto_id
      ORDER BY 
        i.producto_sku ASC  -- Orden principal por SKU ascendente
       
    `);

    res.json(results);
  } catch (error) {
    console.error("Error al obtener estadísticas RMA:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener estadísticas",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
};

export default {
  getEstadisticasRMA
}