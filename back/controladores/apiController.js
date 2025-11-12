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

// Función para obtener detalles completos de una orden
const getOrderDetails = async (orderId, accessToken) => {
  try {
    const response = await axios.get(`https://api.mercadolibre.com/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response.data;
  } catch (error) {
    console.warn(`⚠️ No se pudo obtener detalles de la orden ${orderId}:`, error.message);
    return null;
  }
};

// Controlador para obtener órdenes
const getVentas = async (req, res) => {
  try {
    const dias = parseInt(req.query.dias) || 7;
    if (dias < 1 || dias > 10) { // 👈 Recomendamos máximo 10 días por rendimiento
      return res.status(400).json({ message: "El parámetro 'dias' debe estar entre 1 y 10.", success: false });
    }

    const accessToken = await refreshAccessToken();
    const mlUserId = process.env.ML_USER_ID;
    if (!mlUserId) {
      throw new Error("ML_USER_ID no está definido en .env");
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dias);


    // Paso 1: Obtener lista básica
    const url = `https://api.mercadolibre.com/orders/search?seller=${mlUserId}&sort=date_desc&limit=50`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const orders = response.data.results || [];

    const filteredOrders = orders.filter(order => new Date(order.date_created) >= startDate);

    // Paso 2: Enriquecer cada orden con tipo_envio (llamada individual)
    const enrichedOrders = [];
    for (const order of filteredOrders) {

      let tipo_envio = "desconocido";
      let etiqueta_impresa = !!order.shipping?.id;

      // Solo si no sabemos el tipo de envío, llamamos a la orden completa
      const fullOrder = await getOrderDetails(order.id, accessToken);
      if (fullOrder?.shipping) {
        const shipping = fullOrder.shipping;
        etiqueta_impresa = !!shipping.id; // actualizamos por las dudas

        if (shipping.logistic_type === "fulfillment" || shipping.mode === "fulfillment") {
          tipo_envio = "full";
        } else if (shipping.mode === "me2") {
          tipo_envio = "mercado_envios";
        } else if (shipping.mode === "custom") {
          if (["drop_off", "cross_docking"].includes(shipping.logistic_type)) {
            tipo_envio = "flex";
          } else {
            tipo_envio = "vendedor";
          }
        }
      }

      enrichedOrders.push({
        id: order.id,
        buyer_nickname: order.buyer?.nickname || '',
        seller_nickname: order.seller?.nickname || '',
        date_created: order.date_created,
        etiqueta_impresa,
        tipo_envio,
        items: (order.order_items || []).map(item => ({
          sku: item.item.seller_sku || item.item.id,
          quantity: item.quantity
        }))
      });
    }

    res.status(200).json({
      message: `Órdenes de los últimos ${dias} días`,
      success: true,
      data: enrichedOrders
    });

  } catch (error) {
    console.error("🔥 ERROR EN GETVENTAS:");
    console.error("   - Mensaje:", error.message);
    if (error.response) {
      console.error("   - Status:", error.response.status);
      console.error("   - Datos:", error.response.data);
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