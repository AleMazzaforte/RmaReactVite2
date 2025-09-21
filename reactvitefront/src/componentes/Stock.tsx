import React, { useState, useEffect, useMemo } from "react";
import Loader from "./utilidades/Loader";
import { sweetAlert } from "./utilidades/SweetAlertWrapper";
import axios from "axios";
import Urls from "./utilidades/Urls";
import { ListarOp } from "./utilidades/ListarOp";

import AsyncSelect from "react-select/async";

// ✅ Interfaz principal
interface StockRMA {
  idRma: number;
  sku: string;
  marca: string;
  cantidad: number;
  opLote: string | null;
  cliente: string;
}

// ✅ Tipo derivado: mismo que StockRMA pero SIN id ni cliente
type StockRMAAgrupado = Omit<StockRMA, "idRma" | "cliente">;

// ✅ Tipo unión para manejar ambos modos
type StockItem = StockRMA | StockRMAAgrupado;

export const Stock: React.FC = () => {
  // ✅ Datos crudos del backend (solo se cargan una vez)
  const [stockCrudo, setStockCrudo] = useState<StockRMA[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filtro, setFiltro] = useState<string>("");
  const [opSeleccionada, setOpSeleccionada] = useState<string>("");
  const [modo, setModo] = useState<"total" | "detalle">("total");

  // Estado para modal de ajuste
  const [modalAjusteAbierto, setModalAjusteAbierto] = useState(false);
  const [registroSeleccionado, setRegistroSeleccionado] =
    useState<StockRMA | null>(null);
  const [asignaciones, setAsignaciones] = useState<
    Array<{
      op: string | null;
      cantidad: number;
      cliente: string;
      idRma: number;
    }>
  >([]);

  const [cargandoOps, setCargandoOps] = useState(false);

  const urlStockRMA = Urls.stock.obtener;
  const urlListarOp = Urls.rma.listarOp;
  const urlActualizarOp = Urls.stock.actualizarOp;

  // Cargar stock inicial (solo una vez)
  const fetchStockRMA = async () => {
    setLoading(true);
    try {
      const response = await axios.get<StockRMA[]>(urlStockRMA);
      setStockCrudo(response.data);
    } catch (error) {
      sweetAlert.fire({
        icon: "error",
        title: "Error",
        text:
          axios.isAxiosError(error) && error.response?.data?.error
            ? error.response.data.error
            : "No se pudo cargar el stock de RMA",
        confirmButtonText: "Cerrar",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockRMA();
  }, []);

  // Función para cargar OPs con búsqueda (para react-select)
  const loadOptions = async (inputValue: string) => {
    if (!inputValue.trim()) return [];

    try {
      const response = await axios.get<{ id: number; nombre: string }[]>(
        `${urlListarOp}/${inputValue}`
      );
      return response.data.map((op) => ({
        value: op.nombre,
        label: op.nombre,
        id: op.id,
      }));
    } catch (error) {
      console.error("Error al cargar OPs:", error);
      return [];
    }
  };

  // Abrir modal de ajuste
  const handleAjustarClick = (item: StockRMA) => {
    // Filtrar todos los registros del mismo SKU
    const registrosDelSku = stockCrudo.filter((r) => r.sku === item.sku);

    // Convertir a asignaciones iniciales (con los valores actuales)
    const asignacionesIniciales = registrosDelSku.map((r) => ({
      op: r.opLote,
      cantidad: r.cantidad,
      cliente: r.cliente,
      idRma: r.idRma,
    }));

    setRegistroSeleccionado(item);
    setAsignaciones(asignacionesIniciales);
    loadOptions(""); // Cargar todas las OPs inicialmente
    setModalAjusteAbierto(true);
  };

  // Guardar ajustes (actualizar SOLO opLote por idRma)
  const handleGuardarAjustes = async () => {
    if (!registroSeleccionado) return;

    // Validar asignaciones
    for (let asig of asignaciones) {
      if (!asig.op) {
        sweetAlert.fire({
          icon: "warning",
          title: "Advertencia",
          text: "Selecciona una OP para cada registro.",
          confirmButtonText: "Cerrar",
        });
        return;
      }
    }

    try {
      setLoading(true);
      // Actualizar cada registro individualmente
      for (const asignacion of asignaciones) {
        const { idRma, op } = asignacion;

        // Llamar al nuevo endpoint
        await axios.post(
          `${urlActualizarOp}/${idRma}`,
          { opLote: op },
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      sweetAlert.fire({
        icon: "success",
        title: "¡Éxito!",
        text: "OPs asignadas correctamente.",
        confirmButtonText: "Cerrar",
      });

      setModalAjusteAbierto(false);
      fetchStockRMA(); // Recargar datos crudos
    } catch (error) {
      sweetAlert.fire({
        icon: "error",
        title: "Error",
        text: axios.isAxiosError(error)
          ? error.response?.data?.error || "Error al guardar ajustes"
          : "Error desconocido",
        confirmButtonText: "Cerrar",
      });
    } finally {
      setLoading(false);
    }
  };
  // Manejar selección de OP en filtro
  const handleOpSeleccionada = (
    opLote: { id: number; nombre: string; fechaIngreso?: string }[]
  ) => {
    if (opLote.length > 0) {
      setOpSeleccionada(opLote[0].nombre);
    } else {
      setOpSeleccionada("");
    }
    setFiltro(""); // Opcional: resetear filtro al cambiar OP
  };

  // ✅ Calcular stock filtrado/agrupado REACTIVAMENTE (sin recargar del backend)
  const stockFiltrado: StockItem[] = useMemo(() => {
    // Primero, aplicar filtro por OP
    let resultado = stockCrudo.filter((item) => {
      if (opSeleccionada === "") return true;
      return item.opLote === opSeleccionada;
    });

    // Luego, aplicar filtro de texto
    if (filtro) {
      const filtroLower = filtro.toLowerCase();
      resultado = resultado.filter(
        (item) =>
          item.sku.toLowerCase().includes(filtroLower) ||
          item.marca.toLowerCase().includes(filtroLower) ||
          (item.opLote && item.opLote.toLowerCase().includes(filtroLower))
      );
    }

    // Si modo es "total", agrupamos
    if (modo === "total") {
      const agrupado = resultado.reduce((acc, item) => {
        const key = `${item.sku}#${item.marca}`;
        if (!acc[key]) {
          acc[key] = {
            sku: item.sku,
            marca: item.marca,
            cantidad: 0,
            opLote: null,
          };
        }
        acc[key].cantidad += item.cantidad;
        return acc;
      }, {} as Record<string, StockRMAAgrupado>);

      return Object.values(agrupado);
    }

    // Si modo es "detalle", devolvemos los datos filtrados (sin agrupar)
    return resultado;
  }, [stockCrudo, modo, opSeleccionada, filtro]);

  return (
    <div
      className="p-4 max-w-2xl mx-auto bg-white rounded-lg shadow-lg shadow-gray-500 mb-6"
      style={{ boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)" }}
    >
      <h1 className="text-2xl font-bold mb-6 text-center">Stock de RMA</h1>
      {loading && <Loader />}

      {/* Filtro de texto */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar por SKU, marca..."
          className="w-100 p-3 border text-gray-700 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
      </div>

      {/* Botón para cambiar modo */}
      <div className="mb-4 flex">
        <button
          onClick={() => setModo(modo === "total" ? "detalle" : "total")}
          className={`px-6 py-2 rounded-lg shadow max-h-11 ${
            modo === "total"
              ? "bg-green-600 text-white"
              : "bg-blue-600 text-white"
          }`}
        >
          {modo === "total" ? "Mostrar por OP" : "Ver total"}
        </button>

        {/* Selector de OP (solo en modo detalle) */}
        {modo === "detalle" && (
          <div className="ml-4 w-70">
            <ListarOp
              endpoint={urlListarOp}
              onSeleccionado={handleOpSeleccionada}
              campos={["nombre"]}
            />
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Op/Lote
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Marca
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ajustar
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stockFiltrado.length > 0 ? (
                stockFiltrado.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-100">
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.sku}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-700">
                      {modo === "total" ? "-" : item.opLote || "Sin OP"}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-700">
                      {item.marca}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-700">
                      {item.cantidad}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-right">
                      {modo === "detalle" ? (
                        <button
                          id="ajustar-stock-btn"
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-700"
                          onClick={() => handleAjustarClick(item as StockRMA)}
                        >
                          Ajustar
                        </button>
                      ) : (
                        <button
                          id="ajustar-stock-btn"
                          className="px-4 py-2 bg-blue-300 text-white rounded-lg shadow hover:bg-blue-200"
                        >
                          Ajustar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    {loading ? "Cargando..." : "No hay stock disponible"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Ajuste de OP */}
      {modalAjusteAbierto && registroSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                Ajustar OP para {registroSeleccionado.sku} (
                {registroSeleccionado.cantidad} unidades)
              </h2>

              {asignaciones.map((asignacion, idx) => (
                <div
                  key={idx}
                  className="flex gap-4 mb-4 p-4 bg-gray-50 rounded"
                >
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      OP ({asignacion.cliente})
                    </label>
                    {cargandoOps ? (
                      <div>Cargando...</div>
                    ) : (
                      <AsyncSelect
                        cacheOptions
                        defaultOptions
                        loadOptions={loadOptions}
                        placeholder="Buscar OP..."
                        noOptionsMessage={() => "Escribe para buscar..."}
                        value={
                          asignacion.op
                            ? { value: asignacion.op, label: asignacion.op }
                            : null
                        }
                        onChange={(selectedOption) => {
                          const nuevasAsignaciones = [...asignaciones];
                          nuevasAsignaciones[idx].op = selectedOption
                            ? (selectedOption as { value: string }).value
                            : null;
                          setAsignaciones(nuevasAsignaciones);
                        }}
                        className="w-full"
                        classNamePrefix="react-select"
                      />
                    )}
                  </div>
                  <div className="w-32">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={asignacion.cantidad}
                      onChange={(e) => {
                        const nuevasAsignaciones = [...asignaciones];
                        nuevasAsignaciones[idx].cantidad =
                          parseInt(e.target.value) || 0;
                        setAsignaciones(nuevasAsignaciones);
                      }}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  {asignaciones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const nuevasAsignaciones = asignaciones.filter(
                          (_, i) => i !== idx
                        );
                        setAsignaciones(nuevasAsignaciones);
                      }}
                      className="mt-6 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {loading && <Loader />}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setModalAjusteAbierto(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarAjustes}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Guardar Ajustes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
