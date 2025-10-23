import { conn } from "../bd/bd.js";

// controllers/estadisticasController.js

// controllers/estadisticasController.js

export const getEstadisticasRMA = async (req, res) => {
  let connection;
  try {
    connection = await conn.getConnection();

    const [results] = await connection.query(`
      WITH 
      importaciones AS (
        SELECT 
          p.id AS producto_id,
          p.sku AS producto_sku,
          p.cantSistemaFemex,
          p.cantSistemaBlow,
          SUM(op.cantidad) AS total_importado
        FROM productos p
        JOIN opProductos op ON op.idSku = p.id
        GROUP BY p.id, p.sku, p.cantSistemaFemex, p.cantSistemaBlow
      ),
      
      ventas_directas AS (
        SELECT 
          i.producto_id,
          i.producto_sku,
          i.total_importado,
          i.cantSistemaFemex,
          i.cantSistemaBlow,
          GREATEST(0, i.total_importado - (COALESCE(i.cantSistemaFemex, 0) + COALESCE(i.cantSistemaBlow, 0))) AS total_vendido_directo
        FROM importaciones i
      ),
      
      devoluciones_rma AS (
        SELECT r.modelo AS producto_id, SUM(r.cantidad) AS total_devuelto
        FROM r_m_a r
        GROUP BY r.modelo
      ),
      devoluciones_viejos AS (
        SELECT pv.idSku AS producto_id, SUM(pv.cantidad) AS total_devuelto
        FROM productosViejos pv
        GROUP BY pv.idSku
      ),
      devoluciones_totales AS (
        SELECT 
          COALESCE(dr.producto_id, dv.producto_id) AS producto_id,
          COALESCE(dr.total_devuelto, 0) + COALESCE(dv.total_devuelto, 0) AS total_devuelto
        FROM devoluciones_rma dr
        LEFT JOIN devoluciones_viejos dv ON dr.producto_id = dv.producto_id
        UNION
        SELECT 
          dv.producto_id,
          dv.total_devuelto
        FROM devoluciones_viejos dv
        LEFT JOIN devoluciones_rma dr ON dv.producto_id = dr.producto_id
        WHERE dr.producto_id IS NULL
      ),
      
      kits_vendidos AS (
        SELECT 
          v.producto_id AS kit_id,
          v.total_vendido_directo AS unidades_kit_vendidas
        FROM ventas_directas v
        WHERE v.producto_sku LIKE 'KIT-%'
      ),
      
      ventas_por_componentes AS (
        SELECT idSku1 AS componente_id, unidades_kit_vendidas FROM kits k JOIN kits_vendidos kv ON k.idSkuKit = kv.kit_id WHERE idSku1 IS NOT NULL
        UNION ALL
        SELECT idSku2, unidades_kit_vendidas FROM kits k JOIN kits_vendidos kv ON k.idSkuKit = kv.kit_id WHERE idSku2 IS NOT NULL
        UNION ALL
        SELECT idSku3, unidades_kit_vendidas FROM kits k JOIN kits_vendidos kv ON k.idSkuKit = kv.kit_id WHERE idSku3 IS NOT NULL
        UNION ALL
        SELECT idSku4, unidades_kit_vendidas FROM kits k JOIN kits_vendidos kv ON k.idSkuKit = kv.kit_id WHERE idSku4 IS NOT NULL
      ),
      
      ventas_atribuidas AS (
        SELECT 
          componente_id,
          SUM(unidades_kit_vendidas) AS total_vendido_atribuido
        FROM ventas_por_componentes
        GROUP BY componente_id
      )

      SELECT 
        v.producto_id,
        v.producto_sku,
        v.total_importado,
        v.cantSistemaFemex,
        v.cantSistemaBlow,
        v.total_vendido_directo + COALESCE(va.total_vendido_atribuido, 0) AS total_vendido,
        COALESCE(dt.total_devuelto, 0) AS total_devuelto,
        CASE 
          WHEN (v.total_vendido_directo + COALESCE(va.total_vendido_atribuido, 0)) > 0 THEN 
            ROUND(
              COALESCE(dt.total_devuelto, 0) * 100.0 / 
              (v.total_vendido_directo + COALESCE(va.total_vendido_atribuido, 0)), 
              2
            )
          ELSE 0 
        END AS porcentaje_fallados
      FROM ventas_directas v
      LEFT JOIN ventas_atribuidas va ON va.componente_id = v.producto_id
      LEFT JOIN devoluciones_totales dt ON dt.producto_id = v.producto_id
      WHERE v.producto_sku NOT LIKE 'KIT-%'  -- 👈 EXCLUIR KITS DE LA VISTA
      ORDER BY v.producto_sku ASC
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
};