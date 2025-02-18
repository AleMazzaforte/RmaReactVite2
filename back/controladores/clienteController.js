import dotenv from "dotenv";
import { conn } from "../bd/bd.js";
import events from "events";
events.EventEmitter.defaultMaxListeners = 15;

dotenv.config();

const gestionClientes = {

    listarClientesParaActualizar: async (req, res) => {
      try {
        const [clientes] = await conn.query("SELECT * FROM clientes");
        res.json(clientes); // Retorna los clientes en formato JSON
        
        
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al listar los clientes" });
      }
    },
  
    cargarCliente: async (req, res) => {
    try {
      const {
        cliente,
        cuit,
        provincia,
        ciudad,
        domicilio,
        telefono,
        transporte,
        seguro,
        condEntrega,
        condPago
      } = req.body;

      const campos = [
        cliente,
        cuit,
        provincia,
        ciudad,
        domicilio,
        telefono,
        transporte,
        seguro,
        condEntrega,
        condPago
      ].map(campo => (campo === '' ? null : campo)); // Convertir campos vacíos a null
      let connection;
      try {
        connection = await conn.getConnection();
        await connection.query(
          "INSERT INTO clientes (nombre, cuit, provincia, ciudad, domicilio, telefono, transporte, seguro, condicionDeEntrega, condicionDePago) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          campos
        );
        res.status(200).json({ message: "Cliente agregado correctamente" });
      } catch (error) {
        console.error("Error al agregar el cliente:", error);
        if (error.code === 'ER_DUP_ENTRY') {
          if (error.sqlMessage.includes("clientes.nombre")) {
            return res.status(400).json({ error: `El nombre ${cliente} ya está en la base de datos.` });
            
          }
          if (error.sqlMessage.includes("clientes.cuit")) {
            return res.status(400).json({ error: `El CUIT ${cuit} ya está en la base de datos.` });
          }
        }else {
          res.status(500).json({ message: "Hubo un problema al agregar el cliente" });
        }
        
      } finally {
        if (connection) {
          connection.release();
        }
      }
    } catch (error) {
      console.error("Error al cargar el cliente:", error);
      res.status(500).json({ message: "Hubo un problema al agregar el cliente" });
      connection.release();
    }
  },

  actualizarCliente: async (req, res) => {
    try {
      const id = req.params.idCliente;
      
      const {
        cliente,
        cuit,
        provincia,
        ciudad,
        domicilio,
        telefono,
        transporte,
        seguro,
        condicionDeEntrega,
        condicionDePago
      } = req.body;

      const campos = [
        cliente,
        cuit,
        provincia,
        ciudad,
        domicilio,
        telefono,
        transporte,
        seguro,
        condicionDeEntrega,
        condicionDePago
      ].map(campo => (campo === '' ? null : campo)); // Convertir campos vacíos a null
        
      let connection;
      try {
        connection = await conn.getConnection();
        await connection.query(
          "UPDATE clientes SET nombre = ?, cuit = ?, provincia = ?, ciudad = ?, domicilio = ?, telefono = ?, transporte = ?, seguro = ?, condicionDeEntrega = ?, condicionDePago = ? WHERE id = ?",
          [...campos, id]
        );
        res.status(200).json({ message: "Cliente actualizado correctamente" });
      } catch (error) {
        console.error("Error al actualizar el cliente:", error);
        if (error.code === 'ER_DUP_ENTRY') {
          if (error.sqlMessage.includes("clientes.nombre")) {
            return res.status(400).json({ error: `El nombre ${cliente} ya está en la base de datos.` });
          }
          if (error.sqlMessage.includes("clientes.cuit")) {
            return res.status(400).json({ error: `El CUIT ${cuit} ya está en la base de datos.` });
          }
        } else {
          res.status(500).json({ message: "Hubo un problema al actualizar el cliente" });
        }
      } finally {
        if (connection) {
          connection.release();
        }
      }
    } catch (error) {
      console.error("Error al actualizar el cliente:", error);
      res.status(500).json({ message: "Hubo un problema al actualizar el cliente" });
      connection.release();
    }
  }
};

export default  gestionClientes ;