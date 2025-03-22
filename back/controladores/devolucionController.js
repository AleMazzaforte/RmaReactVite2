import { conn } from "../bd/bd.js"; // Asegúrate de que la conexión a la base de datos esté correctamente configurada

const agregarDevolucion = {
  postAgregarDevolucion: async (req, res) => {
    let connection;
    try {
      const devoluciones = req.body; // Array de devoluciones: [{ idCliente, fechaIngreso, sku, cantidad, marca, motivo, ventaMeli }]

      // Validar que se reciba un array de devoluciones
      if (!Array.isArray(devoluciones) || devoluciones.length === 0) {
        return res.status(400).json({ message: "Debe enviar al menos una devolución", success: false });
      }

      connection = await conn.getConnection();
      await connection.beginTransaction();

      // Insertar cada devolución en la tabla `devoluciones`
      for (const devolucion of devoluciones) {
        const { idCliente, fechaIngreso, sku, cantidad, marca, motivo, ventaMeli } = devolucion;

        // Validar que todos los campos obligatorios estén presentes
        if (!idCliente) {
          throw new Error("Debe agregar un cliente");
        }

        if (!fechaIngreso) {
            throw new Error("Debe agregar la fecha de ingreso")
        }
        
        if (!sku) {
            throw new Error("Debe agregar un producto")
        }
        
        if (!cantidad) {
            throw new Error("Debe agregar la cantidad")
        }

        if (!marca) {
            throw new Error("Debe agregar la marca")
        }
        
        if (!motivo) {
            throw new Error("Debe agregar un motivo")
        }
        
        // Insertar la devolución en la tabla
        await connection.query(
          `INSERT INTO devoluciones 
           (idCliente, fechaIngreso, sku, cantidad, marca, motivo, ventaMeli) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [idCliente, fechaIngreso, sku, cantidad, marca, motivo, ventaMeli]
        );
      }

      await connection.commit();
      res.status(201).json({ message: "Devoluciones guardadas correctamente", success: true });
    } catch (error) {
      console.error("Error al guardar las devoluciones:", error);

      if (connection) {
        await connection.rollback(); // Revertir la transacción en caso de error
      }

      // Enviar una sola respuesta con el mensaje de error
      res.status(500).json({
        message: `Error interno del servidor: ${error.message}`, // Incluir el mensaje de error específico
        success: false,
      });
    } finally {
      if (connection) {
        connection.release(); // Liberar la conexión
      }
    }
  },
};

export default agregarDevolucion;