import { useState, useEffect } from "react";
import Loader from "./utilidades/Loader";
import { sweetAlert } from "./utilidades/SweetAlertWrapper";
import Urls from "./utilidades/Urls";

// Interfaz para la respuesta cruda del backend
interface EstadisticaRaw {
  producto_id: number;
  producto_sku: string;
  total_importado: string;
  cantSistemaFemex: number | null;
  cantSistemaBlow: number | null;
  total_vendido: string;
  total_devuelto: string;
  porcentaje_fallados: string;
}

// Interfaz para los datos procesados en el frontend
interface EstadisticaRMA {
  producto_id: number;
  producto_sku: string;
  total_importado: number;
  total_vendido: number;
  total_devuelto: number;
  porcentaje_fallados: number;
  cantSistemaFemex?: number;
  cantSistemaBlow?: number;
}

export const Estadisticas: React.FC = () => {
  const [estadisticas, setEstadisticas] = useState<EstadisticaRMA[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [filtrarCero, setFiltrarCero] = useState(false);
  const [porcentajeMinimo, setPorcentajeMinimo] = useState<number | "">("");

  const urlEstadisticas = Urls.estadisticas.estadisticas;

  const parseNumber = (value: string | number | null | undefined, fallback = 0): number => {
    if (value == null) return fallback;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? fallback : num;
  };

  const fetchEstadisticas = async () => {
    setLoading(true);

    try {
      const response = await fetch(urlEstadisticas);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Error al cargar estadísticas");
      }

      const data: EstadisticaRaw[] = await response.json();

      // Verificar si hay datos de stock
      const hasStockData = data.some(
        (item) => item.cantSistemaFemex != null || item.cantSistemaBlow != null
      );

      if (!hasStockData) {
        await sweetAlert.fire({
          icon: "warning",
          title: "Datos incompletos",
          text: "No se encontraron datos de stock para calcular estadísticas reales",
          confirmButtonText: "Entendido",
        });
        return;
      }

      // Validar y transformar datos
      const datosValidados: EstadisticaRMA[] = data.map((item) => {
        const stockTotal =
          (parseNumber(item.cantSistemaFemex) || 0) +
          (parseNumber(item.cantSistemaBlow) || 0);

        const totalImportado = parseNumber(item.total_importado);
        const totalVendido = Math.max(0, totalImportado - stockTotal);
        const totalDevuelto = parseNumber(item.total_devuelto);

        return {
          producto_id: item.producto_id,
          producto_sku: item.producto_sku || "N/A",
          total_importado: totalImportado,
          total_vendido: totalVendido,
          cantSistemaFemex: item.cantSistemaFemex ?? undefined,
          cantSistemaBlow: item.cantSistemaBlow ?? undefined,
          total_devuelto: totalDevuelto,
          porcentaje_fallados:
            totalVendido > 0
              ? parseFloat(((totalDevuelto * 100) / totalVendido).toFixed(2))
              : 0,
        };
      });

      setEstadisticas(datosValidados);
    } catch (error) {
      sweetAlert.close();
      await sweetAlert.fire({
        icon: "error",
        title: "Error",
        text: error instanceof Error ? error.message : "Error desconocido",
        confirmButtonText: "Entendido",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEstadisticas();
  }, []);

  const estadisticasFiltradas = estadisticas.filter((est) => {
    const sku = est.producto_sku.toLowerCase();
    const coincideSku = sku.includes(filtro.toLowerCase());
    const noEsCero = !filtrarCero || est.porcentaje_fallados > 0;
    const mayorAPorcentaje =
      porcentajeMinimo === "" || est.porcentaje_fallados > porcentajeMinimo;

    return coincideSku && noEsCero && mayorAPorcentaje;
  });

  const mostrarDetalleProducto = (producto: EstadisticaRMA) => {
    sweetAlert.fire({
      icon: "info",
      title: `Estadísticas completas para ${producto.producto_sku}`,
      html: `
        <div class="text-left">
          <p><strong>SKU:</strong> ${producto.producto_sku}</p>
          <p><strong>Total importado:</strong> ${producto.total_importado.toLocaleString()}</p>
          <p><strong>Total devuelto:</strong> ${producto.total_devuelto.toLocaleString()}</p>
          <p><strong>Porcentaje de fallos:</strong> 
            <span style="color: ${
              producto.porcentaje_fallados > 10
                ? "#dc2626"
                : producto.porcentaje_fallados > 1.99
                ? "#ea580c"
                : "#16a34a"
            }; font-weight: ${producto.porcentaje_fallados > 10 ? "bold" : "normal"}">
              ${producto.porcentaje_fallados}%
            </span>
          </p>
        </div>
      `,
      confirmButtonText: "Cerrar",
    });
  };

  const mostrarResumenCompleto = () => {
    const totalProductos = estadisticasFiltradas.length;
    const totalVendido = estadisticasFiltradas.reduce(
      (sum, item) => sum + item.total_vendido,
      0
    );
    const totalDevuelto = estadisticasFiltradas.reduce(
      (sum, item) => sum + item.total_devuelto,
      0
    );
    const porcentajeGeneral =
      totalVendido > 0
        ? parseFloat(((totalDevuelto * 100) / totalVendido).toFixed(2))
        : 0;

    sweetAlert.fire({
      icon: "info",
      title: "Resumen General",
      html: `
        <div class="text-left">
          <p><strong>Productos diferentes:</strong> ${totalProductos}</p>
          <p><strong>Total unidades vendidas:</strong> ${totalVendido.toLocaleString()}</p>
          <p><strong>Total unidades devueltas:</strong> ${totalDevuelto.toLocaleString()}</p>
          <p><strong>Porcentaje general de fallos:</strong> 
            <span style="color: ${
              porcentajeGeneral > 10
                ? "#dc2626"
                : porcentajeGeneral > 1.99
                ? "#ea580c"
                : "#16a34a"
            }; font-weight: ${porcentajeGeneral > 10 ? "bold" : "normal"}">
              ${porcentajeGeneral}%
            </span>
          </p>
        </div>
      `,
      confirmButtonText: "Cerrar",
      width: "600px",
    });
  };

  return (
    <div
      className="p-4 max-w-2xl mx-auto bg-white rounded-lg shadow-lg shadow-gray-500 mb-6"
      style={{ boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)" }}
    >
      {loading && <Loader />}
      <h1 className="text-2xl font-bold mb-6 text-center">
        Estadísticas de Devoluciones (RMA)
      </h1>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Buscar por SKU..."
          className="flex-grow w-1xs p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Porcentaje mayor a:"
            step="0.01"
            min="0"
            className="flex-grow w-1xs p-3 border ml-1 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={porcentajeMinimo}
            onChange={(e) => {
              const value = e.target.value === "" ? "" : parseFloat(e.target.value);
              setPorcentajeMinimo(value);
            }}
          />
          <button
            onClick={fetchEstadisticas}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin mr-2">↻</span> Cargando...
              </span>
            ) : (
              "Actualizar Datos"
            )}
          </button>
        </div>
      </div>

      <div>
        <button
          onClick={() => setFiltrarCero(!filtrarCero)}
          className={`mb-5 px-6 py-3 rounded-lg shadow transition-colors ${
            filtrarCero
              ? "bg-red-500 hover:bg-red-700 text-white"
              : "bg-green-600 hover:bg-green-700 text-white"
          }`}
        >
          {filtrarCero ? "Mostrar todos" : "Filtrar 0"}
        </button>
        <button
          onClick={mostrarResumenCompleto}
          className="px-6 py-3 ml-5 bg-green-600 border-black text-white rounded-lg hover:bg-green-700 transition-colors shadow"
        >
          Resumen general
        </button>
      </div>

      <div
        className="bg-white rounded-lg shadow overflow-hidden"
        style={{ boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)" }}
      >
        <div className="overflow-x-auto">
          <table className="divide-y divide-gray-300">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendidos
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Devuelto
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  % Fallos
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {estadisticasFiltradas.length > 0 ? (
                estadisticasFiltradas.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-100">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.producto_sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {item.total_vendido.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {item.total_devuelto.toLocaleString()}
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                        item.porcentaje_fallados > 10
                          ? "text-red-600"
                          : item.porcentaje_fallados > 1.99
                          ? "text-orange-600"
                          : "text-green-600"
                      }`}
                    >
                      {item.porcentaje_fallados}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <button
                        onClick={() => mostrarDetalleProducto(item)}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        Detalles
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    {loading
                      ? "Cargando datos..."
                      : filtro
                      ? "No se encontraron productos con ese SKU"
                      : "No hay datos disponibles"}
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