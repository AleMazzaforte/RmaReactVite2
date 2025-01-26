import bcrypt from 'bcryptjs';
import {conn} from '../bd/bd.js'; // Asegúrate de tener tu conexión a la base de datos configurada

const usuario = {
    postCargarUsuario: async (req, res) => {
    const { username, password } = req.body;

    try {
      // Encriptar la contraseña antes de guardar
      const hashedPassword = await bcrypt.hash(password, 10);

      const query = 'INSERT INTO usuarios (nombre, password) VALUES (?, ?)';

      const [result] = await conn.query(query, [username, hashedPassword]);
      console.log('Usuario insertado:', result);
      res.status(200).json({ message: 'Usuario cargado correctamente' });
    } catch (error) {
      console.error('Error en el servidor:', error);
      res.status(500).json({ message: 'Error al cargar usuario' });
    }
  }
};

export default usuario;
