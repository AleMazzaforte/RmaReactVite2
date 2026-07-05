import { conn } from "../bd/bd.js";
import axios from "axios";
import dotenv from "dotenv";
import kits from "../../reactvitefront/src/componentes/utilidades/Kits.ts";

dotenv.config();

// ✅ FUNCIÓN AUXILIAR: Crear objeto de orden para ordersByPack
const crearOrdenBase = (fullOrder, mlUserId, numeroOperacion, etiqueta_impresa, tipo_envio, shipping_status) => {
  const sellerNicknameMap = {
    [process.env.ML_USER_ID_1]: "FEMEX",
    [process.env.ML_USER_ID_2]: "BLOW INK"
  };

  const buyer_full_name = `${fullOrder.buyer?.first_name || ''} ${fullOrder.buyer?.last_name || ''}`.trim();

  return {
    numeroOperacion: numeroOperacion,
    buyer_nickname: fullOrder.buyer?.nickname || "",
    seller_nickname: sellerNicknameMap[mlUserId] || "Desconocido",
    buyer_full_name,
    date_created: fullOrder.date_created,
    etiqueta_impresa,
    tipo_envio,
    shipping_status,
    status: fullOrder.status,
    items: [],
  };
};

// ✅ FUNCIÓN AUXILIAR: Determinar estado de envío desde shipment
const determinarEstadoEnvio = (shipping) => {
  const substatus = shipping.substatus || 'unknown';
  const status = shipping.status;
  let etiqueta_impresa = false;
  let shipping_status = 'unknown';

  if (status === 'shipped' || status === 'delivered') {
    etiqueta_impresa = true;
    shipping_status = substatus === 'unknown' ? status : substatus;
  }
  else if (['printed', 'handling', 'shipped', 'delivered'].includes(substatus)) {
    etiqueta_impresa = true;
    shipping_status = substatus;
  }
  else if (substatus === 'ready_to_print') {
    etiqueta_impresa = false;
    shipping_status = 'ready_to_print';
  }
  else if (substatus === 'in_packing_list') {
    etiqueta_impresa = false;
    shipping_status = 'in_packing_list';
  }
  else {
    etiqueta_impresa = false;
    shipping_status = status || substatus || 'unknown';
  }

  return { etiqueta_impresa, shipping_status };
};

// ✅ FUNCIÓN AUXILIAR: Determinar tipo de envío desde shipment
const determinarTipoEnvio = (shipping) => {
  if (shipping.logistic_type === "fulfillment" || shipping.mode === "fulfillment") {
    return "full";
  } else if (shipping.logistic_type === "me2") {
    return "mercado_envios";
  } else if (["drop_off", "xd_drop_off"].includes(shipping.logistic_type)) {
    return "mercado_envios";
  } else if (shipping.logistic_type === "self_service") {
    return "flex";
  } else if (shipping.mode === "custom") {
    return "vendedor";
  } else {
    return "desconocido";
  }
};

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



const getVentas = async (req, res) => {
  try {
    const dias = parseInt(req.query.dias) || 7;
    if (dias < 1 || dias > 21) {
      return res.status(400).json({
        message: "El parámetro 'dias' debe estar entre 1 y 21.",
        success: false,
      });
    }

    const cuenta = req.query.cuenta || "1";
    let mlUserId;

    if (cuenta === "1") {
      mlUserId = process.env.ML_USER_ID_1;
    } else if (cuenta === "2") {
      mlUserId = process.env.ML_USER_ID_2;
    } else {
      return res.status(400).json({
        message: "Parámetro 'cuenta' inválido. Usa '1' o '2'.",
        success: false,
      });
    }

    if (!mlUserId) {
      return res.status(500).json({
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

    const ordersByPack = {};

    for (const order of filteredOrders) {
      const fullOrder = await getOrderDetails(order.id, accessToken);
      if (!fullOrder) continue;

      const numeroOperacion = fullOrder.pack_id || fullOrder.id;

      if (!ordersByPack[numeroOperacion]) {
        let tipo_envio = "desconocido";
        let etiqueta_impresa = false;
        let shipping_status = 'unknown';

        // ✅ 1. Órdenes canceladas
        if (fullOrder.status === "cancelled") {
          tipo_envio = "cancelada";
          etiqueta_impresa = false;
          shipping_status = 'cancelled';
        }
        // ✅ 2. Retiro en local: sin shipping.id y sin costo de envío
        else if (
          fullOrder.shipping?.id === null &&
          (fullOrder.shipping_cost === null || fullOrder.shipping_cost === 0)
        ) {
          tipo_envio = "retiro_local";
          etiqueta_impresa = false;
          shipping_status = 'no_shipping';
        }
        // ✅ 3. También detectar por tag (por compatibilidad)
        else if (fullOrder.tags?.includes("no_shipping")) {
          tipo_envio = "retiro_local";
          etiqueta_impresa = false;
          shipping_status = 'no_shipping';
        }
        // ✅ 4. Si tiene shipping, obtener detalles
        else if (fullOrder.shipping?.id) {
          try {
            const shipmentRes = await axios.get(
              `https://api.mercadolibre.com/shipments/${fullOrder.shipping.id}`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            const shipping = shipmentRes.data;

            // ✅ USAR FUNCIONES AUXILIARES
            const estadoEnvio = determinarEstadoEnvio(shipping);
            etiqueta_impresa = estadoEnvio.etiqueta_impresa;
            shipping_status = estadoEnvio.shipping_status;
            tipo_envio = determinarTipoEnvio(shipping);

          } catch (err) {
            console.warn(
              `⚠️ No se pudo obtener shipment ${fullOrder.shipping.id}:`,
              err.message
            );
            etiqueta_impresa = true;
            tipo_envio = "desconocido";
            shipping_status = 'error';
          }
        }
        // ✅ 5. Caso residual
        else {
          tipo_envio = "desconocido";
          etiqueta_impresa = false;
          shipping_status = 'unknown';
        }

        // ✅ CREAR OBJETO UNA SOLA VEZ
        ordersByPack[numeroOperacion] = crearOrdenBase(
          fullOrder,
          mlUserId,
          numeroOperacion,
          etiqueta_impresa,
          tipo_envio,
          shipping_status
        );
      }

      // Agregar ítems
      for (const item of fullOrder.order_items || []) {
        ordersByPack[numeroOperacion].items.push({
          sku: item.item.seller_sku || item.item.id,
          quantity: item.quantity,
          description: item.item.title,
        });
      }
    }

    // 🆕 ENRIQUECER CON CÓDIGO DE BARRAS
    const enrichedOrders = Object.values(ordersByPack);

    // Recolectar todos los SKUs únicos de todas las órdenes
    const skusUnicos = new Set();
    for (const order of enrichedOrders) {
      for (const item of order.items) {
        if (item.sku) {
          skusUnicos.add(item.sku);
          const kitInfo = kits[item.sku];
          if (kitInfo) {
            const componentes = Array.isArray(kitInfo.sku)
              ? kitInfo.sku
              : [kitInfo.sku];
            componentes.forEach(c => skusUnicos.add(c));
          }

        }
      }
    }

    // Hacer UNA SOLA query para obtener todos los códigos de barras
    const skusArray = Array.from(skusUnicos);
    let mapaCodigosBarras = {};

    if (skusArray.length > 0) {
      const placeholders = skusArray.map(() => '?').join(',');
      const [productos] = await conn.query(
        `SELECT sku, codigoBarras FROM productos WHERE sku IN (${placeholders})`,
        skusArray
      );

      // Crear mapa SKU -> codigoBarras
      for (const prod of productos) {
        mapaCodigosBarras[prod.sku] = prod.codigoBarras;
      }
    }

    // Asignar codigoBarras a cada item
    for (const order of enrichedOrders) {
      for (const item of order.items) {
        item.codigoBarras = mapaCodigosBarras[item.sku] || null;
        const kitInfo = kits[item.sku];
        if (kitInfo) {
          const componentes = Array.isArray(kitInfo.sku)
            ? kitInfo.sku
            : [kitInfo.sku];

          item.codigosBarrasComponentes = componentes.map(c => mapaCodigosBarras[c] || null);
        } else {
          item.codigosBarrasComponentes = [];
        }
      }
    }

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
      console.error("   - Datos:", JSON.stringify(error.response.data, null, 2));
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