import { conn } from "../bd/bd.js";

export const kitsController = {
  postGuardarKit: async (req, res) => {
    const { skuKit, componentes } = req.body;

    if (!skuKit || typeof skuKit !== 'string' || skuKit.trim() === '') {
      return res.status(400).json({ error: "El SKU del kit es obligatorio" });
    }

    if (!Array.isArray(componentes) || componentes.length === 0) {
      return res.status(400).json({ error: "Debe proporcionar al menos un componente" });
    }

    // Validar estructura de cada componente
    for (const comp of componentes) {
      if (typeof comp.idSku !== 'number') {
        return res.status(400).json({ error: "Cada componente debe tener idSku (número)" });
      }
      if (typeof comp.cantidad !== 'number' || comp.cantidad < 1) {
        return res.status(400).json({ error: "Cada componente debe tener cantidad >= 1" });
      }
    }

    const idsUnicos = [...new Set(componentes.map(c => c.idSku))];
    if (idsUnicos.length !== componentes.length) {
      return res.status(400).json({ error: "No se permiten componentes duplicados" });
    }

    try {
      const [kitExistente] = await conn.query(
        'SELECT id FROM kits WHERE skuKit = ?',
        [skuKit.trim()]
      );

      if (kitExistente.length > 0) {
        return res.status(400).json({ error: "Este kit ya existe. Use la opción de actualizar." });
      }

      const [resultKit] = await conn.query(
        'INSERT INTO kits (skuKit) VALUES (?)',
        [skuKit.trim()]
      );

      const idKitInsertado = resultKit.insertId;

      if (componentes.length > 0) {
        const valoresComponentes = componentes.map((comp, index) => [
          idKitInsertado,
          comp.idSku,
          comp.cantidad,
          index + 1
        ]);

        await conn.query(
          'INSERT INTO kits_componentes (idKit, idSku, cantidad, orden) VALUES ?',
          [valoresComponentes]
        );
      }

      res.status(201).json({
        message: "Kit guardado exitosamente",
        id: idKitInsertado,
        skuKit: skuKit.trim(),
        componentes
      });

    } catch (error) {
      console.error("Error al guardar el kit:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  },

  putActualizarKit: async (req, res) => {
    const { idKit, skuKit, componentes } = req.body;

    if (!idKit || typeof idKit !== 'number') {
      return res.status(400).json({ error: "El id del kit es obligatorio" });
    }

    if (!skuKit || typeof skuKit !== 'string' || skuKit.trim() === '') {
      return res.status(400).json({ error: "El SKU del kit es obligatorio" });
    }

    if (!Array.isArray(componentes) || componentes.length === 0) {
      return res.status(400).json({ error: "Debe proporcionar al menos un componente" });
    }

    for (const comp of componentes) {
      if (typeof comp.idSku !== 'number') {
        return res.status(400).json({ error: "Cada componente debe tener idSku (número)" });
      }
      if (typeof comp.cantidad !== 'number' || comp.cantidad < 1) {
        return res.status(400).json({ error: "Cada componente debe tener cantidad >= 1" });
      }
    }

    const idsUnicos = [...new Set(componentes.map(c => c.idSku))];
    if (idsUnicos.length !== componentes.length) {
      return res.status(400).json({ error: "No se permiten componentes duplicados" });
    }

    try {
      const [kitExistente] = await conn.query(
        'SELECT id FROM kits WHERE id = ?',
        [idKit]
      );

      if (kitExistente.length === 0) {
        return res.status(404).json({ error: "El kit no existe" });
      }

      await conn.query(
        'UPDATE kits SET skuKit = ? WHERE id = ?',
        [skuKit.trim(), idKit]
      );

      await conn.query(
        'DELETE FROM kits_componentes WHERE idKit = ?',
        [idKit]
      );

      if (componentes.length > 0) {
        const valoresComponentes = componentes.map((comp, index) => [
          idKit,
          comp.idSku,
          comp.cantidad,
          index + 1
        ]);

        await conn.query(
          'INSERT INTO kits_componentes (idKit, idSku, cantidad, orden) VALUES ?',
          [valoresComponentes]
        );
      }

      res.status(200).json({
        message: "Kit actualizado exitosamente",
        idKit,
        skuKit: skuKit.trim(),
        componentes
      });

    } catch (error) {
      console.error("Error al actualizar el kit:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  },

  getListarKits: async (req, res) => {
    try {
      const [kits] = await conn.query(`
        SELECT 
          k.id,
          k.skuKit,
          GROUP_CONCAT(CONCAT(p.sku, ' x', kc.cantidad) ORDER BY kc.orden SEPARATOR ', ') AS cartuchos
        FROM kits k
        LEFT JOIN kits_componentes kc ON k.id = kc.idKit
        LEFT JOIN productos p ON kc.idSku = p.id
        GROUP BY k.id, k.skuKit
        ORDER BY k.id DESC
      `);

      res.status(200).json(kits);

    } catch (error) {
      console.error("Error al listar kits:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  },

  getObtenerKit: async (req, res) => {
    const { idKit } = req.params;

    if (!idKit || isNaN(parseInt(idKit))) {
      return res.status(400).json({ error: "El id del kit es obligatorio" });
    }

    try {
      const [kits] = await conn.query(
        'SELECT id, skuKit FROM kits WHERE id = ?',
        [idKit]
      );

      if (kits.length === 0) {
        return res.status(404).json({ error: "Kit no encontrado" });
      }

      const [componentes] = await conn.query(`
        SELECT 
          kc.idSku,
          kc.cantidad,
          p.sku AS skuCartucho,
          kc.orden
        FROM kits_componentes kc
        LEFT JOIN productos p ON kc.idSku = p.id
        WHERE kc.idKit = ?
        ORDER BY kc.orden
      `, [idKit]);

      res.status(200).json({
        ...kits[0],
        componentes
      });

    } catch (error) {
      console.error("Error al obtener el kit:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  },

  deleteEliminarKit: async (req, res) => {
    const { idKit } = req.params;

    if (!idKit || isNaN(parseInt(idKit))) {
      return res.status(400).json({ error: "El id del kit es obligatorio" });
    }

    try {
      const [kitExistente] = await conn.query(
        'SELECT id FROM kits WHERE id = ?',
        [idKit]
      );

      if (kitExistente.length === 0) {
        return res.status(404).json({ error: "Kit no encontrado" });
      }

      const [result] = await conn.query(
        'DELETE FROM kits WHERE id = ?',
        [idKit]
      );

      if (result.affectedRows > 0) {
        res.status(200).json({ message: "Kit eliminado correctamente" });
      } else {
        res.status(500).json({ error: "No se pudo eliminar el kit" });
      }
    } catch (error) {
      console.error("Error al eliminar el kit:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  },

  getBuscarKits: async (req, res) => {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: "El parámetro 'query' es obligatorio" });
    }

    try {
      const [kits] = await conn.query(`
        SELECT 
          k.id,
          k.skuKit,
          GROUP_CONCAT(CONCAT(p.sku, ' x', kc.cantidad) ORDER BY kc.orden SEPARATOR ', ') AS cartuchos
        FROM kits k
        LEFT JOIN kits_componentes kc ON k.id = kc.idKit
        LEFT JOIN productos p ON kc.idSku = p.id
        WHERE k.skuKit LIKE ?
        GROUP BY k.id, k.skuKit
        ORDER BY k.skuKit ASC
        LIMIT 20
      `, [`%${query}%`]);

      res.status(200).json(kits);

    } catch (error) {
      console.error("Error al buscar kits:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }
};

export default kitsController;