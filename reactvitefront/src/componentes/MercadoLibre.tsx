import { useState, useEffect } from "react";
import axios from "axios";
import { sweetAlert } from "./utilidades/SweetAlertWrapper";
import Urls from "./utilidades/Urls";
import Loader from "./utilidades/Loader";
import BotonCargarTxt from "./utilidades/BotonCargarTxt"
// Al inicio del archivo, después de otros imports
import { generateEnviosPDF } from "./utilidades/pdfGenerators";
import { printRetiroLocalHTML } from "./utilidades/printUtils";

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
  buyer_full_name?: string;
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
  "KIT GI190 345ML": {
    skuDescuento: [
      "GI190 N 135ML",
      "GI190 C 70ML",
      "GI190 M 70ML",
      "GI190 A 70ML"
    ]
  },
  "KIT EP544 280ML": { skuDescuento: "EP544 N 70ML" },
  "KIT EP664 400ML": {
    skuDescuento: [
      "EP664-EP673 N 100ML",
      "EP664-EP673 C 100ML",
      "EP664-EP673 M 100ML",
      "EP664-EP673 A 100ML",
    ],
  },
  "KIT EP673 600ML": {
    skuDescuento: [
      "EP664-EP673 N 100ML",
      "EP664-EP673 C 100ML",
      "EP664-EP673 M 100ML",
      "EP664-EP673 A 100ML",
      "EP673 LC 100ML",
      "EP673 LM 100ML",
    ],
  },
  "KIT H901XL": {
    skuDescuento: [
      "H901XL N",
      "H901XL C"
    ],
  },
  "KIT EP73-EP117": { skuDescuento: ["EP117 N"] },
  "KIT EP544-EP664 4L": { skuDescuento: "EP544-EP664-EP673 N" },
  "KIT EP73-EP115": { skuDescuento: "EP115 N" },
  "KIT EP73-EP90": { skuDescuento: "EP90 N" },
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

export const MercadoLibre = () => {
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
  const [mostrarMultiplesProductos, setMostrarMultiplesProductos] = useState<boolean>(false);

  const [contenidoTxt, setContenidoTxt] = useState<string>("");
  const [nombreArchivo, setNombreArchivo] = useState<string>("");
  const [ordenesVisibles, setOrdenesVisibles] = useState<Order[]>([]);

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

  // Seleccionar/deseleccionar todas 
  const toggleAll = () => {
    // Trabajar sobre la lista que se está mostrando
    const listaActual = ordenesVisibles.length > 0 ? ordenesVisibles : orders;

    const idsActuales = listaActual.map(o => o.numeroOperacion);
    const todasSeleccionadas = idsActuales.every(id => selectedOrders.has(id));

    const newSelected = new Set(selectedOrders);
    if (todasSeleccionadas) {
      idsActuales.forEach(id => newSelected.delete(id));
    } else {
      idsActuales.forEach(id => newSelected.add(id));
    }
    setSelectedOrders(newSelected);
  };

  // Input de etiquetas

  /**
 * Extrae los IDs de venta de un archivo ZPL de etiquetas de MercadoLibre.
 * Busca el patrón: ^FO198,40^A0N,30,30^FD[NUMERO]^FS
 */
  const extraerIdsDeEtiqueta = (contenido: string): string[] => {
    const regex = /\^FO198,40\^A0N,30,30\^FD(\d+)\^FS/g;
    const ids: string[] = [];
    let match;
    while ((match = regex.exec(contenido)) !== null) {
      ids.push(match[1]);
    }
    // Eliminar duplicados (por si el ZPL repite el número)
    return [...new Set(ids)];
  };

  const handleArchivoTxt = (content: string, fileName: string) => {
    setNombreArchivo(fileName);

    // 1. Extraer IDs del archivo
    const idsDelArchivo = extraerIdsDeEtiqueta(content);

    if (idsDelArchivo.length === 0) {
      sweetAlert.warning(
        "No se encontraron IDs de venta en el archivo. Verificá el formato del ZPL."
      );
      return;
    }

    // 2. Si no hay órdenes cargadas, avisar
    if (orders.length === 0) {
      sweetAlert.warning(
        `Se encontraron ${idsDelArchivo.length} IDs en el archivo, pero no hay órdenes cargadas. Primero obtené las órdenes.`
      );
      return;
    }

    // 3. Buscar coincidencias con las órdenes cargadas
    const ordenesCoincidentes = orders.filter((o) => {
      const numOrden = String(o.numeroOperacion);
      return idsDelArchivo.some(
        (id) => numOrden.endsWith(id) || id.endsWith(numOrden)
      );
    });

    if (ordenesCoincidentes.length === 0) {
      sweetAlert.warning(
        `Se encontraron ${idsDelArchivo.length} IDs en el archivo, pero ninguna coincide con las órdenes cargadas.`
      );
      setContenidoTxt("")
      setNombreArchivo("")
      return;
    }



    // ✅ NUEVO: filtrar la vista para mostrar SOLO las coincidentes
    setOrdenesVisibles((prev) => {
      // Combinar órdenes anteriores con las nuevas (sin duplicados)
      const existentes = new Set(prev.map(o => o.numeroOperacion));
      const nuevas = ordenesCoincidentes.filter(o => !existentes.has(o.numeroOperacion));
      return [...prev, ...nuevas];
    });

    const noEncontrados = idsDelArchivo.filter(
      (id) => !orders.some((o) => {
        const numOrden = String(o.numeroOperacion);
        return numOrden.endsWith(id) || id.endsWith(numOrden);
      })
    );

    let mensaje = `✅ Se seleccionaron ${ordenesCoincidentes.length} órdenes a partir del archivo "${fileName}".`;
    if (noEncontrados.length > 0) {
      mensaje += `\n\n⚠️ ${noEncontrados.length} IDs no se encontraron entre las órdenes cargadas.`;
    }

    sweetAlert.fire({
      title: "Órdenes seleccionadas",
      html: mensaje.replace(/\n/g, "<br/>"),
      icon: ordenesCoincidentes.length === idsDelArchivo.length ? "success" : "warning",
      confirmButtonText: "OK",
    });


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

  // Si hay órdenes filtradas por el archivo, mostrar solo esas
  // Sino, mostrar todas las órdenes (con filtro opcional de +1 SKU)
  const baseOrders = ordenesVisibles.length > 0 ? ordenesVisibles : orders;

  const ordersFiltradas = baseOrders.filter((o) => {
    if (mostrarMultiplesProductos && o.items.length <= 1) {
      return false;
    }
    return true;
  });

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
          onClick={() => generateEnviosPDF(orders, selectedOrders)}
          disabled={!orders.some(o => selectedOrders.has(o.numeroOperacion) && o.tipo_envio !== "retiro_local")}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
        >
          Imprimir envíos
        </button>

        <button
          onClick={() => printRetiroLocalHTML(orders, selectedOrders)}
          disabled={!orders.some(o => selectedOrders.has(o.numeroOperacion) && o.tipo_envio === "retiro_local")}
          className="ml-2 px-4 py-2 bg-amber-600 text-white rounded disabled:bg-gray-400"
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
          {loadingDescuento
            ? "Cargando..."
            : `Registrar ${selectedOrders.size} con descuento`}
        </button>
        <BotonCargarTxt
          onFileRead={handleArchivoTxt}
          label="Cargar órdenes (.txt)"
        />

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
              {mostrarMultiplesProductos && (
                <span className="ml-2 text-xs text-blue-600">
                  (mostrando {orders.filter(o => o.items.length > 1).length} con +1 producto)
                </span>
              )}
            </p>
            <div className="flex items-center gap-4">
              {/* ✅ NUEVO: botón para volver a ver todas */}
              {ordenesVisibles.length > 0 && (
                <button
                  onClick={() => setOrdenesVisibles([])}
                  className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition whitespace-nowrap"
                >
                  ✕ Ver todas ({orders.length})
                </button>
              )}

              <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={mostrarMultiplesProductos}
                  onChange={(e) => setMostrarMultiplesProductos(e.target.checked)}
                  className="w-4 h-4"
                />
                +1 SKU
              </label>

              <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={(() => {
                    const listaActual = ordenesVisibles.length > 0 ? ordenesVisibles : orders;
                    return listaActual.length > 0 && listaActual.every(o => selectedOrders.has(o.numeroOperacion));
                  })()}
                  onChange={toggleAll}
                  className="w-4 h-4"
                />
                Seleccionar todas
              </label>
            </div>

          </div>



          <div className="space-y-5">
            {ordersFiltradas.map((order) => (
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
                  {order.buyer_full_name}{" "} ({order.buyer_nickname})
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
