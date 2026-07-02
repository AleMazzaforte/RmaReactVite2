import { useState, useEffect } from "react";
import axios from "axios";
import { sweetAlert } from "./utilidades/SweetAlertWrapper";
import Urls from "./utilidades/Urls";
import Loader from "./utilidades/Loader";
import BotonCargarTxt from "./utilidades/BotonCargarTxt";
import { generateEnviosPDF } from "./utilidades/pdfGenerators";
import { printRetiroLocalHTML } from "./utilidades/printUtils";
import { PdfGenerarConsolidado } from "./utilidades/pdfGenerarConsolidado";

// ─── Tipos ──────────────────────────────────────────────────────────────────

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
  tipo_envio: string;
  items: OrderItem[];
  buyer_full_name?: string;
  shipping_status?: string;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data?: Order[];
}

// ─── Constantes ─────────────────────────────────────────────────────────────

const SELLER_FEMEX = "FEMEX";
const SELLER_BLOW = "BLOW INK";

const kitsConDescuento: Record<string, { skuDescuento: string | string[] }> = {
  "KIT GI190 345ML": {
    skuDescuento: ["GI190 N 135ML", "GI190 C 70ML", "GI190 M 70ML", "GI190 A 70ML"],
  },
  "KIT EP544 280ML": { skuDescuento: "EP544 N 70ML" },
  "KIT EP664 400ML": {
    skuDescuento: [
      "EP664-EP673 N 100ML", "EP664-EP673 C 100ML",
      "EP664-EP673 M 100ML", "EP664-EP673 A 100ML",
    ],
  },
  "KIT EP673 600ML": {
    skuDescuento: [
      "EP664-EP673 N 100ML", "EP664-EP673 C 100ML",
      "EP664-EP673 M 100ML", "EP664-EP673 A 100ML",
      "EP673 LC 100ML", "EP673 LM 100ML",
    ],
  },
  "KIT H901XL": { skuDescuento: ["H901XL N", "H901XL C"] },
  "KIT EP73-EP117": { skuDescuento: ["EP117 N"] },
  "KIT EP544-EP664 4L": { skuDescuento: "EP544-EP664-EP673 N" },
  "KIT EP73-EP115": { skuDescuento: "EP115 N" },
  "KIT EP73-EP90": { skuDescuento: "EP90 N" },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatDateToDisplay = (isoDateString: string): string => {
  const date = new Date(isoDateString);
  if (isNaN(date.getTime())) return "Fecha inválida";
  return date.toLocaleString("es-AR", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
};

const getTipoEnvioLabel = (tipo: string): string => {
  const labels: Record<string, string> = {
    full: "Envío Full",
    mercado_envios: "Mercado Envíos",
    flex: "Flex",
    vendedor: "Vendedor",
    retiro_local: "Retiro en local",
    cancelada: "❌ Cancelada",
    desconocido: "Desconocido",
  };
  return labels[tipo] || tipo;
};

const getShippingStatusLabel = (status?: string, tipoEnvio?: string): { label: string; color: string } => {
  const statusMap: Record<string, { label: string; color: string }> = {
    'ready_to_print': { label: '📄 Etiqueta generada', color: 'bg-blue-100 text-blue-800' },
    'printed': { label: '🖨️ Etiqueta impresa', color: 'bg-green-100 text-green-800' },
    'handling': { label: '⚙️ En proceso', color: 'bg-yellow-100 text-yellow-800' },
    'shipped': { label: '🚚 Enviado', color: 'bg-purple-100 text-purple-800' },
    'delivered': { label: '✅ Entregado', color: 'bg-emerald-100 text-emerald-800' },
    'not_visited': { label: '⚠️ No visitado', color: 'bg-orange-100 text-orange-800' },
    'cancelled': { label: '❌ Cancelado', color: 'bg-red-100 text-red-800' },
    'in_packing_list': { label: '📦 En lista de empaque', color: 'bg-indigo-100 text-indigo-800' },
    'error': { label: '⚠️ Error al obtener', color: 'bg-gray-100 text-gray-800' },
    'unknown': { label: '❓ Sin estado', color: 'bg-gray-100 text-gray-800' },
    'no_shipping': { label: '📭 Sin etiqueta', color: 'bg-amber-100 text-amber-800' }
  };

  return statusMap[status || 'unknown'] || { label: '❓ Desconocido', color: 'bg-gray-100 text-gray-800' };
};

const extraerIdsDeEtiqueta = (contenido: string): string[] => {
  const regex = /\^FO198,40\^A0N,30,30\^FD(\d+)\^FS/g;
  const ids: string[] = [];
  let match;
  while ((match = regex.exec(contenido)) !== null) {
    ids.push(match[1]);
  }
  return [...new Set(ids)];
};

// ─── Componente Columna ─────────────────────────────────────────────────────

interface ColumnaOrdenesProps {
  titulo: string;
  orders: Order[];
  ordenesVisibles: Order[];
  setOrdenesVisibles: React.Dispatch<React.SetStateAction<Order[]>>;
  mostrarMultiples: boolean;
  setMostrarMultiples: (v: boolean) => void;
  selectedOrders: Set<string>;
  toggleOrderSelection: (orderId: string) => void;
  onToggleAll: (ids: string[]) => void;
}

const ColumnaOrdenes: React.FC<ColumnaOrdenesProps> = ({
  titulo,
  orders,
  ordenesVisibles,
  setOrdenesVisibles,
  mostrarMultiples,
  setMostrarMultiples,
  selectedOrders,
  toggleOrderSelection,
  onToggleAll,
}) => {
  const baseOrders = ordenesVisibles.length > 0 ? ordenesVisibles : orders;

  const ordersFiltradas = baseOrders.filter((o) => {
    if (mostrarMultiples && o.items.length <= 1) return false;
    return true;
  });

  const idsBase = baseOrders.map((o) => o.numeroOperacion);
  const todasSeleccionadas =
    idsBase.length > 0 && idsBase.every((id) => selectedOrders.has(id));

  const cantidadMultiples = orders.filter((o) => o.items.length > 1).length;

  if (orders.length === 0) return null;

  return (
    <div className="flex-1 min-w-0">
      {/* Header de columna */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2 sticky top-0 bg-white/90 backdrop-blur z-10 py-2 rounded">
        <p className="text-gray-700">
          <span className="font-bold text-lg">{titulo}</span> —{" "}
          <span className="font-semibold">{orders.length}</span> órdenes
          {mostrarMultiples && (
            <span className="ml-2 text-xs text-blue-600">
              (mostrando {cantidadMultiples} con +1 producto)
            </span>
          )}
        </p>
        <div className="flex items-center gap-3">
          {ordenesVisibles.length > 0 && (
            <button
              onClick={() => setOrdenesVisibles([])}
              className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition whitespace-nowrap"
            >
              ✕ Ver todas ({orders.length})
            </button>
          )}
          <label className="flex items-center gap-1.5 text-sm whitespace-nowrap cursor-pointer">
            <input
              type="checkbox"
              checked={mostrarMultiples}
              onChange={(e) => setMostrarMultiples(e.target.checked)}
              className="w-4 h-4"
            />
            +1 SKU
          </label>
          <label className="flex items-center gap-1.5 text-sm whitespace-nowrap cursor-pointer">
            <input
              type="checkbox"
              checked={todasSeleccionadas}
              onChange={() => onToggleAll(idsBase)}
              className="w-4 h-4"
            />
            Seleccionar todas
          </label>
        </div>
      </div>

      {/* Lista de órdenes */}
      <div className="space-y-4">
        {ordersFiltradas.map((order) => (
          <div
            key={order.numeroOperacion}
            className={`rounded-lg p-4 shadow-sm relative border ${order.tipo_envio === "cancelada"
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
                className="w-5 h-5 cursor-pointer"
              />
            </div>

            <div className="flex justify-between items-start pr-8">
              <h3 className="text-base font-semibold text-gray-800">
                Orden #{order.numeroOperacion}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  <span className="font-semibold">
                    {getTipoEnvioLabel(order.tipo_envio)}
                  </span>
                </span>
                {(() => {
                  const statusInfo = getShippingStatusLabel(order.shipping_status, order.tipo_envio);
                  return (
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusInfo.color}`}
                      title={`Status: ${order.shipping_status || 'desconocido'}`}
                    >
                      {statusInfo.label}
                    </span>
                  );
                })()}
              </div>
            </div>

            <p className="text-sm text-gray-600 mt-1">
              <span className="font-medium">Comprador:</span>{" "}
              {order.buyer_full_name} ({order.buyer_nickname})
            </p>

            <p className="text-sm text-gray-600 mt-1">
              <span className="font-medium">Fecha:</span>{" "}
              {formatDateToDisplay(order.date_created)}
            </p>

            <div className="mt-2">
              <p className="text-sm text-gray-700 font-medium">Items:</p>
              <ul className="list-disc list-inside mt-1 text-sm text-gray-600">
                {order.items.map((item, idx) => (
                  <li key={idx}>
                    <span className="font-bold">{item.sku}</span> —{" "}
                    <span className="font-bold">{item.quantity} Un.</span> —{" "}
                    <span className="text-gray-500">{item.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Componente Principal ───────────────────────────────────────────────────

export const MercadoLibre = () => {
  // Días independientes
  const [diasFemex, setDiasFemex] = useState<number>(3);
  const [diasBlow, setDiasBlow] = useState<number>(3);

  // Órdenes por empresa
  const [ordersFemex, setOrdersFemex] = useState<Order[]>([]);
  const [ordersBlow, setOrdersBlow] = useState<Order[]>([]);

  // Filtrado por etiqueta por empresa
  const [ordenesVisiblesFemex, setOrdenesVisiblesFemex] = useState<Order[]>([]);
  const [ordenesVisiblesBlow, setOrdenesVisiblesBlow] = useState<Order[]>([]);

  // Filtros +1 SKU por empresa
  const [mostrarMultiplesFemex, setMostrarMultiplesFemex] = useState(false);
  const [mostrarMultiplesBlow, setMostrarMultiplesBlow] = useState(false);

  // Estado global compartido
  const [loading, setLoading] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [productosConDescuento, setProductosConDescuento] = useState<Record<string, number>>({});
  const [loadingDescuento, setLoadingDescuento] = useState(true);

  const [nombreArchivo, setNombreArchivo] = useState("");
  const [contenidoTxt, setContenidoTxt] = useState("");

  const urlGetVentas = Urls.apiMeli.getVentas;

  // Todas las órdenes combinadas (para funciones globales)
  const allOrders = [...ordersFemex, ...ordersBlow];

  // ─── Cargar productos con descuento ─────────────────────────────────────

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

  // ─── Selección ──────────────────────────────────────────────────────────

  const toggleOrderSelection = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const toggleAllForIds = (ids: string[]) => {
    const todasSeleccionadas = ids.length > 0 && ids.every((id) => selectedOrders.has(id));
    const newSelected = new Set(selectedOrders);
    if (todasSeleccionadas) {
      ids.forEach((id) => newSelected.delete(id));
    } else {
      ids.forEach((id) => newSelected.add(id));
    }
    setSelectedOrders(newSelected);
  };

  // ─── Fetch de órdenes (paralelo) ───────────────────────────────────────

  const handleFetchOrders = async () => {
    if (diasFemex < 1 || diasFemex > 30 || diasBlow < 1 || diasBlow > 30) {
      sweetAlert.warning("Ingresá valores entre 1 y 30 días.");
      return;
    }

    setLoading(true);
    setSelectedOrders(new Set());
    setOrdenesVisiblesFemex([]);
    setOrdenesVisiblesBlow([]);
    setMostrarMultiplesFemex(false);
    setMostrarMultiplesBlow(false);

    try {
      const [resFemex, resBlow] = await Promise.allSettled([
        axios.get<ApiResponse>(`${urlGetVentas}${diasFemex}&cuenta=1`),
        axios.get<ApiResponse>(`${urlGetVentas}${diasBlow}&cuenta=2`),
      ]);

      // Femex
      if (resFemex.status === "fulfilled") {
        const data = resFemex.value.data;
        if (data.success && data.data) {
          setOrdersFemex(data.data);
        } else {
          sweetAlert.error(`Femex: ${data.message || "Error desconocido"}`);
          setOrdersFemex([]);
        }
      } else {
        sweetAlert.error("Femex: Error al conectar con el servidor.");
        setOrdersFemex([]);
      }

      // Blow
      if (resBlow.status === "fulfilled") {
        const data = resBlow.value.data;
        if (data.success && data.data) {
          setOrdersBlow(data.data);
        } else {
          sweetAlert.error(`Blow: ${data.message || "Error desconocido"}`);
          setOrdersBlow([]);
        }
      } else {
        sweetAlert.error("Blow: Error al conectar con el servidor.");
        setOrdersBlow([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Carga de archivo de etiquetas ─────────────────────────────────────

  const handleArchivoTxt = (content: string, fileName: string) => {
    setNombreArchivo(fileName);
    const idsDelArchivo = extraerIdsDeEtiqueta(content);

    if (idsDelArchivo.length === 0) {
      sweetAlert.warning("No se encontraron IDs de venta en el archivo. Verificá el formato del ZPL.");
      return;
    }

    if (ordersFemex.length === 0 && ordersBlow.length === 0) {
      sweetAlert.warning(
        `Se encontraron ${idsDelArchivo.length} IDs en el archivo, pero no hay órdenes cargadas. Primero obtené las órdenes.`
      );
      return;
    }

    // Buscar coincidencias en cada empresa por separado
    const coincidentesFemex = ordersFemex.filter((o) => {
      const num = String(o.numeroOperacion);
      return idsDelArchivo.some((id) => num.endsWith(id) || id.endsWith(num));
    });

    const coincidentesBlow = ordersBlow.filter((o) => {
      const num = String(o.numeroOperacion);
      return idsDelArchivo.some((id) => num.endsWith(id) || id.endsWith(num));
    });

    const totalCoincidentes = coincidentesFemex.length + coincidentesBlow.length;

    if (totalCoincidentes === 0) {
      sweetAlert.warning(
        `Se encontraron ${idsDelArchivo.length} IDs en el archivo, pero ninguna coincide con las órdenes cargadas.`
      );
      setContenidoTxt("");
      setNombreArchivo("");
      return;
    }

    // Filtrar solo la columna que tenga coincidencias (acumulando)
    if (coincidentesFemex.length > 0) {
      setOrdenesVisiblesFemex((prev) => {
        const existentes = new Set(prev.map((o) => o.numeroOperacion));
        const nuevas = coincidentesFemex.filter((o) => !existentes.has(o.numeroOperacion));
        return [...prev, ...nuevas];
      });
    }

    if (coincidentesBlow.length > 0) {
      setOrdenesVisiblesBlow((prev) => {
        const existentes = new Set(prev.map((o) => o.numeroOperacion));
        const nuevas = coincidentesBlow.filter((o) => !existentes.has(o.numeroOperacion));
        return [...prev, ...nuevas];
      });
    }

    // IDs no encontrados
    const noEncontrados = idsDelArchivo.filter(
      (id) =>
        !allOrders.some((o) => {
          const num = String(o.numeroOperacion);
          return num.endsWith(id) || id.endsWith(num);
        })
    );

    let mensaje = `✅ Se filtraron ${totalCoincidentes} órdenes a partir de "${fileName}".`;
    if (coincidentesFemex.length > 0) mensaje += `<br/>📦 Femex: ${coincidentesFemex.length}`;
    if (coincidentesBlow.length > 0) mensaje += `<br/>📦 Blow: ${coincidentesBlow.length}`;
    if (noEncontrados.length > 0) {
      mensaje += `<br/><br/>⚠️ ${noEncontrados.length} IDs no se encontraron.`;
    }

    sweetAlert.fire({
      title: "Órdenes filtradas",
      html: mensaje,
      icon: totalCoincidentes === idsDelArchivo.length ? "success" : "warning",
      confirmButtonText: "OK",
    });
  };

  const handleConsolidadoStock = () => {
    PdfGenerarConsolidado(allOrders, selectedOrders, [...ordenesVisiblesFemex, ...ordenesVisiblesBlow]);
  };

  // ─── Registrar ventas con descuento ─────────────────────────────────────

  const registrarVentasConDescuento = async () => {
    if (selectedOrders.size === 0) {
      sweetAlert.warning("Seleccioná al menos una orden.");
      return;
    }

    const ordenesSeleccionadas = allOrders.filter((o) => selectedOrders.has(o.numeroOperacion));

    // Manejo de canceladas
    const ordenesCanceladasSeleccionadas = ordenesSeleccionadas.filter(
      (o) => o.tipo_envio === "cancelada"
    );
    if (ordenesCanceladasSeleccionadas.length > 0) {
      setLoading(true);
      try {
        const numerosOperacionCanceladas = ordenesCanceladasSeleccionadas.map(
          (o) => o.numeroOperacion
        );
        const response = await axios.post(Urls.ProductosConDescuento.verificarExistencia, {
          numerosOperacion: numerosOperacionCanceladas,
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
            },
          });

          if (result.isConfirmed) {
            setLoading(true);
            await axios.post(Urls.ProductosConDescuento.eliminarOrdenes, {
              numerosOperacion: existentes,
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

    // Acumulador
    const acumulador: Record<
      string,
      { idSku: number; canalVenta: string; numeroOperacion: string; fecha: string; cantidad: number }
    > = {};

    for (const orden of ordenesSeleccionadas) {
      const fechaISO = new Date(orden.date_created).toISOString().split("T")[0];
      const numeroOperacion = orden.numeroOperacion;
      const canalVenta = orden.seller_nickname;

      for (const item of orden.items) {
        const { sku, quantity } = item;

        const acumular = (skuDescuento: string, qty: number) => {
          const idSku = productosConDescuento[skuDescuento];
          if (idSku == null) return;
          if (orden.tipo_envio === "cancelada") return;

          const clave = `${numeroOperacion}-${idSku}`;
          if (acumulador[clave]) {
            acumulador[clave].cantidad += qty;
          } else {
            acumulador[clave] = { idSku, canalVenta, numeroOperacion, fecha: fechaISO, cantidad: qty };
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

    if (ventasParaGuardar.length === 0) {
      sweetAlert.info("Ninguna orden seleccionada tiene productos con descuento.");
      return;
    }

    const ventasParaGuardarComoString = ventasParaGuardar.map((venta) => ({
      ...venta,
      numeroOperacion: String(venta.numeroOperacion),
    }));

    sweetAlert.confirm(
      `¿Registrar ${ventasParaGuardar.length} items con descuento?`,
      async () => {
        setLoading(true);
        try {
          const response = await axios.post(
            Urls.ProductosConDescuento.guardarVenta,
            ventasParaGuardarComoString
          );
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



  // ─── Render ─────────────────────────────────────────────────────────────

  const hayOrdenes = ordersFemex.length > 0 || ordersBlow.length > 0;

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {loading && <Loader />}

      <h2 className="text-2xl font-bold text-gray-800 mb-6">Órdenes de Mercado Libre</h2>

      {/* ── Controles superiores ─────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-end gap-4">
        {/* Días Femex */}
        <label className="text-gray-700 font-medium whitespace-nowrap">
          <span className="text-blue-700">Femex</span> días:
          <input
            type="number"
            min="1"
            max="30"
            value={diasFemex}
            onChange={(e) => setDiasFemex(Number(e.target.value))}
            className="ml-2 w-16 px-2 py-1 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
          />
        </label>

        {/* Días Blow */}
        <label className="text-gray-700 font-medium whitespace-nowrap">
          <span className="text-orange-600">Blow</span> días:
          <input
            type="number"
            min="1"
            max="30"
            value={diasBlow}
            onChange={(e) => setDiasBlow(Number(e.target.value))}
            className="ml-2 w-16 px-2 py-1 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
          />
        </label>

        {/* Fetch */}
        <button
          onClick={handleFetchOrders}
          disabled={loading}
          className={`px-4 py-2 rounded font-medium text-white transition whitespace-nowrap ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
        >
          {loading ? "Cargando..." : "Obtener órdenes"}
        </button>

        {/* Imprimir envíos */}
        <button
          onClick={() => generateEnviosPDF(allOrders, selectedOrders)}
          disabled={
            !allOrders.some(
              (o) => selectedOrders.has(o.numeroOperacion) && o.tipo_envio !== "retiro_local"
            )
          }
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
        >
          Imprimir envíos
        </button>

        {/* Imprimir constancias */}
        <button
          onClick={() => printRetiroLocalHTML(allOrders, selectedOrders)}
          disabled={
            !allOrders.some(
              (o) => selectedOrders.has(o.numeroOperacion) && o.tipo_envio === "retiro_local"
            )
          }
          className="px-4 py-2 bg-amber-600 text-white rounded disabled:bg-gray-400"
        >
          Imprimir constancias (retiro en local)
        </button>

        {/* Registrar con descuento */}
        <button
          onClick={registrarVentasConDescuento}
          disabled={selectedOrders.size === 0 || loadingDescuento}
          className={`px-4 py-2 rounded font-medium text-white transition whitespace-nowrap ${selectedOrders.size === 0 || loadingDescuento
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-purple-600 hover:bg-purple-700"
            }`}
        >
          {loadingDescuento ? "Cargando..." : `Registrar ${selectedOrders.size} con descuento`}
        </button>

        {/* Cargar etiquetas */}
        <BotonCargarTxt onFileRead={handleArchivoTxt} label="Cargar etiquetas (.txt)" />
        <button
          onClick={handleConsolidadoStock}
          disabled={allOrders.length === 0}
          className="px-4 py-2 bg-green-600 text-white rounded disabled:bg-gray-400"
        >
          Consolidado de stock
        </button>
      </div>

      {/* ── Columnas ─────────────────────────────────────────────────────── */}
      {hayOrdenes && (
        <div className="flex gap-6">
          {/* Femex (izquierda) */}
          <ColumnaOrdenes
            titulo="Femex"
            orders={ordersFemex}
            ordenesVisibles={ordenesVisiblesFemex}
            setOrdenesVisibles={setOrdenesVisiblesFemex}
            mostrarMultiples={mostrarMultiplesFemex}
            setMostrarMultiples={setMostrarMultiplesFemex}
            selectedOrders={selectedOrders}
            toggleOrderSelection={toggleOrderSelection}
            onToggleAll={toggleAllForIds}
          />

          {/* Blow (derecha) */}
          <ColumnaOrdenes
            titulo="Blow"
            orders={ordersBlow}
            ordenesVisibles={ordenesVisiblesBlow}
            setOrdenesVisibles={setOrdenesVisiblesBlow}
            mostrarMultiples={mostrarMultiplesBlow}
            setMostrarMultiples={setMostrarMultiplesBlow}
            selectedOrders={selectedOrders}
            toggleOrderSelection={toggleOrderSelection}
            onToggleAll={toggleAllForIds}
          />
        </div>
      )}
    </div>
  );
};