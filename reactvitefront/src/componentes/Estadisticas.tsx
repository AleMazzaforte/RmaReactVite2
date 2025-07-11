import React, { useState, useEffect } from 'react';
import Loader from './utilidades/Loader';
import { sweetAlert } from './utilidades/SweetAlertWrapper';

interface EstadisticaRMA {
  producto_id: number;
  producto_sku: string;
  total_importado: number;
  total_vendido: number; // Nuevo campo
  total_devuelto: number;
  porcentaje_fallados: number;
  cantidadSistemaFemex?: number; // Nuevo campo opcional
  cantidadSistemaBlow?: number; // Nuevo campo opcional
}

export const Estadisticas: React.FC = () => {
  const [estadisticas, setEstadisticas] = useState<EstadisticaRMA[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState('');

  const urlEstadisticas = window.location.hostname === 'localhost' 
    ? 'http://localhost:8080/api/estadisticas/rma' 
    : 'https://rma-back.vercel.app/api/estadisticas/rma';

  const fetchEstadisticas = async () => {
  setLoading(true);
  
  try {
    const response = await fetch(urlEstadisticas);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al cargar estadísticas');
    }

    // Verificar si hay datos de stock
    const hasStockData = data.some((item: any) => 
      item.cantidadSistemaFemex !== undefined || item.cantidadSistemaBlow !== undefined
    );

    if (!hasStockData) {
      await sweetAlert.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'No se encontraron datos de stock para calcular estadísticas reales',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    // Validar y transformar datos
    const datosValidados: EstadisticaRMA[] = data.map((item: any) => {
      const stockTotal = (item.cantidadSistemaFemex || 0) + (item.cantidadSistemaBlow || 0);
      const totalVendido = Math.max(0, (item.total_importado || 0) - stockTotal);
      const totalDevuelto = Number(item.total_devuelto) || 0;

      return {
        producto_id: item.producto_id || 0,
        producto_sku: item.producto_sku || 'N/A',
        total_importado: item.total_importado || 0,
        total_vendido: totalVendido,
        cantidadSistemaFemex: item.cantidadSistemaFemex,
        cantidadSistemaBlow: item.cantidadSistemaBlow,
        total_devuelto: totalDevuelto,
        porcentaje_fallados: totalVendido > 0 
          ? parseFloat((totalDevuelto * 100 / totalVendido).toFixed(2))
          : 0
      };
    });

    setEstadisticas(datosValidados);
    
  } catch (error) {
    sweetAlert.close();
    await sweetAlert.fire({
      icon: 'error',
      title: 'Error',
      text: error instanceof Error ? error.message : 'Error desconocido',
      confirmButtonText: 'Entendido'
    });
  } finally {
    setLoading(false);
  }
};

  useEffect(() => { fetchEstadisticas(); }, []);

  // Filtro por SKU con manejo seguro
  const estadisticasFiltradas = estadisticas.filter(est => {
    const sku = est.producto_sku?.toString().toLowerCase() || '';
    return sku.includes(filtro.toLowerCase());
  });

  // Función para mostrar detalles de un producto
  const mostrarDetalleProducto = (producto: EstadisticaRMA) => {
    sweetAlert.fire({
      icon: 'info',
      title: `Estadísticas completas para ${producto.producto_sku}`,
      html: `
        <div className="text-left border-black">
          <p><strong>SKU:</strong> ${producto.producto_sku}</p>
          <p><strong>Total importado:</strong> ${producto.total_importado.toLocaleString()}</p>
          <p><strong>Total devuelto:</strong> ${producto.total_devuelto.toLocaleString()}</p>
          <p><strong>Porcentaje de fallos:</strong> 
            <span style="color: ${
              producto.porcentaje_fallados > 10 ? '#dc2626' : 
              producto.porcentaje_fallados > 5 ? '#ea580c' : '#16a34a'
            }; font-weight: ${producto.porcentaje_fallados > 10 ? 'bold' : 'normal'}">
              ${producto.porcentaje_fallados}%
            </span>
          </p>
        </div>
      `,
      confirmButtonText: 'Cerrar'
    });
  };
  let porcentaje: number = 0;
  // Mostrar resumen general
  const mostrarResumenCompleto = () => {
    const totalProductos = estadisticasFiltradas.length;
    const totalImportado = estadisticasFiltradas.reduce((sum, item) => sum + item.total_importado, 0);
    const totalDevuelto = estadisticasFiltradas.reduce((sum, item) => sum + item.total_devuelto, 0);
    porcentaje = totalImportado > 0 ? parseFloat((totalDevuelto * 100 / totalImportado).toFixed(2)) : 0;
 
    sweetAlert.fire({
     
      
      icon: 'info',
      title: 'Resumen General',
      html: `
        <div class="text-left">
          <p><strong>Productos diferentes:</strong> ${totalProductos}</p>
          <p><strong>Total unidades importadas:</strong> ${totalImportado.toLocaleString()}</p>
          <p><strong>Total unidades devueltas:</strong> ${totalDevuelto.toLocaleString()}</p>
          <p><strong>Porcentaje general de fallos:</strong> 
            <span style="color: ${
              porcentaje > 10 ? '#dc2626' : 
              porcentaje > 5 ? '#ea580c' : '#16a34a'
            }; font-weight: ${porcentaje > 10 ? 'bold' : 'normal'}">
              ${porcentaje}%
            </span>
          </p>
        </div>
      `,
      confirmButtonText: 'Cerrar',
      width: '600px'
    });
  };

  return (
    
    <div 
      className="p-4 max-w-2xl mx-auto  bg-white rounded-lg shadow-lg shadow-gray-500  mb-6"
      style={{  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)' }}
    >
      {loading && <Loader />}
      <h1 className="text-2xl font-bold mb-6 text-center">Estadísticas de Devoluciones (RMA)</h1>
      
      {/* Controles */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Buscar por SKU..."
          className="flex-grow w-2xs p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            onClick={fetchEstadisticas}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                
                <span className="animate-spin mr-2">↻</span> Cargando...
              </span>
            ) : 'Actualizar Datos'}
            
          </button>
          <button
            onClick={mostrarResumenCompleto}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow"
          >
            Ver Resumen
          </button>
        </div>
      </div>

      {/* Tabla de resultados */}
      <div className="bg-white rounded-lg shadow overflow-hidden"
      style={{  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)' }}
      >
        <div className="overflow-x-auto">
          <table className=" divide-y divide-gray-300">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Vendidos</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Devuelto</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">% Fallos</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
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
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                      item.porcentaje_fallados > 10 ? 'text-red-600' : 
                      item.porcentaje_fallados > 5 ? 'text-orange-600' : 'text-green-600'
                    }`}>
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
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    {loading ? 'Cargando datos...' : 
                    filtro ? 'No se encontraron productos con ese SKU' : 
                    'No hay datos disponibles'}
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