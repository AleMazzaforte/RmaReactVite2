import React, { useState, useEffect } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import { sweetAlert } from "./utilidades/SweetAlertWrapper";
import Urls from "./utilidades/Urls";

// Tipos actualizados
interface OrderItem {
  sku: string;
  quantity: number;
  description: string;
}

export interface Order {
  id: number;
  buyer_nickname: string;
  seller_nickname: string;
  date_created: string;
  etiqueta_impresa: boolean;
  items: OrderItem[];
}

interface ApiResponse {
  success: boolean;
  message: string;
  data?: Order[];
}

// ✅ Nueva constante: cuentas disponibles
const CUENTAS = [
  { id: "1", nombre: "Femex" },
  { id: "2", nombre: "Blow" },
];

export const Api = () => {
  const [dias, setDias] = useState<number>(3);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<string>("1"); // ← nueva state
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());
  const [productosConDescuento, setProductosConDescuento] = useState<
    Record<string, number>
  >({});
  const [loadingDescuento, setLoadingDescuento] = useState<boolean>(true);
  
  let indice: number = Number(cuentaSeleccionada) - 1;

  const urlGetVentas = Urls.apiMeli.getVentas;
 
  // Cargar productos con descuento (sin cambios)
  useEffect(() => {
    const fetchProductosConDescuento = async () => {
      try {
        const response = await axios.get<{ id: number; sku: string }[]>(
          Urls.ProductosConDescuento.listar
        );
        const mapa = response.data.reduce((acc, prod) => {
          acc[prod.sku] = prod.id;
          return acc;
        }, {} as Record<string, number>);
        setProductosConDescuento(mapa);
      } catch (error) {
        console.error("Error al cargar productos con descuento:", error);
        sweetAlert.error("No se pudieron cargar los productos con descuento");
      } finally {
        setLoadingDescuento(false);
      }
    };

    fetchProductosConDescuento();
  }, []);

  // Toggle selección de una orden (sin cambios)
  const toggleOrderSelection = (orderId: number) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  // Seleccionar/deseleccionar todas (sin cambios)
  const toggleAll = () => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set());
    } else {
      const allIds = new Set(orders.map((o) => o.id));
      setSelectedOrders(allIds);
    }
  };

  // Generar PDF (sin cambios)
  const generatePDF = () => {
    const selectedOrdersList = orders.filter((o) => selectedOrders.has(o.id));

    if (selectedOrdersList.length === 0) {
      alert("Por favor, selecciona al menos una orden.");
      return;
    }

    const doc = new jsPDF("p", "mm", "a4");
    const margin = 10;
    const pageWidth = 210;
    const cardWidth = pageWidth - 2 * margin;
    let yPos = margin;

    const controllers = ["Javi", "Ro", "Lu", "Rodri"];
    const checkboxSize = 3.5;
    const checkboxSpacing = 15;

    selectedOrdersList.forEach((order) => {
      const startY = yPos;

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`Orden #${order.id}`, margin + 5, yPos + 10);

      const badgeText = order.etiqueta_impresa
        ? "Etiqueta generada"
        : "Sin etiqueta";
      const badgeWidth = doc.getTextWidth(badgeText) + 6;
      const badgeX = margin + cardWidth - badgeWidth - 3;
      const badgeY = yPos + 6;
      doc.setFillColor(
        order.etiqueta_impresa ? 220 : 255,
        order.etiqueta_impresa ? 255 : 255,
        220
      );
      doc.rect(badgeX, badgeY, badgeWidth, 8, "F");
      doc.setTextColor(0);
      doc.setFontSize(10);
      doc.text(badgeText, badgeX + 3, badgeY + 5);

      let currentY = yPos + 18;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Comprador: ${order.buyer_nickname}`, margin + 5, currentY);
      currentY += 6;
      doc.text(`Vendedor: ${order.seller_nickname}`, margin + 5, currentY);
      currentY += 6;
      const formattedDate = new Date(order.date_created).toLocaleString(
        "es-AR"
      );
      doc.text(`Fecha: ${formattedDate}`, margin + 5, currentY);
      currentY += 8;

      doc.setFont("helvetica", "normal");
      doc.text("", margin + 5, currentY);
      currentY += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      order.items.forEach((item) => {
        doc.text(`• ${item.sku} — ${item.quantity} Un. ${item.description}`, margin + 5, currentY);
        currentY += 5;
      });

      currentY += 4;
      doc.setFont("helvetica", "normal");
      doc.text("Controló:", margin + 5, currentY);

      let ctrlX = margin + 25;
      controllers.forEach((name) => {
        doc.rect(ctrlX, currentY - 2, checkboxSize, checkboxSize);
        doc.setFont("helvetica", "normal");
        doc.text(name, ctrlX + checkboxSize + 2, currentY);
        ctrlX += checkboxSize + 2 + doc.getTextWidth(name) + checkboxSpacing;
      });

      const cardHeight = currentY - startY + 6;
      if (startY + cardHeight > 297 - margin) {
        doc.addPage();
        yPos = margin;
      }

      doc.setDrawColor(200, 200, 200);
      doc.rect(margin, startY, cardWidth, cardHeight);
      yPos = startY + cardHeight + 8;
    });

    doc.save(`ordenes_cuenta${cuentaSeleccionada}.pdf`);
  };

  // Registrar ventas con descuento (sin cambios en lógica)
  const registrarVentasConDescuento = async () => {
    if (selectedOrders.size === 0) {
      sweetAlert.warning("Selecciona al menos una orden.");
      return;
    }

    const ordenesSeleccionadas = orders.filter((o) => selectedOrders.has(o.id));
    const ventasParaGuardar: any[] = [];

    for (const orden of ordenesSeleccionadas) {
      for (const item of orden.items) {
        const idProducto = productosConDescuento[item.sku];
        if (idProducto) {
          const fechaISO = new Date(orden.date_created)
            .toISOString()
            .split("T")[0];
          ventasParaGuardar.push({
            idSku: idProducto,
            canalVenta: orden.seller_nickname,
            numeroOperacion: orden.id.toString(),
            cantidad: item.quantity,
            fecha: fechaISO,
          });
        }
      }
    }

    if (ventasParaGuardar.length === 0) {
      sweetAlert.info(
        "Ninguna de las órdenes seleccionadas contiene productos con descuento."
      );
      return;
    }

    sweetAlert.confirm(
      `¿Registrar ${ventasParaGuardar.length} items con descuento en ${ordenesSeleccionadas.length} órdenes (Cuenta ${cuentaSeleccionada})?`,
      async () => {
        try {
          const response = await axios.post(
            Urls.ProductosConDescuento.guardarVenta,
            ventasParaGuardar
          );
          const { count, message } = response.data;

          if (count > 0) {
            sweetAlert.success(`✅ ${count} ventas con descuento registradas.`);
          } else {
            sweetAlert.info(
              `ℹ️ ${message || "No se registraron nuevas ventas."}`
            );
          }
        } catch (error) {
          console.error("Error al registrar ventas:", error);
          sweetAlert.error("Error al registrar las ventas con descuento.");
        }
      }
    );
  };

  // ✅ Función actualizada: ahora incluye "cuenta"
  const handleFetchOrders = async () => {
    if (dias < 1 || dias > 30) {
      sweetAlert.warning("Ingresa un valor entre 1 y 30.");
      return;
    }

    setLoading(true);
    setError(null);
    setOrders([]);
    setSelectedOrders(new Set());

    try {
      // ✅ Añadimos "&cuenta=X" a la URL
      const response = await axios.get<ApiResponse>(
        `${urlGetVentas}${dias}&cuenta=${cuentaSeleccionada}`
      );
      const data = response.data;

      if (data.success && data.data) {
        setOrders(data.data);
      } else {
        setError(data.message || "Error desconocido");
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Error al conectar con el servidor"
      );
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Órdenes de Mercado Libre
      </h2>

      {/* ✅ Selector de cuenta + días */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <label className="text-gray-700 font-medium whitespace-nowrap">
          Cuenta:
          <select
            value={cuentaSeleccionada}
            onChange={(e) => setCuentaSeleccionada(e.target.value)}
            className="ml-2 px-2 py-1 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
          >
            {CUENTAS.map((cuenta) => (
              <option key={cuenta.id} value={cuenta.id}>
                {cuenta.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="text-gray-700 font-medium whitespace-nowrap">
          Últimos días:
          <input
            type="number"
            min="1"
            max="30"
            value={dias}
            onChange={(e) => setDias(Number(e.target.value))}
            className="ml-2 w-20 px-2 py-1 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
          />
        </label>

        <button
          onClick={handleFetchOrders}
          disabled={loading}
          className={`px-4 py-2 rounded font-medium text-white transition whitespace-nowrap ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Cargando..." : "Obtener órdenes"}
        </button>

        <button
          onClick={generatePDF}
          disabled={selectedOrders.size === 0}
          className={`px-4 py-2 rounded font-medium text-white transition whitespace-nowrap ${
            selectedOrders.size === 0
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          Imprimir {selectedOrders.size} seleccionadas
        </button>

        <button
          onClick={registrarVentasConDescuento}
          disabled={selectedOrders.size === 0 || loadingDescuento}
          className={`px-4 py-2 rounded font-medium text-white transition whitespace-nowrap ${
            selectedOrders.size === 0 || loadingDescuento
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-purple-600 hover:bg-purple-700"
          }`}
        >
          {loadingDescuento
            ? "Cargando..."
            : `Registrar ${selectedOrders.size} con descuento`}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-100 text-red-700 rounded flex items-center">
          <span className="mr-2">❌</span> {error}
        </div>
      )}

      {orders.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <p className="text-gray-700">
              Cuenta <span className="font-semibold">{CUENTAS[indice].nombre}</span> —{" "}
              <span className="font-semibold">{orders.length}</span> órdenes
            </p>
            <label className="flex items-center gap-2 text-sm whitespace-nowrap">
              <input
                type="checkbox"
                checked={selectedOrders.size === orders.length}
                onChange={toggleAll}
                className="w-4 h-4"
              />
              Seleccionar todas
            </label>
          </div>

          <div className="space-y-5">
            {orders.map((order) => (
              <div
                key={order.id}
                className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm relative"
              >
                <div className="absolute top-3 right-3">
                  <input
                    type="checkbox"
                    checked={selectedOrders.has(order.id)}
                    onChange={() => toggleOrderSelection(order.id)}
                    className="w-5 h-5"
                  />
                </div>

                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Orden #{order.id}
                  </h3>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      order.etiqueta_impresa
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {order.etiqueta_impresa
                      ? "Etiqueta generada"
                      : "Sin etiqueta"}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mt-2">
                  <span className="font-medium">Comprador:</span>{" "}
                  {order.buyer_nickname}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Vendedor:</span>{" "}
                  {order.seller_nickname}
                </p>

                <p className="text-sm text-gray-600 mt-3">
                  <span className="font-medium">Fecha:</span>{" "}
                  {new Date(order.date_created).toLocaleString("es-AR")}
                </p>

                <div className="mt-3">
                  <p className="font-medium text-gray-700">Items:</p>
                  <ul className="list-disc list-inside mt-1 text-sm text-gray-600">
                    {order.items.map((item, idx) => (
                      <li key={idx}>
                        SKU: <span className="font-mono">{item.sku}</span> —
                        Cantidad: {item.quantity} - <span className="text-gray-500 text-sm">{item.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};