import { useState, useEffect, useRef } from "react";
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
  codigoBarras: string | null;
  codigosBarrasComponentes?: string[]
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



interface ItemVerificacion {
  sku: string;
  codigoBarras: string | null;
  quantity: number;
  esComponenteKit: boolean;
  skuKitOriginal?: string;
}

interface KitInfo {
  id: number;
  componentes: Array<{
    idSku: number;
    sku: string;
    cantidad: number;
    codigoBarras: string | null;
  }>;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data?: Order[];
  kits?: Record<string, KitInfo>; 
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
    'unknown': { label: 'Sin estado', color: 'bg-gray-100 text-gray-800' },
    'no_shipping': { label: '📭 Sin etiqueta', color: 'bg-amber-100 text-amber-800' }
  };
  return statusMap[status || 'unknown'] || { label: 'Sin estado', color: 'bg-gray-100 text-gray-800' };
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

// ─── 🆕 Helpers de Scanner ─────────────────────────────────────────────────
// Función helper fuera del componente
const expandirOrdenParaVerificacion = (
  orden: Order, 
  kitsMap: Record<string, KitInfo> // 🆕 Agregar parámetro
): ItemVerificacion[] => {
  const itemsVerificacion: ItemVerificacion[] = [];

  for (const item of orden.items) {
    const kitInfo = kitsMap[item.sku]; // ✅ Ahora usa el parámetro

    if (kitInfo && item.codigosBarrasComponentes?.length) {
      const skusAplanados: string[] = [];
      for (const comp of kitInfo.componentes) {
        for (let i = 0; i < comp.cantidad; i++) {
          skusAplanados.push(comp.sku);
        }
      }
      
      skusAplanados.forEach((skuComp, index) => {
        itemsVerificacion.push({
          sku: skuComp,
          codigoBarras: item.codigosBarrasComponentes?.[index] || null,
          quantity: item.quantity,
          esComponenteKit: true,
          skuKitOriginal: item.sku,
        });
      });
    } else {
      itemsVerificacion.push({
        sku: item.sku,
        codigoBarras: item.codigoBarras,
        quantity: item.quantity,
        esComponenteKit: false,
      });
    }
  }

  return itemsVerificacion;
};

// Lo mismo para expandirKitsEnOrdenes
const expandirKitsEnOrdenes = (
  ordenes: Order[], 
  kitsMap: Record<string, KitInfo> // 🆕 Agregar parámetro
): Order[] => {
  return ordenes.map((orden) => {
    const itemsExpandidos: OrderItem[] = [];

    for (const item of orden.items) {
      const kitInfo = kitsMap[item.sku]; // ✅ Ahora usa el parámetro

      if (kitInfo) {
        for (const comp of kitInfo.componentes) {
          for (let i = 0; i < comp.cantidad; i++) {
            itemsExpandidos.push({
              sku: comp.sku,
              quantity: item.quantity,
              description: `[Kit] ${comp.sku} (de ${item.sku})`,
              codigoBarras: comp.codigoBarras,
            });
          }
        }
      } else {
        itemsExpandidos.push(item);
      }
    }

    return { ...orden, items: itemsExpandidos };
  });
};


const expandirOrdenIndividual = (
  orden: Order, 
  kitsMap: Record<string, KitInfo>
): Order => {
  const itemsExpandidos: OrderItem[] = [];

  for (const item of orden.items) {
    const kitInfo = kitsMap[item.sku];

    if (kitInfo) {
      for (const comp of kitInfo.componentes) {
        for (let i = 0; i < comp.cantidad; i++) {
          itemsExpandidos.push({
            sku: comp.sku,
            quantity: item.quantity,
            description: `[Kit] ${comp.sku} (de ${item.sku})`,
            codigoBarras: comp.codigoBarras,
          });
        }
      }
    } else {
      itemsExpandidos.push(item);
    }
  }

  return { ...orden, items: itemsExpandidos };
};

const contarEscaneados = (
  codigoBarras: string,
  numeroOperacion: string,
  scansPorOrden: Record<string, string[]>
): number => {
  const scans = scansPorOrden[numeroOperacion] || [];
  return scans.filter((s) => s === codigoBarras).length;
};

const getProgresoOrden = (
  orden: Order,
  scansPorOrden: Record<string, string[]>,
  kitsMap?: Record<string, KitInfo> // 🆕 Agregar parámetro opcional
): { total: number; verificados: number; items: (OrderItem & { verificados: number })[] } => {
  // 🆕 Expandir orden si se pasa kitsMap
  const ordenProcesada = kitsMap ? expandirOrdenIndividual(orden, kitsMap) : orden;
  const scans = scansPorOrden[ordenProcesada.numeroOperacion] || [];

  const itemsConProgreso = ordenProcesada.items.map((item) => {
    const verificados = item.codigoBarras
      ? scans.filter((s) => s === item.codigoBarras).length
      : 0;
    return {
      ...item,
      verificados: Math.min(verificados, item.quantity),
    };
  });

  const total = ordenProcesada.items.reduce((sum, i) => sum + i.quantity, 0);
  const verificados = itemsConProgreso.reduce((sum, i) => sum + i.verificados, 0);

  return { total, verificados, items: itemsConProgreso };
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
  // 🆕 Props de scanner
  modoScanner: boolean;
  onIniciarScan: (numeroOperacion: string) => void;
  scansPorOrden: Record<string, string[]>;
  kitsMap: Record<string, KitInfo>;
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
  // 🆕
  modoScanner,
  onIniciarScan,
  scansPorOrden,
  kitsMap,
}) => {
  const baseOrders = ordenesVisibles.length > 0 ? ordenesVisibles : orders;

  const ordersFiltradas = baseOrders.filter((o) => {
    // 🆕 En modo scanner, ocultar Envío Full (no las arma el usuario)
    if (modoScanner && o.tipo_envio === "full") return false;
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
          {!modoScanner && (
            <label className="flex items-center gap-1.5 text-sm whitespace-nowrap cursor-pointer">
              <input
                type="checkbox"
                checked={todasSeleccionadas}
                onChange={() => onToggleAll(idsBase)}
                className="w-4 h-4"
              />
              Seleccionar todas
            </label>
          )}
        </div>
      </div>

      {/* Lista de órdenes */}
      <div className="space-y-4">
        {ordersFiltradas.map((order) => {
          // 🆕 Calcular progreso si hay scans
          const progreso = modoScanner ? getProgresoOrden(order, scansPorOrden, kitsMap) : null;
          const completo = progreso ? progreso.verificados === progreso.total && progreso.total > 0 : false;

          return (
            <div
              key={order.numeroOperacion}
              className={`rounded-lg p-4 shadow-sm relative border transition-all ${order.tipo_envio === "cancelada"
                  ? "bg-gray-100 border-gray-300"
                  : completo
                    ? "bg-green-50 border-green-400 ring-2 ring-green-300"
                    : order.tipo_envio === "retiro_local"
                      ? "bg-amber-50 border-amber-200"
                      : "bg-white border-gray-200"
                } ${modoScanner && !completo ? "cursor-pointer hover:ring-2 hover:ring-blue-300" : ""}`}
              // 🆕 En modo scanner, clic en la card abre el escaneo
              onClick={() => {
                if (modoScanner && !completo && order.tipo_envio !== "cancelada") {
                  onIniciarScan(order.numeroOperacion);
                }
              }}
            >
              <div className="absolute top-3 right-3">
                {modoScanner ? (
                  // 🆕 En modo scanner: indicador de estado
                  <span className={`text-lg ${completo ? "text-green-500" : "text-gray-400"}`}>
                    {completo ? "✅" : "🔍"}
                  </span>
                ) : (
                  <input
                    type="checkbox"
                    checked={selectedOrders.has(order.numeroOperacion)}
                    onChange={() => toggleOrderSelection(order.numeroOperacion)}
                    className="w-5 h-5 cursor-pointer"
                  />
                )}
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
                  {order.items.map((item, idx) => {
                    // 🆕 Progreso del item individual
                    const itemProgreso = progreso?.items[idx];
                    const itemCompleto = itemProgreso ? itemProgreso.verificados >= itemProgreso.quantity : false;

                    return (
                      <li key={idx} className={itemCompleto ? "text-green-700 line-through" : ""}>
                        <span className="font-bold">{item.sku}</span> —{" "}
                        <span className="font-bold">{item.quantity} Un.</span> —{" "}
                        <span className="text-gray-500">{item.description}</span>
                        {/* 🆕 Indicador de progreso del item */}
                        {modoScanner && itemProgreso && (
                          <span className={`ml-2 text-xs font-bold ${itemCompleto ? "text-green-600" : "text-blue-600"}`}>
                            [{itemProgreso.verificados}/{itemProgreso.quantity}]
                          </span>
                        )}
                        {/* 🆕 Warning si no tiene CB */}
                        {modoScanner && !item.codigoBarras && (
                          <span className="ml-2 text-xs text-orange-500 font-bold">
                            ⚠️ Sin CB
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* 🆕 Barra de progreso en modo scanner */}
              {modoScanner && progreso && progreso.total > 0 && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${completo ? "bg-green-500" : "bg-blue-500"
                        }`}
                      style={{ width: `${(progreso.verificados / progreso.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    {progreso.verificados}/{progreso.total} verificados
                  </p>
                </div>
              )}
            </div>
          );
        })}
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

  // 🆕 Estados para drag & drop
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  // 🆕 Estados para scanner
  const [modoScanner, setModoScanner] = useState(false);
  const [ordenEnScan, setOrdenEnScan] = useState<string | null>(null);
  const [scansPorOrden, setScansPorOrden] = useState<Record<string, string[]>>({});
  const [inputScan, setInputScan] = useState("");
  const scannerInputRef = useRef<HTMLInputElement>(null);
  
const [kitsMap, setKitsMap] = useState<Record<string, KitInfo>>({});

  const urlGetVentas = Urls.apiMeli.getVentas;




  // Todas las órdenes combinadas
  const allOrders = [...ordersFemex, ...ordersBlow];

  // 🆕 Buscar la orden que está en escaneo
  const ordenActiva = allOrders.find((o) => o.numeroOperacion === ordenEnScan) || null;
  const progresoActivo = ordenActiva ? getProgresoOrden(ordenActiva, scansPorOrden, kitsMap) : null;

  // 🆕 Enfocar input del scanner cuando se abre el modal
  useEffect(() => {
    if (ordenEnScan && scannerInputRef.current) {
      setTimeout(() => scannerInputRef.current?.focus(), 100);
    }
  }, [ordenEnScan]);

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

  // ─── 🆕 Lógica de Scanner ──────────────────────────────────────────────

  const handleIniciarScan = (numeroOperacion: string) => {
    setOrdenEnScan(numeroOperacion);
    setInputScan("");
  };

  const handleCerrarScan = () => {
    setOrdenEnScan(null);
    setInputScan("");
  };

  const handleScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const codigo = inputScan.trim();
    if (!codigo || !ordenActiva) return;

    // Expandir la orden para verificación (incluye componentes de kits)
    const itemsVerificacion = expandirOrdenParaVerificacion(ordenActiva, kitsMap);

    // 1️ Buscar coincidencia exacta de código de barras
    const itemMatch = itemsVerificacion.find((item) => item.codigoBarras === codigo);

    if (!itemMatch) {
      // 2️ Si no hay coincidencia exacta, verificar si el código escaneado es el SKU de un producto sin CB
      const itemSinCB = itemsVerificacion.find(
        (item) => item.sku === codigo && !item.codigoBarras
      );

      if (itemSinCB) {
        sweetAlert.fire({
          title: "⚠️ Producto sin Código de Barras",
          html: `El producto <strong>"${itemSinCB.sku}"</strong> está en la orden, pero no tiene código de barras registrado en el sistema.<br/><br/>Registrá el CB en la base de datos para poder escanearlo.`,
          icon: "warning",
          confirmButtonText: "Entendido"
        });
        setInputScan("");
        return;
      }

      // 3️⃣ Verificar si hay ALGÚN producto en la orden sin CB (mensaje contextual)
      const hayProductosSinCB = itemsVerificacion.some((item) => !item.codigoBarras);

      if (hayProductosSinCB) {
        sweetAlert.fire({
          title: "❌ Código no reconocido",
          html: `Este código no corresponde a ningún producto registrado de esta orden.<br/><br/>⚠️ <strong>Atención:</strong> Hay productos en esta orden sin código de barras. Verificá que estés escaneando el producto correcto o registrá los CB faltantes.`,
          icon: "error",
          confirmButtonText: "OK"
        });
      } else {
        sweetAlert.error("❌ Este código de barras no corresponde a ningún producto de esta orden.");
      }

      setInputScan("");
      return;
    }

    // ✅ Código válido: Verificar si ya se escanearon todas las unidades de este componente
    const yaEscaneados = contarEscaneados(codigo, ordenActiva.numeroOperacion, scansPorOrden);

    if (yaEscaneados >= itemMatch.quantity) {
      sweetAlert.warning(
        `⚠️ Ya escaneaste las ${itemMatch.quantity} unidad(es) de "${itemMatch.sku}".`
      );
      setInputScan("");
      return;
    }

    // ✅ Código válido y faltan unidades: agregar al array de scans
    setScansPorOrden((prev) => ({
      ...prev,
      [ordenActiva.numeroOperacion]: [
        ...(prev[ordenActiva.numeroOperacion] || []),
        codigo,
      ],
    }));

    setInputScan("");

    // Verificar si la orden quedó completa después de este scan
    const nuevoProgreso = getProgresoOrden(ordenActiva, {
      ...scansPorOrden,
      [ordenActiva.numeroOperacion]: [
        ...(scansPorOrden[ordenActiva.numeroOperacion] || []),
        codigo,
      ],
    });

    if (nuevoProgreso.verificados === nuevoProgreso.total) {
      sweetAlert.success(`✅ Orden #${ordenActiva.numeroOperacion} verificada completamente.`);
      setOrdenEnScan(null);
    }
  };

  const handleDeshacerUltimoScan = () => {
    if (!ordenEnScan) return;
    setScansPorOrden((prev) => {
      const scans = prev[ordenEnScan] || [];
      if (scans.length === 0) return prev;
      const nuevos = [...scans];
      nuevos.pop();
      return { ...prev, [ordenEnScan]: nuevos };
    });
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

  if (data.kits) {
  setKitsMap(data.kits);
  console.log("✅ KITS RECIBIDOS:", Object.keys(data.kits).length);
  console.log("📋 EJEMPLO KIT:", data.kits[Object.keys(data.kits)[0]]);
}
  if (data.success && data.data) {
    setOrdersFemex(data.data);
    if (data.kits) { // 🆕
      setKitsMap(data.kits);
    }
  } else {
    sweetAlert.error(`Femex: ${data.message || "Error desconocido"}`);
    setOrdersFemex([]);
  }
}

      // Blow
      if (resBlow.status === "fulfilled") {
  const data = resBlow.value.data;
  if (data.success && data.data) {
    setOrdersBlow(data.data);
    if (data.kits) { // 🆕
      setKitsMap(data.kits);
    }
  } else {
    sweetAlert.error(`Blow: ${data.message || "Error desconocido"}`);
    setOrdersBlow([]);
  }
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

  // ── Helper para desglosar Kits ────────────────────────────────────────────

  const expandirKitsEnOrdenes = (ordenes: Order[], kitsMap: Record<string, any>): Order[] => {
  return ordenes.map((orden) => {
    const itemsExpandidos: OrderItem[] = [];

    for (const item of orden.items) {
      const kitInfo = kitsMap[item.sku]; // 🆕 Usar kitsMap

      if (kitInfo) {
        for (const comp of kitInfo.componentes) {
          for (let i = 0; i < comp.cantidad; i++) {
            itemsExpandidos.push({
              sku: comp.sku,
              quantity: item.quantity,
              description: `[Kit] ${comp.sku} (de ${item.sku})`,
              codigoBarras: comp.codigoBarras,
            });
          }
        }
      } else {
        itemsExpandidos.push(item);
      }
    }

    return { ...orden, items: itemsExpandidos };
  });
};

  const handleConsolidadoStock = () => {
    const allOrdersSinFull = allOrders.filter((o) => o.tipo_envio !== "full");
    const ordenesVisiblesCombinadas = [...ordenesVisiblesFemex, ...ordenesVisiblesBlow];

    // 🆕 Expandimos los kits en las órdenes antes de generar el PDF
    const allOrdersExpandidas = expandirKitsEnOrdenes(allOrdersSinFull, kitsMap);
    const visiblesExpandidas = expandirKitsEnOrdenes(ordenesVisiblesCombinadas, kitsMap);


    PdfGenerarConsolidado(allOrdersExpandidas, selectedOrders, visiblesExpandidas);
  };

  // ─── Drag & Drop ─────────────────────────────────────────────────────

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      dragCounter.current++;
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    files.forEach((file) => {
      if (!file.name.toLowerCase().endsWith(".txt")) {
        sweetAlert.warning(`"${file.name}" no es un archivo .txt. Se ignora.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          handleArchivoTxt(content, file.name);
        }
      };
      reader.onerror = () => {
        sweetAlert.error(`No se pudo leer "${file.name}".`);
      };
      reader.readAsText(file);
    });
  };

  // ─── Registrar ventas con descuento ─────────────────────────────────────

  const registrarVentasConDescuento = async () => {
    if (selectedOrders.size === 0) {
      sweetAlert.warning("Seleccioná al menos una orden.");
      return;
    }

    const ordenesSeleccionadas = allOrders.filter((o) => selectedOrders.has(o.numeroOperacion));

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
    <div
      className={`p-6 max-w-[1600px] mx-auto relative transition-all duration-200 ${isDragging ? "ring-4 ring-blue-400 ring-offset-2 bg-blue-50/50 rounded-xl" : ""
        }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-100/70 backdrop-blur-sm rounded-xl z-50 pointer-events-none">
          <div className="text-center">
            <div className="text-6xl mb-2">📥</div>
            <p className="text-xl font-bold text-blue-700">Soltá el archivo .txt aquí</p>
            <p className="text-sm text-blue-600 mt-1">Se filtrarán las órdenes por las etiquetas</p>
          </div>
        </div>
      )}

      {loading && <Loader />}

      <h2 className="text-2xl font-bold text-gray-800 mb-6">Órdenes de Mercado Libre</h2>

      {/* ── Controles superiores ─────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-end gap-4">
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

        <button
          onClick={handleFetchOrders}
          disabled={loading}
          className={`px-4 py-2 rounded font-medium text-white transition whitespace-nowrap ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
        >
          {loading ? "Cargando..." : "Obtener órdenes"}
        </button>

        {/* 🆕 Toggle Modo Scanner */}
        <label className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-300 rounded cursor-pointer select-none whitespace-nowrap">
          <input
            type="checkbox"
            checked={modoScanner}
            onChange={(e) => {
              setModoScanner(e.target.checked);
              if (!e.target.checked) {
                setOrdenEnScan(null);
                setInputScan("");
              }
            }}
            className="w-4 h-4 accent-indigo-600"
          />
          <span className="text-indigo-700 font-medium">🔍 Modo Scanner</span>
        </label>

        {!modoScanner && (
          <>
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
          </>
        )}

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
            modoScanner={modoScanner}
            onIniciarScan={handleIniciarScan}
            scansPorOrden={scansPorOrden}
            kitsMap={kitsMap}
          />

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
            modoScanner={modoScanner}
            onIniciarScan={handleIniciarScan}
            scansPorOrden={scansPorOrden}
            kitsMap={kitsMap}
          />
        </div>
      )}

      {/* ── 🆕 Modal de Escaneo ──────────────────────────────────────────── */}
      {ordenEnScan && ordenActiva && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={(e) => {
            // Cerrar si se hace clic fuera del modal
            if (e.target === e.currentTarget) handleCerrarScan();
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header del modal */}
            <div className="bg-indigo-600 text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">🔍 Escaneando Orden #{ordenActiva.numeroOperacion}</h3>
                <p className="text-indigo-200 text-sm">
                  {ordenActiva.buyer_full_name} ({ordenActiva.buyer_nickname})
                </p>
              </div>
              <button
                onClick={handleCerrarScan}
                className="text-white/70 hover:text-white text-2xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Input de escaneo */}
            <div className="px-6 py-4 border-b bg-indigo-50">
              <label className="block text-sm font-medium text-indigo-700 mb-2">
                Escaneá el código de barras:
              </label>
              <input
                ref={scannerInputRef}
                type="text"
                value={inputScan}
                onChange={(e) => setInputScan(e.target.value)}
                onKeyDown={handleScanKeyDown}
                placeholder="Apuntá la pistola y escaneá..."
                className="w-full text-xl p-3 border-2 border-indigo-400 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono tracking-widest"
                autoFocus
              />
            </div>

            {/* Progreso general */}
            {progresoActivo && (
              <div className="px-6 py-3 border-b bg-gray-50">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Progreso</span>
                  <span className="font-bold">
                    {progresoActivo.verificados}/{progresoActivo.total} unidades
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-indigo-500 h-3 rounded-full transition-all duration-300"
                    style={{
                      width: `${(progresoActivo.verificados / progresoActivo.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Lista de items con progreso */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {progresoActivo?.items.map((item, idx) => {
                const completo = item.verificados >= item.quantity;
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${completo
                        ? "bg-green-50 border-green-300"
                        : "bg-white border-gray-200"
                      }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-gray-800">{item.sku}</p>
                        <p className="text-sm text-gray-500">{item.description}</p>
                        {item.codigoBarras && (
                          <p className="text-xs text-gray-400 font-mono mt-1">
                            CB: {item.codigoBarras}
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-sm font-bold px-2 py-1 rounded ${completo
                            ? "bg-green-200 text-green-800"
                            : "bg-blue-100 text-blue-800"
                          }`}
                      >
                        {item.verificados}/{item.quantity}
                      </span>
                    </div>
                    {/* Mini barra por item */}
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${completo ? "bg-green-500" : "bg-blue-400"
                          }`}
                        style={{
                          width: `${(item.verificados / item.quantity) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Items sin código de barras */}
              {ordenActiva.items.some((i) => !i.codigoBarras) && (
                <div className="p-3 bg-orange-50 border border-orange-300 rounded-lg">
                  <p className="text-sm text-orange-700 font-medium">
                    ⚠️ Los siguientes productos no tienen código de barras registrado:
                  </p>
                  <ul className="text-sm text-orange-600 mt-1 list-disc list-inside">
                    {ordenActiva.items
                      .filter((i) => !i.codigoBarras)
                      .map((i, idx) => (
                        <li key={idx}>{i.sku} ({i.quantity} un.)</li>
                      ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer con botones */}
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
              <button
                onClick={handleDeshacerUltimoScan}
                disabled={(scansPorOrden[ordenEnScan] || []).length === 0}
                className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                ↩️ Deshacer último scan
              </button>
              <button
                onClick={handleCerrarScan}
                className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};