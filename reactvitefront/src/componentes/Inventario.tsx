// Inventario.tsx
import React, { useState, useEffect } from 'react';
import { StockManager } from './utilidades/StockManager';

interface Producto {
  id: number;
  sku: string;
  idBloque: string;
  cantSistemaFemex: number;
  cantSistemaBlow: number;
  conteoFisico: number | null;
  fechaConteo: string | null;
  observacion: string | null;
}

let urlPrepararInventario = 'https://rma-back.vercel.app/prepararInventario'; // URL de producción 
    if (window.location.hostname === 'localhost') { 
      urlPrepararInventario = 'http://localhost:8080/prepararInventario'; // URL de desarrollo 
    } 

export const Inventario: React.FC = () => {
  const [stockManager] = useState(() => new StockManager());
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState('');
  const [bloques, setBloques] = useState<string[]>([]);

  // Cargar datos iniciales
  useEffect(() => {
    const fetchProductos = async () => {
      try {
  const response = await fetch(`${urlPrepararInventario}`);
  const data: Producto[] = await response.json(); // Tipado explícito aquí
  
  setProductos(data);
  stockManager.cargarProductos(data);
  
  const bloquesUnicos: string[] = [...new Set(data.map(p => p.idBloque))].sort();
  setBloques(bloquesUnicos);
} catch (error) {
  console.error('Error al cargar productos:', error);
} finally {
  setLoading(false);
}
    };

    fetchProductos();
  }, []);

  const calcularDiferencia = (producto: Producto): number => {
    const totalSistema = producto.cantSistemaFemex + producto.cantSistemaBlow;
    return producto.conteoFisico !== null ? producto.conteoFisico - totalSistema : 0;
  };

  const handleConteoChange = (id: number, value: string) => {
    const numericValue = value === '' ? null : Number(value);
    
    setProductos(prev => prev.map(producto => 
      producto.id === id ? { ...producto, conteoFisico: numericValue } : producto
    ));
    
    // Actualizar el StockManager
    stockManager.actualizarConteoFisico(id, numericValue);
  };

  const handleGuardarTodo = async () => {
    try {
      const productosParaGuardar = productos.filter(p => p.conteoFisico !== null);
      
      await fetch('/api/productos/actualizar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productosParaGuardar),
      });
      
      alert(`${productosParaGuardar.length} productos actualizados correctamente`);
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Error al guardar los cambios');
    }
  };

  const productosFiltrados = productos.filter(p => 
    p.sku.toLowerCase().includes(filtro.toLowerCase()) &&
    (bloqueSeleccionado === '' || p.idBloque == bloqueSeleccionado)
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto bg-white rounded-lg shadow">
      <h1 className="text-xl font-bold mb-4">Conteo Físico de Inventario</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Buscar SKU</label>
          <input
            type="text"
            placeholder="Ej: EP504 N PI 130ML"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="w-full p-2 border rounded-md"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Bloque/Estantería</label>
          <select
            value={bloqueSeleccionado}
            onChange={(e) => setBloqueSeleccionado(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            <option value="">Todos los bloques</option>
            {bloques.map(bloque => (
              <option key={bloque} value={bloque}>{bloque}</option>
            ))}
          </select>
        </div>
        
        <div className="flex items-end">
          <button
            onClick={handleGuardarTodo}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 w-full"
          >
            Guardar Todo
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border text-left">SKU</th>
              <th className="p-2 border text-right">Stock Sistema</th>
              <th className="p-2 border text-right">Conteo Físico</th>
              <th className="p-2 border text-right">Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {productosFiltrados.length > 0 ? (
              productosFiltrados.map((producto) => {
                const diferencia = calcularDiferencia(producto);
                return (
                  <tr key={producto.id} className="hover:bg-gray-50">
                    <td className="p-2 border">{producto.sku}</td>
                    <td className="p-2 border text-right">
                      {producto.cantSistemaFemex + producto.cantSistemaBlow}
                    </td>
                    <td className="p-2 border">
                      <input
                        type="number"
                        min="0"
                        value={producto.conteoFisico ?? ''}
                        onChange={(e) => handleConteoChange(producto.id, e.target.value)}
                        className="w-full p-1 border rounded text-right"
                      />
                    </td>
                    <td className={`p-2 border text-right ${
                      diferencia > 0 ? 'text-green-600' : 
                      diferencia < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {diferencia !== 0 ? (diferencia > 0 ? `+${diferencia}` : diferencia) : '0'}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">
                  No se encontraron productos con los filtros aplicados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
        <div className="flex justify-between">
          <span>Productos totales: {productos.length}</span>
          <span>Filtrados: {productosFiltrados.length}</span>
          <span className="font-medium">
            Con conteo: {productos.filter(p => p.conteoFisico !== null).length}
          </span>
        </div>
      </div>
    </div>
  );
};