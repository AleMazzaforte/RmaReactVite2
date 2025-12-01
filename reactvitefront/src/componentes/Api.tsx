import { useState, useEffect } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import { sweetAlert } from "./utilidades/SweetAlertWrapper";
import Urls from "./utilidades/Urls";
import Loader from "./utilidades/Loader";

// Tipos actualizados
interface OrderItem {
  sku: string;
  quantity: number;
  description: string;
}

export interface Order {
  numeroOperacion: string;
  buyer_nickname: string;
  seller_nickname: string;
  date_created: string;
  etiqueta_impresa: boolean;
  tipo_envio: string; // ✅ añadido
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

const kitsConDescuento: Record<string, { skuDescuento: string | string[] }> = {
  "KIT GI190 345ML": { skuDescuento: "GI190 N 135ML" },
  "KIT EP544 280ML": { skuDescuento: "EP544 N 70ML" },
  "KIT EP664 400ML": {
    skuDescuento: [
      "EP664-EP673 N 100ML",
      "EP664-EP673 C 100ML",
      "EP664-EP673 M 100ML",
      "EP664-EP673 A 100ML",
    ],
  },
  "KIT EP544-EP664 4L": { skuDescuento: "EP544-EP664-EP673 N" },
};

// ✅ Función para formatear fecha en 24h (solo para visualización)
const formatDateToDisplay = (isoDateString: string): string => {
  const date = new Date(isoDateString);
  if (isNaN(date.getTime())) {
    console.warn("Fecha inválida:", isoDateString);
    return "Fecha inválida";
  }
  return date.toLocaleString('es-AR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

// ✅ Mapeo visual para tipo_envio
const getTipoEnvioLabel = (tipo: string): string => {
  const labels: Record<string, string> = {
    full: "Envío Full",
    mercado_envios: "Mercado Envíos",
    flex: "Flex",
    vendedor: "Vendedor",
    retiro_local: "Retiro en local",
    cancelada: "❌ Cancelada",
    desconocido: "Desconocido"
  };
  return labels[tipo] || tipo;
};

export const Api = () => {
  const [dias, setDias] = useState<number>(3);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<string>("1");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [productosConDescuento, setProductosConDescuento] = useState<
    Record<string, number>
  >({});
  const [loadingDescuento, setLoadingDescuento] = useState<boolean>(true);

  let indice: number = Number(cuentaSeleccionada) - 1;

  const urlGetVentas = Urls.apiMeli.getVentas;


  
  // Cargar productos con descuento (sin cambios)
  useEffect(() => {
    const fetchProductosConDescuento = async () => {
      setLoading(true);
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
        setLoading(false);
      }
    };

    fetchProductosConDescuento();
  }, []);

  // Toggle selección de una orden (sin cambios)
  const toggleOrderSelection = (orderId: string) => {
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
      const allIds = new Set(orders.map((o) => o.numeroOperacion));
      setSelectedOrders(allIds);
    }
  };

  // Generar PDF (con fecha formateada en 24h y tipo de envío)
  const generatePDF = () => {
    const selectedOrdersList = orders.filter((o) => selectedOrders.has(o.numeroOperacion));

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

    selectedOrdersList.forEach((order, index) => {
      if (index > 0 && index % 3 === 0) {
        doc.addPage();
        yPos = margin;
      }

      const startY = yPos;

      // ✅ "Orden #" y "Tipo: ..." en la misma línea (y = yPos + 10)
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`Orden #${order.numeroOperacion}`, margin + 5, yPos + 10);

      const tipoEnvioLabel = getTipoEnvioLabel(order.tipo_envio);
      doc.setFont("helvetica", "normal");
      doc.text(`Tipo: ${tipoEnvioLabel}`, margin + 76, yPos + 10); // mismo Y

      // Badge de etiqueta (ligera subida si era +6 antes)
      const badgeText = order.etiqueta_impresa
        ? "Etiqueta generada"
        : "Sin etiqueta";
      const badgeWidth = doc.getTextWidth(badgeText) + 6;
      const badgeX = margin + cardWidth - badgeWidth - 3;
      const badgeY = yPos + 6; // sigue igual (arriba del título, no cambia)
      doc.setFillColor(
        order.etiqueta_impresa ? 220 : 255,
        order.etiqueta_impresa ? 255 : 255,
        220
      );
      doc.rect(badgeX, badgeY, badgeWidth, 8, "F");
      doc.setTextColor(0);
      doc.setFontSize(10);
      doc.text(badgeText, badgeX + 3, badgeY + 5);

      // ✅ Todo sube: ahora currentY empieza en yPos + 18 (en lugar de +22)
      let currentY = yPos + 18;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Comprador: ${order.buyer_nickname}`, margin + 5, currentY);
      currentY += 6;
      doc.text(`Vendedor: ${order.seller_nickname}`, margin + 5, currentY);
      currentY += 6;
      const formattedDate = formatDateToDisplay(order.date_created);
      doc.text(`Fecha: ${formattedDate}`, margin + 5, currentY);
      currentY += 8;

      doc.setFont("helvetica", "normal");
      doc.text("", margin + 5, currentY);
      currentY += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      order.items.forEach((item) => {
        doc.rect(margin + 5, currentY - 3, checkboxSize, checkboxSize);
        doc.text(`${item.sku} — ${item.quantity} Un. ${item.description}`, margin + 11, currentY);
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

      doc.setDrawColor(0, 0, 0);
      doc.rect(margin, startY, cardWidth, cardHeight);
      yPos = startY + cardHeight + 8;
    });

    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
  };

  // Registrar ventas con descuento /////////////////////////////////////////////////////////
const registrarVentasConDescuento = async () => {
  if (selectedOrders.size === 0) {
    sweetAlert.warning("Selecciona al menos una orden.");
    return;
  }

  const ordenesSeleccionadas = orders.filter((o) => selectedOrders.has(o.numeroOperacion));

  // ✅ Paso previo: manejo opcional de órdenes canceladas existentes
  const ordenesCanceladasSeleccionadas = ordenesSeleccionadas.filter(o => o.tipo_envio === "cancelada");
  if (ordenesCanceladasSeleccionadas.length > 0) {
    setLoading(true);
    try {
      const numerosOperacionCanceladas = ordenesCanceladasSeleccionadas.map(o => o.numeroOperacion);
      const response = await axios.post(Urls.ProductosConDescuento.verificarExistencia, {
        numerosOperacion: numerosOperacionCanceladas
      });
      const { existentes } = response.data;

      if (existentes.length > 0) {
        setLoading(false);
        const result = await sweetAlert.fire({
          title: "¿Eliminar órdenes canceladas?",
          html: `Hay <strong>${existentes.length}</strong> órdenes canceladas ya registradas.<br/>¿Deseas eliminarlas?`,
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "Sí, eliminar",
          cancelButtonText: "No",
          reverseButtons: true,
          customClass: {
            popup: "animate-swal-shake !border !border-blue-500",
            confirmButton: "bg-red-600 text-white",
            cancelButton: "bg-gray-300 text-black",
          }
        });

        if (result.isConfirmed) {
          setLoading(true);
          await axios.post(Urls.ProductosConDescuento.eliminarOrdenes, {
            numerosOperacion: existentes
          });
          sweetAlert.success(`✅ ${existentes.length} órdenes eliminadas.`);
        }
      }
    } catch (error) {
      console.error("Error en verificación/borrado:", error);
      sweetAlert.error("Error al procesar órdenes canceladas.");
      setLoading(false);
      return;
    }
    setLoading(false);
  }

  // ✅ A PARTIR DE AQUÍ: TU LÓGICA ACTUAL (con filtro de canceladas)
  const acumulador: Record<string, {
    idSku: number;
    canalVenta: string;
    numeroOperacion: string;
    fecha: string;
    cantidad: number;
  }> = {};

  for (const orden of ordenesSeleccionadas) {
    const fechaISO = new Date(orden.date_created).toISOString().split("T")[0];
    const numeroOperacion = orden.numeroOperacion;
    const canalVenta = orden.seller_nickname;

    for (const item of orden.items) {
      const { sku, quantity } = item;

      const acumular = (skuDescuento: string, qty: number) => {
        const idSku = productosConDescuento[skuDescuento];
        if (idSku == null) return;
        if (orden.tipo_envio === "cancelada") return; // ✅ omitir canceladas

        const clave = `${numeroOperacion}-${idSku}`;
        if (acumulador[clave]) {
          acumulador[clave].cantidad += qty;
        } else {
          acumulador[clave] = {
            idSku,
            canalVenta,
            numeroOperacion,
            fecha: fechaISO,
            cantidad: qty,
          };
        }
      };

      if (productosConDescuento[sku] !== undefined) {
        acumular(sku, quantity);
      }

      const kitInfo = kitsConDescuento[sku];
      if (kitInfo) {
        const skus = Array.isArray(kitInfo.skuDescuento)
          ? kitInfo.skuDescuento
          : [kitInfo.skuDescuento];
        skus.forEach((s) => acumular(s, quantity));
      }
    }
  }

  const ventasParaGuardar = Object.values(acumulador);
console.log(ventasParaGuardar);

  if (ventasParaGuardar.length === 0) {
    sweetAlert.info("Ninguna orden seleccionada tiene productos con descuento.");
    return;
  }

   const ventasParaGuardarComoString = ventasParaGuardar.map(venta => ({
    ...venta,
    numeroOperacion: String(venta.numeroOperacion) // ✅ ¡esto es crucial!
  }));

  // ✅ Aquí se envían al backend, que FILTRA DUPLICADOS
  sweetAlert.confirm(
    `¿Registrar ${ventasParaGuardar.length} items con descuento?`,
    async () => {
      setLoading(true);
      try {
        const response = await axios.post(Urls.ProductosConDescuento.guardarVenta, ventasParaGuardarComoString);
        const { count, message } = response.data;
        if (count > 0) {
          sweetAlert.success(`✅ ${count} ventas registradas.`);
        } else {
          sweetAlert.info(`ℹ️ ${message || "Ya estaban registradas."}`);
        }
      } catch (error) {
        sweetAlert.error("Error al registrar ventas.");
      } finally {
        setLoading(false);
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
      {loading && <Loader />}
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Órdenes de Mercado Libre
      </h2>

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
          className={`px-4 py-2 rounded font-medium text-white transition whitespace-nowrap ${loading
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
            }`}
        >
          {loading ? "Cargando..." : "Obtener órdenes"}
        </button>

        <button
          onClick={generatePDF}
          disabled={selectedOrders.size === 0}
          className={`px-4 py-2 rounded font-medium text-white transition whitespace-nowrap ${selectedOrders.size === 0
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-green-600 hover:bg-green-700"
            }`}
        >
          Imprimir {selectedOrders.size} seleccionadas
        </button>

        <button
          onClick={registrarVentasConDescuento}
          disabled={selectedOrders.size === 0 || loadingDescuento}
          className={`px-4 py-2 rounded font-medium text-white transition whitespace-nowrap ${selectedOrders.size === 0 || loadingDescuento
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
              Cuenta <span className="font-bold">{CUENTAS[indice].nombre}</span> —{" "}
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
                key={order.numeroOperacion}
                className={`rounded-lg p-5 shadow-sm relative border ${order.tipo_envio === "cancelada"
                  ? "bg-gray-100 border-gray-300"
                  : order.tipo_envio === "retiro_local"
                    ? "bg-amber-50 border-amber-200"
                    : "bg-white border-gray-200"
                  }`}
              >
                <div className="absolute top-3 right-3">
                  <input
                    type="checkbox"
                    checked={selectedOrders.has(order.numeroOperacion)}
                    onChange={() => toggleOrderSelection(order.numeroOperacion)}
                    className="w-5 h-5"
                  />
                </div>

                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      Orden #{order.numeroOperacion}
                    </h3>

                  </div>

                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-medium">Envío: </span>
                    <span className="font-semibold">{getTipoEnvioLabel(order.tipo_envio)}</span>
                  </p>
                  <div
                    className={`px-2 py-1 mr-10 text-xs font-medium rounded-full ${order.etiqueta_impresa
                      ? "bg-green-100 text-green-800"
                      : "bg-blue-100 text-blue-800"
                      }`}
                  >
                    {order.etiqueta_impresa
                      ? "Etiqueta generada"
                      : "Sin etiqueta"}
                  </div>
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
                  {formatDateToDisplay(order.date_created)}
                </p>

                <div className="mt-3">
                  <p className=" text-gray-700">Items:</p>
                  <ul className="list-disc list-inside mt-1 text-sm text-gray-600">
                    {order.items.map((item, idx) => (
                      <li key={idx}>
                        <span className="font-bold">{item.sku}</span> —{" "}
                        <span className="font-bold">{item.quantity} Un.</span>- <span className="text-gray-500 text-sm">{item.description}</span>
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
