// ColumnaOrdenes.tsx
import React from "react";
import type { Order, KitInfo } from "./mlTypes";
import { normalizarCodigoBarras, expandirOrdenIndividual, getProgresoOrden } from "./mlHelpers";

// ─── Helpers UI ─────────────────────────────────────────────────

const formatDateToDisplay = (isoDateString: string): string => {
  const date = new Date(isoDateString);
  if (isNaN(date.getTime())) return "Fecha inválida";
  return date.toLocaleString("es-AR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
};

const getTipoEnvioLabel = (tipo: string): string => {
  const labels: Record<string, string> = { full: "Envío Full", mercado_envios: "Mercado Envíos", flex: "Flex", vendedor: "Vendedor", retiro_local: "Retiro en local", cancelada: "❌ Cancelada", desconocido: "Desconocido" };
  return labels[tipo] || tipo;
};

const getShippingStatusLabel = (status?: string): { label: string; color: string } => {
  const statusMap: Record<string, { label: string; color: string }> = {
    ready_to_print: { label: "📄 Etiqueta generada", color: "bg-blue-100 text-blue-800" }, 
    pending: { label: "⏳ Pendiente", color: "bg-blue-100 text-blue-800" },
    printed: { label: "🖨️ Etiqueta impresa", color: "bg-green-100 text-green-800" },
    handling: { label: "⚙️ En proceso", color: "bg-yellow-100 text-yellow-800" },
    shipped: { label: "🚚 Enviado", color: "bg-purple-100 text-purple-800" },
    delivered: { label: "✅ Entregado", color: "bg-emerald-100 text-emerald-800" },
    dropped_off: { label: "📮 Despachado", color: "bg-purple-100 text-purple-800" },
    in_transit: { label: "🚛 En tránsito", color: "bg-purple-100 text-purple-800" }, 
    not_visited: { label: "⚠️ No visitado", color: "bg-orange-100 text-orange-800" },
    cancelled: { label: "❌ Cancelado", color: "bg-red-100 text-red-800" }, 
    in_packing_list: { label: "📦 En lista de empaque", color: "bg-indigo-100 text-indigo-800" },
    error: { label: "⚠️ Error al obtener", color: "bg-gray-100 text-gray-800" },
    no_shipping: { label: "📭 Sin etiqueta", color: "bg-amber-100 text-amber-800" },
    ready_to_ship: { label: "📦 Despachado", color: "bg-indigo-100 text-indigo-800" },
    out_for_delivery: { label: "🚚 En camino", color: "bg-indigo-100 text-indigo-800" },
    
  };
  return statusMap[status || "unknown"] || { label: "Sin estado", color: "bg-gray-100 text-gray-800" };
};

// ─── Props ───────────────────────────────────────────────────────  address_mismatch averiguar que es

export interface ColumnaOrdenesProps {
  titulo: string;
  orders: Order[];
  ordenesVisibles: Order[];
  mostrarFiltradas: boolean;       // <-- NUEVO: Controla si se muestran las filtradas o todas
  setMostrarFiltradas: (v: boolean) => void; // <-- NUEVO: Función para alternar
  mostrarMultiples: boolean;
  setMostrarMultiples: (v: boolean) => void;
  selectedOrders: Set<string>;
  toggleOrderSelection: (orderId: string) => void;
  onToggleAll: (ids: string[]) => void;
  modoScanner: boolean;
  onIniciarScan: (numeroOperacion: string) => void;
  scansPorOrden: Record<string, string[]>;
  kitsMap: Record<string, KitInfo>;
}

// ─── Componente ────────────────────────────────────────────────

export const ColumnaOrdenes: React.FC<ColumnaOrdenesProps> = ({
  titulo, orders, ordenesVisibles, mostrarFiltradas, setMostrarFiltradas,
  mostrarMultiples, setMostrarMultiples, selectedOrders, toggleOrderSelection,
  onToggleAll, modoScanner, onIniciarScan, scansPorOrden, kitsMap,
}) => {
  // Si el filtro de etiquetas está activo Y hay datos filtrados, los usamos. Si no, mostramos todas.
  const baseOrders = (mostrarFiltradas && ordenesVisibles.length > 0) ? ordenesVisibles : orders;

  const ordersFiltradas = baseOrders.filter((o) => {
    if (modoScanner && o.tipo_envio === "full") return false;
    if (mostrarMultiples && o.items.length <= 1) return false;
    return true;
  });

  const idsVisibles = ordersFiltradas.map((o) => o.numeroOperacion);
  const todasSeleccionadas = idsVisibles.length > 0 && idsVisibles.every((id) => selectedOrders.has(id));
  const cantidadMultiples = orders.filter((o) => o.items.length > 1).length;

  if (orders.length === 0) return null;

  return (
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2 sticky top-0 bg-white/90 backdrop-blur z-10 py-2 rounded">
        <p className="text-gray-700">
          <span className="font-bold text-lg">{titulo}</span> —{" "}
          <span className="font-semibold">{orders.length}</span> órdenes
          {mostrarMultiples && (
            <span className="ml-2 text-xs text-blue-600">(mostrando {cantidadMultiples} con +1 producto)</span>
          )}
        </p>
        <div className="flex items-center gap-3">

          {/* 👇 BOTÓN TOGGLE DE FILTRO DE ETIQUETAS 👇 */}
          {ordenesVisibles.length > 0 && (
            <button
              onClick={() => setMostrarFiltradas(!mostrarFiltradas)}
              className={`px-3 py-1 text-sm rounded transition whitespace-nowrap border ${mostrarFiltradas
                  ? "bg-gray-200 hover:bg-gray-300 text-gray-700 border-gray-300"
                  : "bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300 font-medium"
                }`}
              title={mostrarFiltradas ? "Vuelve a mostrar todas las órdenes" : "Muestra solo las órdenes que coinciden con las etiquetas cargadas"}
            >
              {mostrarFiltradas ? "✕ Limpiar filtro de etiquetas" : "Mostrar filtradas"}
            </button>
          )}
          {/* 👆 FIN DEL BOTÓN TOGGLE 👆 */}

          <label className="flex items-center gap-1.5 text-sm whitespace-nowrap cursor-pointer">
            <input type="checkbox" checked={mostrarMultiples} onChange={(e) => setMostrarMultiples(e.target.checked)} className="w-4 h-4" />
            +1 SKU
          </label>
          {!modoScanner && (
            <label className="flex items-center gap-1.5 text-sm whitespace-nowrap cursor-pointer">
              <input type="checkbox" checked={todasSeleccionadas} onChange={() => onToggleAll(idsVisibles)} className="w-4 h-4" />
              Seleccionar todas
            </label>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {ordersFiltradas.map((order) => {
          const progreso = modoScanner ? getProgresoOrden(order, scansPorOrden, kitsMap) : null;
          const completo = progreso ? progreso.verificados === progreso.total && progreso.total > 0 : false;

          return (
            <div
              key={order.numeroOperacion}
              className={`rounded-lg p-4 shadow-sm relative border transition-all ${order.tipo_envio === "cancelada" ? "bg-gray-100 border-gray-300"
                  : completo ? "bg-green-50 border-green-400 ring-2 ring-green-300"
                    : order.tipo_envio === "retiro_local" ? "bg-amber-50 border-amber-200"
                      : "bg-white border-gray-200"
                } ${modoScanner && !completo ? "cursor-pointer hover:ring-2 hover:ring-blue-300" : ""}`}
              onClick={() => {
                if (modoScanner && !completo && order.tipo_envio !== "cancelada") {
                  onIniciarScan(order.numeroOperacion);
                }
              }}
            >
              <div className="absolute top-3 right-3">
                {modoScanner ? (
                  <span className={`text-lg ${completo ? "text-green-500" : "text-gray-400"}`}>{completo ? "✅" : "🔍"}</span>
                ) : (
                  <input type="checkbox" checked={selectedOrders.has(order.numeroOperacion)} onChange={() => toggleOrderSelection(order.numeroOperacion)} className="w-5 h-5 cursor-pointer" />
                )}
              </div>

              <div className="flex justify-between items-start pr-8">
                <h3 className="text-base font-semibold text-gray-800">Orden #{order.numeroOperacion}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600"><span className="font-semibold">{getTipoEnvioLabel(order.tipo_envio)}</span></span>
                  {(() => {
                    const statusInfo = getShippingStatusLabel(order.shipping_status);
                    return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusInfo.color}`} title={`Status: ${order.shipping_status || "desconocido"}`}>{statusInfo.label}</span>;
                  })()}
                </div>
              </div>

              <p className="text-sm text-gray-600 mt-1"><span className="font-medium">Comprador:</span> {order.buyer_full_name} ({order.buyer_nickname})</p>
              <p className="text-sm text-gray-600 mt-1"><span className="font-medium">Fecha:</span> {formatDateToDisplay(order.date_created)}</p>

              <div className="mt-2">
                <p className="text-sm text-gray-700 font-medium">Items:</p>
                <ul className="list-disc list-inside mt-1 text-sm text-gray-600">
                  {order.items.map((item, idx) => {
                    const itemProgreso = progreso?.items[idx];
                    const itemCompleto = itemProgreso ? itemProgreso.verificados >= itemProgreso.quantity : false;
                    const esKit = !!kitsMap[item.sku];
                    return (
                      <li key={idx} className={itemCompleto ? "text-green-700 line-through" : ""}>
                        <span className="font-bold">{item.sku}</span> — <span className="font-bold">{item.quantity} Un.</span> — <span className="text-gray-500">{item.description}</span>
                        {modoScanner && itemProgreso && <span className={`ml-2 text-xs font-bold ${itemCompleto ? "text-green-600" : "text-blue-600"}`}>[{itemProgreso.verificados}/{itemProgreso.quantity}]</span>}
                        {modoScanner && esKit && <span className="ml-2 text-xs text-blue-600 font-bold">📦 Kit ({kitsMap[item.sku].componentes.length} componentes)</span>}
                        {modoScanner && !esKit && !item.codigoBarras && <span className="ml-2 text-xs text-orange-500 font-bold">⚠️ Sin CB</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {modoScanner && progreso && progreso.total > 0 && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all duration-300 ${completo ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${(progreso.verificados / progreso.total) * 100}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-right">{progreso.verificados}/{progreso.total} verificados</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};