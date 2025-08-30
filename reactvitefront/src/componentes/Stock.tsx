import React, { useState, useEffect } from "react";
import Loader from "./utilidades/Loader";
import { sweetAlert } from "./utilidades/SweetAlertWrapper";
import axios from "axios";
import Urls from "./utilidades/Urls";
import { ListarOp } from "./utilidades/ListarOp";

interface StockRMA {
  sku: string;
  marca: string;
  cantidad: number;
  opLote: string | null;
}

export const Stock: React.FC = () => {
  const [stock, setStock] = useState<StockRMA[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filtro, setFiltro] = useState<string>("");
  const [opSeleccionada, setOpSeleccionada] = useState<string | null>(null);
  const [modo, setModo] = useState<"total" | "detalle">("total"); // ← Nuevo estado

  
  const urlStockRMA = Urls.stock.obtener;
  const urlListarOp = Urls.rma.listarOp;

  const fetchStockRMA = async () => {
    setLoading(true);
    try {
      const response = await axios.get<StockRMA[]>(urlStockRMA);
      setStock(response.data);
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

  const handleOpSeleccionada = (opLote: { id: number; nombre: string; fechaIngreso?: string }[]) => {
    if (opLote.length > 0) {
      setOpSeleccionada(opLote[0].nombre);
      setFiltro("");
    } else {
      setOpSeleccionada(null);
    }
  };

  // Agrupar por SKU y marca si modo === "total"
  const stockAgrupado = modo === "total"
    ? stock.reduce((acc, item) => {
        const key = `${item.sku}-${item.marca}`;
        acc[key] = (acc[key] || 0) + Number(item.cantidad);
        return acc;
      }, {} as Record<string, number>)
    : null;

  // Crear lista de objetos agrupados
  const stockTotal = Object.keys(stockAgrupado || {}).map((key) => {
    const [sku, marca] = key.split("-");
    return {
      sku,
      marca,
      cantidad: (stockAgrupado || {})[key],
      opLote: null,
    };
  });

  // Filtrar por OP y texto
  const stockFiltrado = modo === "total"
    ? stockTotal.filter((item) =>
        `${item.sku} ${item.marca}`.toLowerCase().includes(filtro.toLowerCase())
      )
    : stock.filter((item) => {
        const coincideOp = opSeleccionada === null || item.opLote === opSeleccionada;
        const coincideFiltro = filtro
          ? `${item.sku} ${item.marca} ${item.opLote}`.toLowerCase().includes(filtro.toLowerCase())
          : true;
        return coincideOp && coincideFiltro;
      });

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
        {/* Selector de OP */}
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
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stockFiltrado.length > 0 ? (
                stockFiltrado.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-100">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {modo === "total" ? "-" : item.opLote || "Sin OP"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {item.marca}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-700">
                      {item.cantidad}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    {loading ? "Cargando..." : "No hay stock disponible"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};