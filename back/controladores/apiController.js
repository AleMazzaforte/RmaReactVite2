// controllers/api.controller.js
import { conn } from "../bd/bd.js";
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Función para obtener tokens de la DB
const getTokensFromDB = async () => {
 
  const [rows] = await conn.execute('SELECT * FROM ml_tokens ORDER BY id DESC LIMIT 1');
  if (rows.length === 0) {
    return null;
  }
  return rows[0];
};

// Función para guardar/actualizar tokens en la DB
const saveTokensToDB = async (accessToken, refreshToken, expiresIn) => {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

  const tokens = await getTokensFromDB();
  if (tokens) {
    await conn.execute(
      'UPDATE ml_tokens SET access_token = ?, refresh_token = ?, expires_at = ? WHERE id = ?',
      [accessToken, refreshToken, expiresAt, tokens.id]
    );
  } else {
    await conn.execute(
      'INSERT INTO ml_tokens (access_token, refresh_token, expires_at) VALUES (?, ?, ?)',
      [accessToken, refreshToken, expiresAt]
    );
  }
};

// Función para refrescar el token si está vencido
const refreshAccessToken = async () => {
  const tokens = await getTokensFromDB();
  if (!tokens) throw new Error("No hay tokens guardados. Debes autenticarte primero.");

  const now = Math.floor(Date.now() / 1000);

  if (now < tokens.expires_at - 60) {
    return tokens.access_token;
  }

  const clientId = process.env.ML_CLIENT_ID;
  const clientSecret = process.env.ML_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Faltan ML_CLIENT_ID o ML_CLIENT_SECRET en .env");
  }

  try {
    // ✅ CORREGIDO: URL sin espacios al final
    const response = await axios.post(
      'https://api.mercadolibre.com/oauth/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: tokens.refresh_token
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;

    await saveTokensToDB(access_token, refresh_token, expires_in);
    return access_token;
  } catch (error) {
    console.error("❌ Error al refrescar token:");
    console.error("   - Código de respuesta:", error.response?.status);
    console.error("   - Datos de error:", error.response?.data);
    console.error("   - Mensaje:", error.message);
    throw new Error("Token expirado y no se pudo refrescar. Vuelve a autenticarte.");
  }
};

// Controlador para obtener órdenes
const getVentas = async (req, res) => {

  try {
    const dias = parseInt(req.query.dias) || 7;

    if (dias < 1 || dias > 30) {
      return res.status(400).json({ message: "El parámetro 'dias' debe estar entre 1 y 30.", success: false });
    }

    const accessToken = await refreshAccessToken();    

    const mlUserId = process.env.ML_USER_ID;
    if (!mlUserId) {
      throw new Error("ML_USER_ID no está definido en .env");
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dias);
 
    const url = `https://api.mercadolibre.com/orders/search?seller=${mlUserId}&sort=date_desc&limit=50`;
 
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const orders = response.data.results || [];
    
    
    const filteredOrders = orders.filter(order => {
      const orderDate = new Date(order.date_created);
      return orderDate >= startDate;
    }).map(order => {
      const receiver = order.receiver_address || {};
      return {
        id: order.id,
        status: order.status,
        date_created: order.date_created,
        shipping: {
          id: order.shipping?.id || null,
          status: order.shipping?.status || null,
          etiqueta_impresa: !!order.shipping?.id
        },
        items: (order.order_items || []).map(item => ({
          sku: item.item.seller_sku || item.item.id,
          quantity: item.quantity
        })),
        receiver_info: {
          name: receiver.receiver_name || '',
          street: receiver.street_name || '',
          number: receiver.street_number || '',
          city: receiver.city?.name || '',
          state: receiver.state?.name || '',
          zip_code: receiver.zip_code || ''
        }
      };
    });
console.log('orders', orders);
//console.log('orders items', filteredOrders.order_items);
    res.status(200).json({
      message: `Órdenes de los últimos ${dias} días`,
      success: true,
      data: filteredOrders
    });

  } catch (error) {
    console.error("🔥 ERROR EN GETVENTAS:");
    console.error("   - Mensaje:", error.message);
    if (error.response) {
      console.error("   - Status:", error.response.status);
      console.error("   - Datos de respuesta:", error.response.data);
    }
    res.status(500).json({
      message: error.message || "Error al obtener órdenes",
      success: false
    });
  }
};

// Controlador para guardar los tokens
const saveTokens = async (req, res) => {
  const { access_token, refresh_token, expires_in } = req.body;

  if (!access_token || !refresh_token || !expires_in) {
    return res.status(400).json({ message: "Faltan tokens en el cuerpo", success: false });
  }
  try {
    await saveTokensToDB(access_token, refresh_token, expires_in);
    res.status(200).json({ message: "Tokens guardados exitosamente", success: true });
  } catch (error) {
    console.error("❌ Error al guardar tokens:", error);
    res.status(500).json({ message: "Error al guardar tokens", success: false });
  }
};

const apiController = { getVentas, saveTokens };
export default apiController;