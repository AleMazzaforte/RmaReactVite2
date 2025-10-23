import { conn } from "../bd/bd.js";

export const kitsController = {
  postGuardarKit: async (req, res) => {
    const { idKit, skusCartuchos } = req.body;

    // ✅ Validaciones
    if (!idKit || typeof idKit !== 'number') {
      return res.status(400).json({ error: "El id del kit es obligatorio y debe ser un número" });
    }

    if (!Array.isArray(skusCartuchos) || skusCartuchos.length === 0) {
      return res.status(400).json({ error: "Debe proporcionar al menos un cartucho (ID)" });
    }

    // ✅ Validar que sean números
    if (!skusCartuchos.every(id => typeof id === 'number')) {
      return res.status(400).json({ error: "Todos los IDs de cartuchos deben ser números" });
    }

    // ✅ Limitar a 4 cartuchos
    if (skusCartuchos.length > 4) {
      return res.status(400).json({ error: "Solo se permiten hasta 4 cartuchos por kit" });
    }

    // ✅ Opcional: evitar duplicados
    const idsUnicos = [...new Set(skusCartuchos)];
    if (idsUnicos.length !== skusCartuchos.length) {
      return res.status(400).json({ error: "No se permiten cartuchos duplicados" });
    }

    // ✅ Opcional: evitar que el kit esté en los cartuchos
    if (idsUnicos.includes(idKit)) {
      return res.status(400).json({ error: "El kit no puede contenerse a sí mismo como cartucho" });
    }

    // ✅ Preparar los valores para la inserción
    const values = {
      idSkuKit: idKit,
      idSku1: idsUnicos[0] || null,  // Si hay menos de 4, rellena con NULL
      idSku2: idsUnicos[1] || null,
      idSku3: idsUnicos[2] || null,
      idSku4: idsUnicos[3] || null,
    };

    try {
      // ✅ Insertar en la tabla `kits`
      const [result] = await conn.query(
        'INSERT INTO kits (idSkuKit, idSku1, idSku2, idSku3, idSku4) VALUES (?, ?, ?, ?, ?)',
        [
          values.idSkuKit,
          values.idSku1,
          values.idSku2,
          values.idSku3,
          values.idSku4
        ]
      );

      res.status(201).json({
        message: "Kit guardado exitosamente",
        id: result.insertId, // si usas AUTO_INCREMENT
        ...values
      });

    } catch (error) {
      console.error("Error al guardar el kit:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }
};

export default kitsController;