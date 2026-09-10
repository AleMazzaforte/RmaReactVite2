import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { sweetAlert } from "./utilidades/SweetAlertWrapper";
import Urls from "./utilidades/Urls";
import Loader from "./utilidades/Loader";
import BotonCargarTxt from "./utilidades/mercadoLibre/BotonCargarTxt";
import { generateEnviosPDF } from "./utilidades/mercadoLibre/pdfGenerators";
import { printRetiroLocalHTML } from "./utilidades/mercadoLibre/printUtils";
import { PdfGenerarConsolidado } from "./utilidades/mercadoLibre/pdfGenerarConsolidado";
import { reproducirBeep } from "./utilidades/mercadoLibre/Beeper";
import { ColumnaOrdenes } from "./utilidades/mercadoLibre/ColumnaOrdenes";
import type { Order, OrderItem, KitInfo, ApiResponse } from "./utilidades/mercadoLibre/mlTypes";
import {
  normalizarCodigoBarras,
  agruparItemsPorSKU,
  expandirOrdenParaVerificacion,
  getProgresoOrden,
  contarEscaneados,
} from "./utilidades/mercadoLibre/mlHelpers";

// Re-exportar para consumidores existentes
export type { Order } from "./utilidades/mercadoLibre/mlTypes";
export { getProgresoOrden } from "./utilidades/mercadoLibre/mlHelpers";

// ─── Helpers (propios de este componente) ────────────────────────────────────

const esRetiroLocalPendiente = (o: Order) =>
  o.tipo_envio === "retiro_local" &&
  o.shipping_status !== "delivered" &&
  o.shipping_status !== "cancelled";

const extraerIdsDeEtiqueta = (contenido: string): Record<string, string | null> => {
  const resultado: Record<string, string | null> = {};
  const etiquetas = contenido.match(/\^XA[\s\S]*?\^XZ/g) || [];

  const regexId = /\^FO198,40\^A0N,30,30\^FD(\d+)\^FS/;
  const regexQR = /"id":"(\d+)"/;
  const regexBarcode = /\^FO230,210\^BY3,,1\^BCN,160,N,N,N\^FD>:([\d]+)\^FS/;
  const regexEnvioTexto = /\^FDEnvio:\s*([\d]+)\^FS/;

  for (const etiqueta of etiquetas) {
    const matchId = etiqueta.match(regexId);
    if (matchId) {
      const idVenta = matchId[1];
      let codigoEnvio: string | null = null;

      const matchQR = etiqueta.match(regexQR);
      if (matchQR) {
        codigoEnvio = matchQR[1];
      } else {
        const matchBarcode = etiqueta.match(regexBarcode);
        if (matchBarcode) {
          codigoEnvio = matchBarcode[1];
        } else {
          const matchEnvio = etiqueta.match(regexEnvioTexto);
          if (matchEnvio) {
            codigoEnvio = matchEnvio[1];
          }
        }
      }

      if (!(idVenta in resultado)) {
        resultado[idVenta] = codigoEnvio;
      }
    }
  }
  return resultado;
};

const STORAGE_KEY = "ml_estado_dia";
const getTodayString = () => new Date().toISOString().split("T")[0];

const cargarEstadoInicial = () => {
  try {
    const guardado = localStorage.getItem(STORAGE_KEY);
    if (guardado) {
      const datos = JSON.parse(guardado);
      // ✅ Si la fecha coincide con hoy, se cargan los datos (incluyendo allOrders)
      if (datos.fecha === getTodayString()) {
        return {
          ordersFemex: datos.ordersFemex || [],
          ordersBlow: datos.ordersBlow || [],
          idsDelArchivoFemex: datos.idsDelArchivoFemex || {},
          idsDelArchivoBlow: datos.idsDelArchivoBlow || {},
          scansPorOrden: datos.scansPorOrden || {},
          allOrders: datos.allOrders || [], // ✅ Agregado
          esDiaActual: true,
        };
      } else {
        // ✅ Si hay una fecha anterior, se borra el localStorage automáticamente
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  } catch (e) {
    console.error("Error al cargar estado del día:", e);
    localStorage.removeItem(STORAGE_KEY);
  }
  return {
    ordersFemex: [],
    ordersBlow: [],
    idsDelArchivoFemex: {},
    idsDelArchivoBlow: {},
    scansPorOrden: {},
    allOrders: [], // ✅ Agregado
    esDiaActual: false,
  };
};

const ESTADO_INICIAL = cargarEstadoInicial();

// ─── Componente Principal ───────────────────────────────────────────────────

export const MercadoLibre = () => {
  const [diasFemex, setDiasFemex] = useState<number>(3);
  const [diasBlow, setDiasBlow] = useState<number>(3);

  const [ordenesVisiblesFemex, setOrdenesVisiblesFemex] = useState<Order[]>([]);
  const [ordenesVisiblesBlow, setOrdenesVisiblesBlow] = useState<Order[]>([]);

  const [mostrarFiltradasFemex, setMostrarFiltradasFemex] = useState(false);
  const [mostrarFiltradasBlow, setMostrarFiltradasBlow] = useState(false);

  const [mostrarMultiplesFemex, setMostrarMultiplesFemex] = useState(false);
  const [mostrarMultiplesBlow, setMostrarMultiplesBlow] = useState(false);

  const [loading, setLoading] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());

  const [ordersFemex, setOrdersFemex] = useState<Order[]>(ESTADO_INICIAL.ordersFemex);
  const [ordersBlow, setOrdersBlow] = useState<Order[]>(ESTADO_INICIAL.ordersBlow);
  const [idsDelArchivoFemex, setIdsDelArchivoFemex] = useState<Record<string, string | null>>(ESTADO_INICIAL.idsDelArchivoFemex);
  const [idsDelArchivoBlow, setIdsDelArchivoBlow] = useState<Record<string, string | null>>(ESTADO_INICIAL.idsDelArchivoBlow);
  const [scansPorOrden, setScansPorOrden] = useState<Record<string, string[]>>(ESTADO_INICIAL.scansPorOrden);

  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const [modoScanner, setModoScanner] = useState(false);
  const [ordenEnScan, setOrdenEnScan] = useState<string | null>(null);

  const [inputScan, setInputScan] = useState("");
  const scannerInputRef = useRef<HTMLInputElement>(null);

  const [kitsMap, setKitsMap] = useState<Record<string, KitInfo>>({});

  // allOrders se deriva del estado, pero también se guarda en localStorage
  const allOrders = [...ordersFemex, ...ordersBlow];
  const ordenActiva = allOrders.find((o) => o.numeroOperacion === ordenEnScan) || null;
  const progresoActivo = ordenActiva ? getProgresoOrden(ordenActiva, scansPorOrden, kitsMap) : null;
  const itemsVerificacion = ordenActiva ? expandirOrdenParaVerificacion(ordenActiva, kitsMap) : [];

  // ─── Cálculo de órdenes pendientes de despacho ──────────────────────────
  const estadosFinalizados = ['shipped', 'delivered', 'dropped_off', 'in_transit', 'cancelled', "Sin estado",
    "out_for_delivery"];

  const pendientesMercadoEnvio = allOrders.filter(o =>
    (o.tipo_envio === 'mercado_envios') &&
    (o.shipping_status === 'printed' || o.shipping_status === 'ready_to_print')
  ).length;

  const pendientesFlex = allOrders.filter(o =>
    o.tipo_envio === 'flex' &&
    !estadosFinalizados.includes(o.shipping_status || '')
  ).length;
  // ────────────────────────────────────────────────────────────────────────

  // console.log(allOrders);


  useEffect(() => {
    if (ordenEnScan && scannerInputRef.current) {
      setTimeout(() => scannerInputRef.current?.focus(), 100);
    }
  }, [ordenEnScan]);

  // ─── 🆕 Listener global para escaneo rápido (Corregido con useRef) ──────────
  const bufferScanRef = useRef<string>("");
  const firstKeyTime = useRef<number>(0);

  const handleIniciarScan = useCallback((numeroOperacion: string) => {
    setOrdenEnScan(numeroOperacion);
    setInputScan("");
  }, []);

  useEffect(() => {
    if (!modoScanner || ordenEnScan !== null) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key.length > 1 && e.key !== "Enter") return;

      const now = Date.now();

      if (e.key === "Enter") {
        const codigo = bufferScanRef.current.trim();
        const totalTime = now - firstKeyTime.current;

        if (codigo && totalTime < 300) {
          e.preventDefault();

          let ordenEncontrada: Order | null = null;
          const todosLosIds = { ...idsDelArchivoFemex, ...idsDelArchivoBlow };
          const todasLasOrdenes = [...ordersFemex, ...ordersBlow];

          const entradaMatch = Object.entries(todosLosIds).find(
            ([, valor]) => valor !== null && String(valor) === codigo
          );

          if (entradaMatch) {
            const [idOrden] = entradaMatch;
            ordenEncontrada = todasLasOrdenes.find(
              (o) =>
                String(o.numeroOperacion).endsWith(idOrden) ||
                idOrden.endsWith(String(o.numeroOperacion))
            ) || null;
          }

          if (!ordenEncontrada) {
            ordenEncontrada = todasLasOrdenes.find(
              (o) => String(o.numeroOperacion) === codigo
            ) || null;
          }

          if (ordenEncontrada && ordenEncontrada.tipo_envio !== "cancelada") {
            handleIniciarScan(ordenEncontrada.numeroOperacion);
          } else if (ordenEncontrada?.tipo_envio === "cancelada") {
            sweetAlert.warning("Orden cancelada", "Esta orden está cancelada.");
          } else {
            sweetAlert.warning(
              "Orden no encontrada",
              `El código "${codigo}" no coincide con ninguna orden cargada.`
            );
          }
        }

        bufferScanRef.current = "";
        firstKeyTime.current = 0;
        return;
      }

      if (e.key.length === 1) {
        if (firstKeyTime.current === 0) {
          firstKeyTime.current = now;
        }
        bufferScanRef.current += e.key;
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);

    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [modoScanner, ordenEnScan, idsDelArchivoFemex, idsDelArchivoBlow, ordersFemex, ordersBlow, handleIniciarScan]);

  // ─── 🔄 3. Recalcular filtro automáticamente cuando cambian órdenes o IDs ───
  useEffect(() => {
    if (Object.keys(idsDelArchivoFemex).length > 0 && ordersFemex.length > 0) {
      const idsKeys = Object.keys(idsDelArchivoFemex);
      const coincidentesFemex = ordersFemex.filter((o: Order) => {
        if (esRetiroLocalPendiente(o)) return true;

        const num = String(o.numeroOperacion);
        return idsKeys.some((id) => num.endsWith(id) || id.endsWith(num));
      });
      setOrdenesVisiblesFemex(coincidentesFemex);
    }

    if (Object.keys(idsDelArchivoBlow).length > 0 && ordersBlow.length > 0) {
      const idsKeys = Object.keys(idsDelArchivoBlow);
      const coincidentesBlow = ordersBlow.filter((o: Order) => {
        if (esRetiroLocalPendiente(o)) return true;

        const num = String(o.numeroOperacion);
        return idsKeys.some((id) => num.endsWith(id) || id.endsWith(num));
      });
      setOrdenesVisiblesBlow(coincidentesBlow);
    }
  }, [ordersFemex, ordersBlow, idsDelArchivoFemex, idsDelArchivoBlow]);

  // ─── Toggle para mostrar/ocultar filtro ───
  const toggleFiltro = () => {
    const nuevoEstadoFemex = !mostrarFiltradasFemex;
    const nuevoEstadoBlow = !mostrarFiltradasBlow;

    setMostrarFiltradasFemex(nuevoEstadoFemex);
    setMostrarFiltradasBlow(nuevoEstadoBlow);

    if (nuevoEstadoFemex && Object.keys(idsDelArchivoFemex).length > 0) {
      const idsKeys = Object.keys(idsDelArchivoFemex);
      const coincidentes = ordersFemex.filter((o: Order) => {
        if (esRetiroLocalPendiente(o)) return true;

        const num = String(o.numeroOperacion);
        return idsKeys.some((id) => num.endsWith(id) || id.endsWith(num));
      });
      setOrdenesVisiblesFemex(coincidentes);
    }

    if (nuevoEstadoBlow && Object.keys(idsDelArchivoBlow).length > 0) {
      const idsKeys = Object.keys(idsDelArchivoBlow);
      const coincidentes = ordersBlow.filter((o: Order) => {
        if (esRetiroLocalPendiente(o)) return true;

        const num = String(o.numeroOperacion);
        return idsKeys.some((id) => num.endsWith(id) || id.endsWith(num));
      });
      setOrdenesVisiblesBlow(coincidentes);
    }
  };

  // ─── 🔄 1. Reconstrucción automática de vistas al recargar ───
  useEffect(() => {
    if (ESTADO_INICIAL.esDiaActual) {
      if (ESTADO_INICIAL.ordersFemex.length > 0 && Object.keys(ESTADO_INICIAL.idsDelArchivoFemex).length > 0) {
        const idsKeys = Object.keys(ESTADO_INICIAL.idsDelArchivoFemex);
        const coincidentes = ESTADO_INICIAL.ordersFemex.filter((o: Order) => {
          if (esRetiroLocalPendiente(o)) return true;

          const num = String(o.numeroOperacion);
          return idsKeys.some((id) => num.endsWith(id) || id.endsWith(num));
        });
        setOrdenesVisiblesFemex(coincidentes);
        if (coincidentes.length > 0) setMostrarFiltradasFemex(true);
      }

      if (ESTADO_INICIAL.ordersBlow.length > 0 && Object.keys(ESTADO_INICIAL.idsDelArchivoBlow).length > 0) {
        const idsKeys = Object.keys(ESTADO_INICIAL.idsDelArchivoBlow);
        const coincidentes = ESTADO_INICIAL.ordersBlow.filter((o: Order) => {
          if (esRetiroLocalPendiente(o)) return true;

          const num = String(o.numeroOperacion);
          return idsKeys.some((id) => num.endsWith(id) || id.endsWith(num));
        });
        setOrdenesVisiblesBlow(coincidentes);
        if (coincidentes.length > 0) setMostrarFiltradasBlow(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── 💾 2. Persistencia automática en localStorage ───
  useEffect(() => {
    const estadoParaGuardar = {
      fecha: getTodayString(),
      ordersFemex,
      ordersBlow,
      idsDelArchivoFemex,
      idsDelArchivoBlow,
      scansPorOrden,
      allOrders: [...ordersFemex, ...ordersBlow], // ✅ Se guarda allOrders actualizado
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estadoParaGuardar));
  }, [ordersFemex, ordersBlow, idsDelArchivoFemex, idsDelArchivoBlow, scansPorOrden]);

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
  const handleCerrarScan = () => {
    setOrdenEnScan(null);
    setInputScan("");
  };

  const handleScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const codigo = inputScan.trim();
    if (!codigo || !ordenActiva) return;

    const kitInfo = kitsMap[codigo];
    if (kitInfo) {
      reproducirBeep('advertencia');
      sweetAlert.fire({
        title: "📦 Kit detectado",
        html: `El código "<strong>${codigo}</strong>" corresponde a un KIT.<br/><br/>
               Los kits no se escanean directamente. Escaneá los códigos de barras de sus componentes individuales:
               <ul class="text-left mt-2 text-sm">
                 ${kitInfo.componentes.map(c => `<li>${c.sku} ${c.descripcion ? `- ${c.descripcion}` : ''} (CB: ${c.codigoBarras || 'Sin CB'})</li>`).join('')}
               </ul>`,
        icon: "info",
        confirmButtonText: "Entendido"
      });
      setInputScan("");
      return;
    }

    const itemsVerif = expandirOrdenParaVerificacion(ordenActiva, kitsMap);
    const codigoNormalizado = normalizarCodigoBarras(codigo);

    const itemMatch = itemsVerif.find((item) => {
      const cbItem = normalizarCodigoBarras(item.codigoBarras);
      return cbItem && cbItem === codigoNormalizado;
    });

    if (!itemMatch) {
      reproducirBeep('error');
      const itemSinCB = itemsVerif.find(
        (item) => item.sku === codigo && !normalizarCodigoBarras(item.codigoBarras)
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

      const hayProductosSinCB = itemsVerif.some((item) => !normalizarCodigoBarras(item.codigoBarras));

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

    const yaEscaneados = contarEscaneados(codigo, ordenActiva.numeroOperacion, scansPorOrden);

    if (yaEscaneados >= itemMatch.quantity) {
      reproducirBeep('advertencia');
      sweetAlert.warning(`⚠️ Ya escaneaste las ${itemMatch.quantity} unidad(es) de "${itemMatch.sku}".`);
      setInputScan("");
      return;
    }

    reproducirBeep('exito');

    setScansPorOrden((prev) => ({
      ...prev,
      [ordenActiva.numeroOperacion]: [
        ...(prev[ordenActiva.numeroOperacion] || []),
        codigo,
      ],
    }));

    setInputScan("");

    const nuevoProgreso = getProgresoOrden(ordenActiva, {
      ...scansPorOrden,
      [ordenActiva.numeroOperacion]: [
        ...(scansPorOrden[ordenActiva.numeroOperacion] || []),
        codigo,
      ],
    }, kitsMap);

    if (nuevoProgreso.verificados === nuevoProgreso.total) {
      setTimeout(() => reproducirBeep('exito'), 150);
      sweetAlert.success(`✅ Orden #${ordenActiva.numeroOperacion} verificada completamente.`,
        undefined,
        {
          timer: 3000,
          timerProgressBar: true,
          showConfirmButton: false
        }
      );
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

    try {
      const [resFemex, resBlow] = await Promise.allSettled([
        axios.get<ApiResponse>(`${Urls.apiMeli.getVentas}${diasFemex}&cuenta=1`),
        axios.get<ApiResponse>(`${Urls.apiMeli.getVentas}${diasBlow}&cuenta=2`),
      ]);

      if (resFemex.status === "fulfilled") {
        const data = resFemex.value.data;
        if (data.success && data.data) {
          setOrdersFemex(data.data);
          if (data.kits) {

            // Si viene como array, lo convertimos a Record usando el SKU como clave
            const kitsProcesados = Array.isArray(data.kits)
              ? data.kits.reduce((acc: any, kit: any) => {
                acc[kit.sku] = kit;
                return acc;
              }, {})
              : data.kits; // Si ya es un objeto, lo deja igual

            setKitsMap(prev => {
              const nuevoMap = { ...prev, ...kitsProcesados };
              return nuevoMap;
            });
          }
        } else {
          sweetAlert.error(`Femex: ${data.message || "Error desconocido"}`);
          setOrdersFemex([]);
        }
      }

      if (resBlow.status === "fulfilled") {
        const data = resBlow.value.data;
        if (data.success && data.data) {
          setOrdersBlow(data.data);
          if (data.kits) {
            const kitsProcesados = Array.isArray(data.kits)
              ? data.kits.reduce((acc: any, kit: any) => {
                acc[kit.sku] = kit;
                return acc;
              }, {})
              : data.kits;

            setKitsMap(prev => {
              const nuevoMap = { ...prev, ...kitsProcesados };
              return nuevoMap;
            });
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
  const detectarEmpresaDesdeArchivo = (contenido: string): 'femex' | 'blow' | null => {
    const ID_FEMEX = "259559491";
    const ID_BLOW = "1235385416";

    if (contenido.includes(ID_FEMEX)) return 'femex';
    if (contenido.includes(ID_BLOW)) return 'blow';
    return null;
  };

  const handleArchivoTxt = (content: string, fileName: string) => {
    const empresa = detectarEmpresaDesdeArchivo(content);

    if (!empresa) {
      sweetAlert.warning("No se pudo detectar la empresa del archivo.", "El archivo no contiene los identificadores de FEMEX o BLOW.");
      return;
    }

    const idsExtraidos = extraerIdsDeEtiqueta(content);
    const idsKeys = Object.keys(idsExtraidos);

    if (idsKeys.length === 0) {
      sweetAlert.warning("No se encontraron IDs de venta en el archivo. Verificá el formato del ZPL.");
      return;
    }

    if (empresa === 'femex') {
      setIdsDelArchivoFemex(prev => {
        const nuevosIds = { ...prev, ...idsExtraidos };

        if (ordersFemex.length > 0) {
          const todosLosIdsKeys = Object.keys(nuevosIds);
          const coincidentes = ordersFemex.filter((o) => {
            const num = String(o.numeroOperacion);
            return todosLosIdsKeys.some((id) => num.endsWith(id) || id.endsWith(num));
          });

          setOrdenesVisiblesFemex(prevOrdenes => {
            const combinadas = [...prevOrdenes, ...coincidentes];
            const sinDuplicados = combinadas.filter((orden, index, self) =>
              index === self.findIndex((o) => o.numeroOperacion === orden.numeroOperacion)
            );
            setMostrarFiltradasFemex(true);
            return sinDuplicados;
          });
        }

        return nuevosIds;
      });

      if (ordersFemex.length === 0) {
        sweetAlert.warning(`Se encontraron ${idsKeys.length} IDs en el archivo, pero no hay órdenes de FEMEX cargadas. Primero obtené las órdenes.`);
        return;
      }

      const noEncontrados = idsKeys.filter(
        (id) => !ordersFemex.some((o) => {
          const num = String(o.numeroOperacion);
          return num.endsWith(id) || id.endsWith(num);
        })
      );

      let mensaje = `✅ Se agregaron etiquetas de FEMEX a partir de "${fileName}".`;
      if (noEncontrados.length > 0) {
        mensaje += `<br/><br/>⚠️ ${noEncontrados.length} IDs de FEMEX no se encontraron en las órdenes cargadas.`;
      }

      sweetAlert.fire({
        title: " FEMEX - Etiquetas acumuladas",
        html: mensaje,
        icon: "success",
        confirmButtonText: "OK",
      });

    } else {
      setIdsDelArchivoBlow(prev => {
        const nuevosIds = { ...prev, ...idsExtraidos };

        if (ordersBlow.length > 0) {
          const todosLosIdsKeys = Object.keys(nuevosIds);
          const coincidentes = ordersBlow.filter((o) => {
            const num = String(o.numeroOperacion);
            return todosLosIdsKeys.some((id) => num.endsWith(id) || id.endsWith(num));
          });

          setOrdenesVisiblesBlow(prevOrdenes => {
            const combinadas = [...prevOrdenes, ...coincidentes];
            const sinDuplicados = combinadas.filter((orden, index, self) =>
              index === self.findIndex((o) => o.numeroOperacion === orden.numeroOperacion)
            );
            setMostrarFiltradasBlow(true);
            return sinDuplicados;
          });
        }

        return nuevosIds;
      });

      if (ordersBlow.length === 0) {
        sweetAlert.warning(`Se encontraron ${idsKeys.length} IDs en el archivo, pero no hay órdenes de BLOW cargadas. Primero obtené las órdenes.`);
        return;
      }

      const noEncontrados = idsKeys.filter(
        (id) => !ordersBlow.some((o) => {
          const num = String(o.numeroOperacion);
          return num.endsWith(id) || id.endsWith(num);
        })
      );

      let mensaje = `✅ Se agregaron etiquetas de BLOW a partir de "${fileName}".`;
      if (noEncontrados.length > 0) {
        mensaje += `<br/><br/>⚠️ ${noEncontrados.length} IDs de BLOW no se encontraron en las órdenes cargadas.`;
      }

      sweetAlert.fire({
        title: "📦 BLOW - Etiquetas acumuladas",
        html: mensaje,
        icon: "success",
        confirmButtonText: "OK",
      });
    }
  };

  const expandirKitsEnOrdenesLocal = (ordenes: Order[], kitsMapLocal: Record<string, KitInfo>): Order[] => {
    return ordenes.map((orden) => {
      const itemsExpandidos: OrderItem[] = [];
      for (const item of orden.items) {
        const kitInfo = kitsMapLocal[item.sku];
        if (kitInfo) {
          for (const comp of kitInfo.componentes) {
            for (let i = 0; i < comp.cantidad; i++) {
              itemsExpandidos.push({
                sku: comp.sku,
                quantity: item.quantity,
                description: comp.descripcion || `[Kit] ${comp.sku} (de ${item.sku})`,
                codigoBarras: comp.codigoBarras,
              });
            }
          }
        } else {
          itemsExpandidos.push(item);
        }
      }

      const itemsAgrupados = agruparItemsPorSKU(
        itemsExpandidos.map((item) => ({
          sku: item.sku,
          codigoBarras: item.codigoBarras,
          quantity: item.quantity,
          esComponenteKit: false,
          descripcion: item.description,
        }))
      );

      return {
        ...orden,
        items: itemsAgrupados.map((item) => ({
          sku: item.sku,
          quantity: item.quantity,
          description: item.descripcion || '',
          codigoBarras: item.codigoBarras,
        })),
      };
    });
  };

  const handleConsolidadoStock = () => {
    const allOrdersSinFull = allOrders.filter((o) => o.tipo_envio !== "full");
    const ordenesVisiblesCombinadas = [...ordenesVisiblesFemex, ...ordenesVisiblesBlow];

    const allOrdersExpandidas = expandirKitsEnOrdenesLocal(allOrdersSinFull, kitsMap);
    const visiblesExpandidas = expandirKitsEnOrdenesLocal(ordenesVisiblesCombinadas, kitsMap);

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

  // ─── Render ─────────────────────────────────────────────────────────────
  const hayOrdenes = ordersFemex.length > 0 || ordersBlow.length > 0;

  return (
    <div
      className={`p-6 max-w-[1600px] mx-auto relative transition-all duration-200 ${isDragging ? "ring-4 ring-blue-400 ring-offset-2 bg-blue-50/50 rounded-xl" : ""}`}
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

       {/* Fila 1: Título y contadores */}
  <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-gray-100">
    <div className="flex items-center gap-3">
      <h2 className="text-2xl font-bold text-gray-800">Órdenes de Mercado Libre</h2>
      <div className="flex gap-2 text-sm">
        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">
          Mercado Envíos: <span className="font-bold">{pendientesMercadoEnvio}</span>
        </span>
        <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full font-medium">
          Envíos Flex: <span className="font-bold">{pendientesFlex}</span>
        </span>
      </div>
    </div>
  </div>

      {/* Fila 2: Controles */}
      <div className="flex flex-wrap items-end gap-3">

        {/* GRUPO 1: Días + Obtener órdenes */}
        <div className="flex items-end gap-3 p-2.5 bg-gray-50 border border-gray-200 rounded-xl">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Femex días</span>
            <input
              type="number"
              min="1"
              max="30"
              value={diasFemex}
              onChange={(e) => setDiasFemex(Number(e.target.value))}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Blow días</span>
            <input
              type="number"
              min="1"
              max="30"
              value={diasBlow}
              onChange={(e) => setDiasBlow(Number(e.target.value))}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
            />
          </label>
          <button
            onClick={handleFetchOrders}
            disabled={loading}
            className={`px-5 py-2.5 rounded-lg font-medium text-white shadow-sm transition-all duration-200 whitespace-nowrap ${loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 hover:shadow-md active:scale-[0.98]"
              }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Cargando...
              </span>
            ) : (
              "Obtener órdenes"
            )}
          </button>
        </div>

        {/* GRUPO 2: Mostrar filtradas + Modo Scanner */}
        <div className="flex items-center gap-2 p-2.5 bg-indigo-50/50 border border-indigo-200 rounded-xl">
          {(Object.keys(idsDelArchivoFemex).length > 0 || Object.keys(idsDelArchivoBlow).length > 0) && hayOrdenes && (
            <button
              onClick={toggleFiltro}
              className={`px-4 py-2.5 rounded-lg font-medium shadow-sm transition-all duration-200 whitespace-nowrap border ${mostrarFiltradasFemex || mostrarFiltradasBlow
                  ? "bg-indigo-100 border-indigo-300 text-indigo-800 hover:bg-indigo-200"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              title={mostrarFiltradasFemex ? "Mostrar todas las órdenes" : "Mostrar solo órdenes con etiqueta"}
            >
              {mostrarFiltradasFemex || mostrarFiltradasBlow ? (
                <span className="flex items-center gap-1.5">👁️ Mostrar todas</span>
              ) : (
                <span className="flex items-center gap-1.5">🔍 Mostrar filtradas</span>
              )}
            </button>
          )}

          <button
            onClick={() => {
              setModoScanner(!modoScanner);
              if (modoScanner) {
                setOrdenEnScan(null);
                setInputScan("");
              }
            }}
            className={`px-4 py-2.5 rounded-lg font-medium shadow-sm transition-all duration-200 whitespace-nowrap border ${modoScanner
                ? "bg-indigo-100 border-indigo-300 text-indigo-800 hover:bg-indigo-200"
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            title={modoScanner ? "Desactivar modo scanner" : "Activar modo scanner"}
          >
            {modoScanner ? (
              <span className="flex items-center gap-1.5">📡 Scanner activo</span>
            ) : (
              <span className="flex items-center gap-1.5">📡 Modo Scanner</span>
            )}
          </button>
        </div>

        {/* GRUPO 3: Botones de impresión */}
        {!modoScanner && (
          <div className="flex items-center gap-2 p-1.5 bg-indigo-50/50 border border-indigo-200 rounded-xl">
            <button
              onClick={() => generateEnviosPDF(allOrders, selectedOrders)}
              disabled={!allOrders.some((o) => selectedOrders.has(o.numeroOperacion) && o.tipo_envio !== "retiro_local")}
              className="px-4 py-3 bg-blue-600 m-1 text-white rounded-lg font-medium shadow-sm transition-all duration-200 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed hover:bg-blue-700 hover:shadow-md active:scale-[0.98] whitespace-nowrap text-sm"
            >
              🖨️ Imprimir envíos
            </button>

            <button
              onClick={() => printRetiroLocalHTML(allOrders, selectedOrders)}
              disabled={!allOrders.some((o) => selectedOrders.has(o.numeroOperacion) && o.tipo_envio === "retiro_local")}
              className="px-4 py-3 bg-amber-600 text-white rounded-lg font-medium shadow-sm transition-all duration-200 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed hover:bg-amber-700 hover:shadow-md active:scale-[0.98] whitespace-nowrap text-sm"
            >
              📄 Imprimir constancias
            </button>
          </div>
        )}

        {/* GRUPO 4: Cargar TXT + Consolidado */}
        <div className="flex items-center gap-2 p-2.5 bg-green-50/50 border border-green-200 rounded-xl mb-5">
          <BotonCargarTxt
            onFileRead={handleArchivoTxt}
            label="📁 Cargar etiquetas (.txt)"
          />
          <button
            onClick={handleConsolidadoStock}
            disabled={allOrders.length === 0}
            className="px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium shadow-sm transition-all duration-200 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed hover:bg-green-700 hover:shadow-md active:scale-[0.98] whitespace-nowrap text-sm"
          >
            📊 Consolidado de stock
          </button>
        </div>

      </div>

      {hayOrdenes && (
        <div className="flex gap-6">
          <ColumnaOrdenes
            titulo="Femex"
            orders={ordersFemex}
            ordenesVisibles={ordenesVisiblesFemex}
            mostrarFiltradas={mostrarFiltradasFemex}
            setMostrarFiltradas={setMostrarFiltradasFemex}
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
            mostrarFiltradas={mostrarFiltradasBlow}
            setMostrarFiltradas={setMostrarFiltradasBlow}
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

      {ordenEnScan && ordenActiva && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCerrarScan();
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col overflow-hidden">
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
                    style={{ width: `${(progresoActivo.verificados / progresoActivo.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {progresoActivo?.items.map((item, idx) => {
                const esKit = kitsMap[item.sku] !== undefined;
                const completo = item.verificados >= item.quantity;
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${completo ? "bg-green-50 border-green-300" : esKit ? "bg-blue-50 border-blue-300" : "bg-white border-gray-200"}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-800">{item.sku}</p>
                          {esKit && (
                            <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded">KIT</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{item.description}</p>
                        {item.codigoBarras && normalizarCodigoBarras(item.codigoBarras) && (
                          <p className="text-xs text-gray-400 font-mono mt-1">
                            CB: {normalizarCodigoBarras(item.codigoBarras)}
                          </p>
                        )}
                        {esKit && !item.codigoBarras && (
                          <p className="text-xs text-blue-600 mt-1">📦 Escaneá los componentes individuales</p>
                        )}
                      </div>
                      <span className={`text-sm font-bold px-2 py-1 rounded ${completo ? "bg-green-200 text-green-800" : "bg-blue-100 text-blue-800"}`}>
                        {item.verificados}/{item.quantity}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${completo ? "bg-green-500" : "bg-blue-400"}`}
                        style={{ width: `${(item.verificados / item.quantity) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {itemsVerificacion.some((i) => !normalizarCodigoBarras(i.codigoBarras) && !i.esComponenteKit) && (
                <div className="p-3 bg-orange-50 border border-orange-300 rounded-lg">
                  <p className="text-sm text-orange-700 font-medium">
                    ⚠️ Los siguientes productos no tienen código de barras registrado:
                  </p>
                  <ul className="text-sm text-orange-600 mt-1 list-disc list-inside">
                    {itemsVerificacion
                      .filter((i) => !normalizarCodigoBarras(i.codigoBarras) && !i.esComponenteKit)
                      .map((i, idx) => (
                        <li key={idx}>{i.sku} ({i.quantity} un.)</li>
                      ))}
                  </ul>
                </div>
              )}
            </div>

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