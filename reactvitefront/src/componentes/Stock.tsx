import { useState, useEffect, useMemo } from "react";
import Loader from "./utilidades/Loader";
import { sweetAlert } from "./utilidades/SweetAlertWrapper";
import axios from "axios";
import Urls from "./utilidades/Urls";
import { ListarOp } from "./utilidades/ListarOp";

import AsyncSelect from "react-select/async";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

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

// ✅ Tipo unión para manejar ambos modoFiltros
type StockItem = StockRMA | StockRMAAgrupado;

// ✅ Tipo para items del informe
interface ItemInforme {
  sku: string;
  ops: { [op: string]: number }; // { "OP-123": 5, "OP-456": 3 }
  cantidadTotal: number;
}

export const Stock: React.FC = () => {
  const [stockCrudo, setStockCrudo] = useState<StockRMA[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filtro, setFiltro] = useState<string>("");
  const [opSeleccionada, setOpSeleccionada] = useState<string>("");
  const [modoFiltro, setmodoFiltro] = useState<"total" | "detalle">("total");

  // Estado para modal de ajuste
  const [modalAjusteAbierto, setModalAjusteAbierto] = useState(false);
  const [registroSeleccionado, setRegistroSeleccionado] = useState<StockRMA | null>(null);
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

  const fetchStockRMA = async () => {
    setLoading(true);
    try {
      const response = await axios.get<StockRMA[]>(urlStockRMA);
      setStockCrudo(response.data);
    } catch (error) {
      sweetAlert.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo cargar el stock de RMA",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockRMA();
  }, []);

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

  const handleAjustarClick = (item: StockRMA) => {
    const registrosDelSku = stockCrudo.filter((r) => r.sku === item.sku);
    const asignacionesIniciales = registrosDelSku.map((r) => ({
      op: r.opLote,
      cantidad: r.cantidad,
      cliente: r.cliente,
      idRma: r.idRma,
    }));
    setRegistroSeleccionado(item);
    setAsignaciones(asignacionesIniciales);
    setModalAjusteAbierto(true);
  };

  const handleGuardarAjustes = async () => {
    if (!registroSeleccionado) return;
    for (let asig of asignaciones) {
      if (!asig.op) {
        sweetAlert.fire({ icon: "warning", title: "Advertencia", text: "Selecciona una OP para cada registro." });
        return;
      }
    }

    try {
      setLoading(true);
      for (const asignacion of asignaciones) {
        const { idRma, op } = asignacion;
        await axios.post(`${urlActualizarOp}/${idRma}`, { opLote: op });
      }
      sweetAlert.fire({ icon: "success", title: "¡Éxito!", text: "OPs asignadas correctamente." });
      setModalAjusteAbierto(false);
      fetchStockRMA();
    } catch (error) {
      sweetAlert.fire({ icon: "error", title: "Error", text: "Error al guardar ajustes" });
    } finally {
      setLoading(false);
    }
  };

  const stockFiltrado: StockItem[] = useMemo(() => {
    let resultado = stockCrudo.filter((item) => {
      if (opSeleccionada === "") return true;
      return item.opLote === opSeleccionada;
    });

    if (filtro) {
      const filtroLower = filtro.toLowerCase();
      resultado = resultado.filter(
        (item) =>
          item.sku.toLowerCase().includes(filtroLower) ||
          item.marca.toLowerCase().includes(filtroLower) ||
          (item.opLote && item.opLote.toLowerCase().includes(filtroLower))
      );
    }

    if (modoFiltro === "total") {
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
    return resultado;
  }, [stockCrudo, modoFiltro, opSeleccionada, filtro]);

  const sumaTotalSKU = useMemo(() => {
    if (!filtro || modoFiltro === "total" || stockFiltrado.length === 0) return null;
    const primerSKU = stockFiltrado[0].sku;
    const todosIguales = stockFiltrado.every((item) => item.sku === primerSKU);
    if (!todosIguales) return null;
    const total = stockFiltrado.reduce((sum, item) => sum + item.cantidad, 0);
    return { sku: primerSKU, total: total };
  }, [stockFiltrado, filtro, modoFiltro]);

  return (
    <div
      className="p-4 max-w-4xl mx-auto bg-white rounded-lg shadow-lg mb-6"
      style={{ boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)" }}
    >
      <h1 className="text-2xl font-bold mb-6 text-center">Consulta de Stock RMA</h1>
      {loading && <Loader />}

      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar por SKU, marca..."
          className="w-full p-3 border text-gray-700 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-300 outline-none"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <button
          onClick={() => setmodoFiltro(modoFiltro === "total" ? "detalle" : "total")}
          className={`px-6 py-2 rounded-lg shadow transition ${modoFiltro === "total" ? "bg-green-600 text-white hover:bg-green-700" : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
        >
          {modoFiltro === "total" ? "Visualizar por OP" : "Visualizar Totales"}
        </button>

        {modoFiltro === "detalle" && (
          <div className="w-70">
            <ListarOp
              endpoint={urlListarOp}
              onSeleccionado={(ops) => setOpSeleccionada(ops.length > 0 ? ops[0].nombre : "")}
              campos={["nombre"]}
            />
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left font-bold text-gray-600 uppercase">SKU</th>
                <th className="px-6 py-3 text-left font-bold text-gray-600 uppercase">Op/Lote</th>
                <th className="px-6 py-3 text-left font-bold text-gray-600 uppercase">Marca</th>
                <th className="px-6 py-3 text-right font-bold text-gray-600 uppercase">Cantidad</th>
                <th className="px-6 py-3 text-right font-bold text-gray-600 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stockFiltrado.length > 0 ? (
                <>
                  {stockFiltrado.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{item.sku}</td>
                      <td className="px-6 py-4 text-gray-700">{modoFiltro === "total" ? "-" : item.opLote || "Sin OP"}</td>
                      <td className="px-6 py-4 text-gray-700">{item.marca}</td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">{item.cantidad}</td>
                      <td className="px-6 py-4 text-right">
                        {modoFiltro === "detalle" && (
                          <button
                            className="px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs shadow transition"
                            onClick={() => handleAjustarClick(item as StockRMA)}
                          >
                            Ajustar OP
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {sumaTotalSKU && (
                    <tr className="bg-yellow-50 border-t-2 border-yellow-300">
                      <td className="px-6 py-4 font-bold text-gray-900">TOTAL {sumaTotalSKU.sku}</td>
                      <td colSpan={2}></td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">{sumaTotalSKU.total}</td>
                      <td></td>
                    </tr>
                  )}
                </>
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">{loading ? "Cargando datos..." : "No se encontró stock disponible"}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalAjusteAbierto && registroSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto p-6">
            <h2 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">
              Ajustar OP: {registroSeleccionado.sku}
            </h2>
            {asignaciones.map((asignacion, idx) => (
              <div key={idx} className="flex gap-4 mb-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">OP ({asignacion.cliente})</label>
                  <AsyncSelect
                    cacheOptions
                    defaultOptions
                    loadOptions={loadOptions}
                    placeholder="Buscar OP..."
                    value={asignacion.op ? { value: asignacion.op, label: asignacion.op } : null}
                    onChange={(opt) => {
                      const nuevas = [...asignaciones];
                      nuevas[idx].op = opt ? (opt as any).value : null;
                      setAsignaciones(nuevas);
                    }}
                  />
                </div>
                <div className="w-24 text-right">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cant.</label>
                  <div className="p-2 bg-white border rounded font-bold text-gray-700">{asignacion.cantidad}</div>
                </div>
              </div>
            ))}
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModalAjusteAbierto(false)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition">Cancelar</button>
              <button onClick={handleGuardarAjustes} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow">Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
