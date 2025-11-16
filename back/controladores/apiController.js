import { conn } from "../bd/bd.js";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

// Función para obtener tokens de la DB por mlUser
const getTokensFromDB = async (mlUserId) => {
  const [rows] = await conn.execute(
    "SELECT * FROM ml_tokens WHERE mlUser = ? ORDER BY id DESC LIMIT 1",
    [mlUserId]
  );
  if (rows.length === 0) {
    return null;
  }
  return rows[0];
};

// Función para guardar/actualizar tokens en la DB
const saveTokensToDB = async (
  accessToken,
  refreshToken,
  expiresIn,
  mlUserId
) => {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

  const tokens = await getTokensFromDB(mlUserId);
  if (tokens) {
    await conn.execute(
      "UPDATE ml_tokens SET access_token = ?, refresh_token = ?, expires_at = ? WHERE id = ?",
      [accessToken, refreshToken, expiresAt, tokens.id]
    );
  } else {
    await conn.execute(
      "INSERT INTO ml_tokens (access_token, refresh_token, expires_at, mlUser) VALUES (?, ?, ?, ?)",
      [accessToken, refreshToken, expiresAt, mlUserId]
    );
  }
};

// Función para refrescar el token si está vencido
const refreshAccessToken = async (mlUserId) => {
  const tokens = await getTokensFromDB(mlUserId);
  if (!tokens)
    throw new Error(
      `No hay tokens guardados para la cuenta ${mlUserId}. Debes autenticarte primero.`
    );

  const now = Math.floor(Date.now() / 1000);
  if (now < tokens.expires_at - 60) {
    return tokens.access_token;
  }

  // Seleccionar credenciales según la cuenta
  let clientId, clientSecret;
  if (mlUserId === process.env.ML_USER_ID_1) {
    clientId = process.env.ML_CLIENT_ID_1;
    clientSecret = process.env.ML_CLIENT_SECRET_1;
  } else if (mlUserId === process.env.ML_USER_ID_2) {
    clientId = process.env.ML_CLIENT_ID_2;
    clientSecret = process.env.ML_CLIENT_SECRET_2;
  } else {
    throw new Error(`Cuenta desconocida: ${mlUserId}`);
  }

  if (!clientId || !clientSecret) {
    throw new Error(`Faltan credenciales para la cuenta ${mlUserId} en .env`);
  }

  try {
    const response = await axios.post(
      "https://api.mercadolibre.com/oauth/token",
      new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: tokens.refresh_token,
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;
    await saveTokensToDB(access_token, refresh_token, expires_in, mlUserId);
    return access_token;
  } catch (error) {
    console.error(
      `❌ Error al refrescar token para la cuenta ${mlUserId}:`,
      error.message
    );
    if (error.response) {
      console.error("   - Status:", error.response.status);
      console.error("   - Datos:", error.response.data);
    }
    throw new Error(
      `Token expirado y no se pudo refrescar para la cuenta ${mlUserId}. Vuelve a autenticarte.`
    );
  } 
};

// Función para obtener detalles completos de una orden
const getOrderDetails = async (orderId, accessToken) => {
  try {
    const response = await axios.get(
      `https://api.mercadolibre.com/orders/${orderId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    return response.data;
  } catch (error) {
    console.warn(
      `⚠️ No se pudo obtener detalles de la orden ${orderId}:`,
      error.message
    );
    return null;
  }
};

// Controlador para obtener órdenes
const getVentas = async (req, res) => {
  try {
    const dias = parseInt(req.query.dias) || 7;
    if (dias < 1 || dias > 21) {
      return res
        .status(400)
        .json({
          message: "El parámetro 'dias' debe estar entre 1 y 10.",
          success: false,
        });
    }

    const cuenta = req.query.cuenta || "1";
    let mlUserId = "userId";

    if (cuenta === "1") {
      mlUserId = process.env.ML_USER_ID_1;
    } else if (cuenta === "2") {
      mlUserId = process.env.ML_USER_ID_2;
    } else {
      return res
        .status(400)
        .json({
          message: "Parámetro 'cuenta' inválido. Usa '1' o '2'.",
          success: false,
        });
    }

    if (!mlUserId) {
      return res
        .status(500)
        .json({
          message: `ML_USER_ID no configurado para la cuenta ${cuenta}`,
          success: false,
        });
    }

    const accessToken = await refreshAccessToken(mlUserId);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dias);

    const url = `https://api.mercadolibre.com/orders/search?seller=${mlUserId}&sort=date_desc&limit=50`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const orders = response.data.results || [];
    const filteredOrders = orders.filter(
      (order) => new Date(order.date_created) >= startDate
    );

    // Agrupar por pack_id (si existe), sino por id
    const ordersByPack = {};

    for (const order of filteredOrders) {
      const fullOrder = await getOrderDetails(order.id, accessToken);
      if (!fullOrder) {
        continue;
      }

      const mainOrderId = fullOrder.pack_id || fullOrder.id;

      // ✅ Solo procesamos una vez por pack o por orden
      if (!ordersByPack[mainOrderId]) {
        let tipo_envio = "desconocido";
        let etiqueta_impresa = false;

        // ✅ Obtener detalles del envío desde /shipments/{id} si existe
        if (fullOrder.shipping?.id) {
          try {
            const shipmentRes = await axios.get(
              `https://api.mercadolibre.com/shipments/${fullOrder.shipping.id}`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            const shipping = shipmentRes.data;

            etiqueta_impresa = !!shipping.id;

            if (
              shipping.logistic_type === "fulfillment" ||
              shipping.mode === "fulfillment"
            ) {
              tipo_envio = "full";
            } else if (shipping.logistic_type === "me2") {
              tipo_envio = "mercado_envios";
            } else if (
              ["drop_off", "xd_drop_off"].includes(shipping.logistic_type)
            ) {
              tipo_envio = "mercado_envios";
            } else if (shipping.logistic_type === "self_service") {
              tipo_envio = "flex";
            } else if (shipping.mode === "custom") {
              tipo_envio = "vendedor";
            } else {
              tipo_envio = "desconocido";
            }
          } catch (err) {
            console.warn(
              `⚠️ No se pudo obtener shipment ${fullOrder.shipping.id}:`,
              err.message
            );
            // Si no podemos obtener el shipment, al menos marcamos que tiene envío
            etiqueta_impresa = true;
          }
        }

        const sellerNicknameMap = {
  [process.env.ML_USER_ID_1]: "FEMEX",
  [process.env.ML_USER_ID_2]: "BLOW INK"
};;

        ordersByPack[mainOrderId] = {
          id: mainOrderId,
          buyer_nickname: fullOrder.buyer?.nickname || "",
          seller_nickname: sellerNicknameMap[mlUserId] || "Desconocido",
          date_created: fullOrder.date_created, // ← ¡formato ISO! (no formateado)
          etiqueta_impresa,
          tipo_envio,
          items: [],
        };
      }

      // Agregar todos los items de esta suborden
      for (const item of fullOrder.order_items || []) {
        ordersByPack[mainOrderId].items.push({
          sku: item.item.seller_sku || item.item.id,
          quantity: item.quantity,
          description: item.item.title,
        });
      }
    }

    const enrichedOrders = Object.values(ordersByPack);

    res.status(200).json({
      message: `Órdenes de los últimos ${dias} días para la cuenta ${cuenta}`,
      success: true,
      data: enrichedOrders,
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
      success: false,
    });
  } 
};

// Controlador para guardar tokens (desde frontend o script)
const saveTokens = async (req, res) => {
  const { access_token, refresh_token, expires_in, mlUser } = req.body;

  if (!access_token || !refresh_token || !expires_in || !mlUser) {
    return res
      .status(400)
      .json({
        message:
          "Faltan datos en el cuerpo: access_token, refresh_token, expires_in y mlUser son obligatorios",
        success: false,
      });
  }

  try {
    await saveTokensToDB(access_token, refresh_token, expires_in, mlUser);
    res
      .status(200)
      .json({
        message: `Tokens guardados exitosamente para la cuenta ${mlUser}`,
        success: true,
      });
  } catch (error) {
    console.error("❌ Error al guardar tokens:", error);
    res
      .status(500)
      .json({ message: "Error al guardar tokens", success: false });
  }
};

const apiController = { getVentas, saveTokens };
export default apiController;
