import { conn } from "../bd/bd.js";


export const getLogo = async (req, res) => {
    const [rows] = await conn.query('SELECT imagen FROM logo WHERE id = 1');
    if (rows.length > 0) {
      const img = rows[0].imagen;
      res.set('Content-Type', 'image/jpeg'); // o image/jpeg, según corresponda
      res.send(img);
    } else {
      res.status(404).send('Logo no encontrado');
    }
}

