// DefinirBloques.tsx
import React, { useState, useEffect } from 'react';
import Urls from './utilidades/Urls';

interface ProductoBloque {
  id: number;
  sku: string;
  idBloque: string | null;
}

let urlPrepararInventario = Urls.inventario.preparar;
let urlActualizarBloques = Urls.inventario.actualizar;


export const DefinirBloques: React.FC = () => {
  const [productos, setProductos] = useState<ProductoBloque[]>([]);
  const [productosOriginales, setProductosOriginales] = useState<ProductoBloque[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [bloques, setBloques] = useState<string[]>([]);
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState('');
  const [nuevoBloque, setNuevoBloque] = useState('');
  const [productosSeleccionados, setProductosSeleccionados] = useState<number[]>([]);
  const [mostrarSinBloque, setMostrarSinBloque] = useState(false);
  const [filtroPorBloque, setFiltroPorBloque] = useState('');

  // Cargar datos iniciales
  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const response = await fetch(`${urlPrepararInventario}`);
        const data: ProductoBloque[] = await response.json();
        setProductos(data);
        setProductosOriginales(data);
        
        const bloquesUnicos = [...new Set(data.map(p => p.idBloque).filter(b => b !== null))] as string[];
        setBloques(bloquesUnicos);
      } catch (error) {
        console.error('Error al cargar productos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProductos();
  }, []);

  // Filtramos los productos según los filtros aplicados
  useEffect(() => {
    let filtrados = [...productosOriginales];

    // Aplicar filtro por bloque
    if (filtroPorBloque !== '') {
      filtrados = filtrados.filter(p => p.idBloque == filtroPorBloque);
      
    }
    
    // Aplicar filtro de mostrar sin bloque
    if (mostrarSinBloque) {
      filtrados = filtrados.filter(p => p.idBloque === null);
    }

    setProductos(filtrados);
  }, [filtroPorBloque, mostrarSinBloque, productosOriginales]);

  const toggleMostrarSinBloque = () => {
    setMostrarSinBloque(!mostrarSinBloque);
    setFiltroPorBloque(''); // Limpiamos el filtro por bloque
    setProductosSeleccionados([]);
    setFiltro('');
  };

  const handleSeleccionarBloque = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const valor = e.target.value;
    setBloqueSeleccionado(valor);
    setNuevoBloque('');
    setProductosSeleccionados([]);
  };

  const handleFiltroPorBloque = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFiltroPorBloque(e.target.value);
    setMostrarSinBloque(false); // Desactivamos mostrarSinBloque si está activo
    setProductosSeleccionados([]);
  };

  const handleSeleccionarProducto = (id: number, isChecked: boolean) => {
    setProductosSeleccionados(prev => 
      isChecked 
        ? [...prev, id] 
        : prev.filter(productId => productId !== id)
    );
  };

  const handleSeleccionarTodos = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setProductosSeleccionados(productosFiltrados.map(p => p.id));
    } else {
      setProductosSeleccionados([]);
    }
  };

  const handleGuardarCambios = async () => {
    if (!bloqueSeleccionado && !nuevoBloque) {
      alert('Selecciona o crea un bloque primero');
      return;
    }

    const bloqueFinal = nuevoBloque || bloqueSeleccionado;
    setGuardando(true);
    
    try {
      const response = await fetch(`${urlActualizarBloques}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bloque: bloqueFinal,
          productos: productosSeleccionados
        }),
      });

      if (response.ok) {
        const nuevosProductos = productosOriginales.map(p => 
          productosSeleccionados.includes(p.id) 
            ? { ...p, idBloque: bloqueFinal } 
            : p
        );
        
        setProductosOriginales(nuevosProductos);
        setProductos(nuevosProductos);
        setProductosSeleccionados([]);
        
        if (nuevoBloque && !bloques.includes(nuevoBloque)) {
          setBloques(prev => [...prev, nuevoBloque]);
          setNuevoBloque('');
        }
        
        alert('Bloques actualizados correctamente');
      } else {
        throw new Error('Error al guardar');
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Error al guardar los cambios');
    } finally {
      setGuardando(false);
    }
  };

  const productosFiltrados = productos.filter(p => 
    p.sku.toLowerCase().includes(filtro.toLowerCase())
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
      <h1 className="text-xl font-bold mb-4">Asignar Bloques de Inventario</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div className="md:col-span-1">
          <label className="block text-sm font-medium mb-1">Buscar SKU</label>
          <input
            type="text"
            placeholder="Buscar por SKU..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="w-full p-2 border rounded-md"
          />
        </div>
        
        <div className="md:col-span-1">
          <label className="block text-sm font-medium mb-1">Seleccionar Bloque</label>
          <div className="flex gap-2">
            <select
              value={bloqueSeleccionado}
              onChange={handleSeleccionarBloque}
              className="flex-1 p-2 border rounded-md"
            >
              <option value="">-- Seleccione bloque --</option>
              {bloques.map(bloque => (
                <option key={bloque} value={bloque}>Bloque {bloque}</option>
              ))}
              <option value="nuevo">-- Crear nuevo bloque --</option>
            </select>
          </div>
        </div>
        
        {bloqueSeleccionado === 'nuevo' && (
          <div className="md:col-span-1">
            <label className="block text-sm font-medium mb-1">Número de nuevo bloque</label>
            <input
              type="number"
              min="1"
              value={nuevoBloque}
              onChange={(e) => setNuevoBloque(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="Ej: 5"
            />
          </div>
        )}
        
        <div className="flex items-end">
          <button
            type="button"
            onClick={toggleMostrarSinBloque}
            className={`w-full p-2 border rounded-md ${
              mostrarSinBloque 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {mostrarSinBloque ? 'Mostrar Todos' : 'Mostrar Sin Bloque'}
          </button>
        </div>

        <div className="md:col-span-1">
          <label className="block text-sm font-medium mb-1">Filtrar por bloque</label>
          <select
            value={filtroPorBloque}
            onChange={handleFiltroPorBloque}
            className="w-full p-2 border rounded-md"
          >
            <option value="">-- Todos los bloques --</option>
            {bloques.map(bloque => (
              <option key={bloque} value={bloque}>
                Bloque {bloque}
              </option>
            ))}
            <option value="sin-bloque">Sin bloque asignado</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto mb-4">
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border text-left">
                <input
                  type="checkbox"
                  onChange={handleSeleccionarTodos}
                  checked={productosSeleccionados.length > 0 && 
                    productosSeleccionados.length === productosFiltrados.length}
                />
              </th>
              <th className="p-2 border text-left">SKU</th>
              <th className="p-2 border text-left">Bloque Actual</th>
            </tr>
          </thead>
          <tbody>
            {productosFiltrados.length > 0 ? (
              productosFiltrados.map((producto) => (
                <tr key={producto.id} className="hover:bg-gray-50">
                  <td className="p-2 border text-center">
                    <input
                      type="checkbox"
                      checked={productosSeleccionados.includes(producto.id)}
                      onChange={(e) => handleSeleccionarProducto(producto.id, e.target.checked)}
                    />
                  </td>
                  <td className="p-2 border">{producto.sku}</td>
                  <td className="p-2 border">
                    {producto.idBloque || 'Sin asignar'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="p-4 text-center text-gray-500">
                  No se encontraron productos con los filtros aplicados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {productosSeleccionados.length} productos seleccionados | 
          Bloque a asignar: {nuevoBloque || bloqueSeleccionado || 'No seleccionado'} |
          Mostrando: {mostrarSinBloque ? 'Sin bloque' : filtroPorBloque ? (filtroPorBloque === 'sin-bloque' ? 'Sin bloque' : `Bloque ${filtroPorBloque}`) : 'Todos'}
        </div>
        <button
          onClick={handleGuardarCambios}
          disabled={guardando || productosSeleccionados.length === 0}
          className={`px-4 py-2 rounded-md text-white ${
            guardando || productosSeleccionados.length === 0 
              ? 'bg-gray-400' 
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {guardando ? 'Guardando...' : 'Asignar Bloque'}
        </button>
      </div>
    </div>
  );
};