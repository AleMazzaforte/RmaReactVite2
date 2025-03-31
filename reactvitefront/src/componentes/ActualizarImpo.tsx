import { useState, useRef } from 'react';
import { ListarOp } from './utilidades/ListarOp';
import { ListarProductos } from './utilidades/ListarProductos';
import Loader from './utilidades/Loader';
import Swal from 'sweetalert2';

interface OpProducto {
  id: number;
  idOp: number;
  idSku: number;
  cantidad: number;
}

interface Op {
  id: number;
  nombre: string;
  fechaIngreso?: string;
}

interface Producto {
  id: number;
  sku: string;
}

interface ProductoConEstado extends Producto {
  cantidad: number;
  idOpProducto?: number;
  modificado: boolean;
  esNuevo?: boolean;
}

export const ActualizarImpo = () => {
  const [opSeleccionada, setOpSeleccionada] = useState<Op | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productosOp, setProductosOp] = useState<ProductoConEstado[]>([]);
  const [nuevoProducto, setNuevoProducto] = useState<Producto | null>(null);
  const [nuevaCantidad, setNuevaCantidad] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [eliminando, setEliminando] = useState<number | null>(null);

  // URLs
  let urlActualizarSelectivoOp = 'https://rma-back.vercel.app/actualizarOp';
  let urlListarOp = 'https://rma-back.vercel.app/listarOp';
  let urlProductos = 'https://rma-back.vercel.app/listarproductos';
  let urlOpProductos = 'https://rma-back.vercel.app/listarOpProductos';
  let urlGetSku = 'https://rma-back.vercel.app/getSku';
  let urlEliminarProductoOp = 'https://rma-back.vercel.app/eliminarProductoOp';
  
  if (window.location.hostname === 'localhost') {
    urlProductos = 'http://localhost:8080/listarproductos';
    urlOpProductos = 'http://localhost:8080/listarOpProductos';
    urlActualizarSelectivoOp = 'http://localhost:8080/actualizarOp';
    urlListarOp = 'http://localhost:8080/listarOp';
    urlGetSku = 'http://localhost:8080/getSku';
    urlEliminarProductoOp = 'http://localhost:8080/eliminarProductoOp';
  }

  const formatearFecha = (fechaISO?: string) => {
    if (!fechaISO) return 'Sin fecha';
    
    try {
      const [fecha] = fechaISO.split('T'); // Separar la parte de la fecha
      const [anio, mes, dia] = fecha.split('-');
      return `${dia}/${mes}/${anio}`;
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return fechaISO;
    }
  };

  const handleOpSeleccionada = async (ops: Op[]) => {
    if (ops.length === 0) return;
    
    const op = ops[0];
    setOpSeleccionada(op);
    setLoading(true);

    try {
      // 1. Obtener los productos de la OP
      const resOpProductos = await fetch(`${urlOpProductos}/${op.id}`);
      const opProductosData: OpProducto[] = await resOpProductos.json();
      
      // 2. Obtener los SKUs de los productos
      const idsProductos = opProductosData.map(opProd => opProd.idSku).join(',');
      const resProductos = await fetch(`${urlGetSku}/${idsProductos}`);
      const productosData: Producto[] = await resProductos.json();

      // 3. Combinar los datos
      const productosConEstado = opProductosData.map(opProd => {
        const producto = productosData.find(p => p.id === opProd.idSku);
        return {
          ...(producto || { id: opProd.idSku, sku: 'No encontrado' }),
          cantidad: opProd.cantidad,
          idOpProducto: opProd.id,
          modificado: false,
          esNuevo: false
        };
      });

      setProductosOp(productosConEstado);
      setProductos(productosData);

    } catch (error) {
      console.error('Error cargando datos:', error);
      Swal.fire('Error', 'No se pudieron cargar los datos de la OP', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleActualizarCantidad = (idOpProducto: number, nuevaCantidad: number) => {
    setProductosOp(prev => 
      prev.map(item => 
        item.idOpProducto === idOpProducto 
          ? { ...item, cantidad: nuevaCantidad, modificado: true } 
          : item
      )
    );
  };

  const handleEliminarProducto = async (idOpProducto: number) => {
    if (!idOpProducto || !opSeleccionada) return;
    
    try {
      setEliminando(idOpProducto);
      
      const response = await fetch(`${urlEliminarProductoOp}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idOp: opSeleccionada.id,
          idOpProducto: idOpProducto
        })
      });

      if (!response.ok) throw new Error('Error al eliminar');

      // Actualizar estado local inmediatamente
      setProductosOp(prev => prev.filter(item => item.idOpProducto !== idOpProducto));
      
      //Swal.fire('Éxito', 'Producto eliminado correctamente', 'success');
    } catch (error) {
      console.error('Error eliminando producto:', error);
      Swal.fire('Error', 'No se pudo eliminar el producto', 'error');
    } finally {
      setEliminando(null);
    }
  };

  const handleAgregarProducto = () => {
    if (!nuevoProducto) {
      Swal.fire('Error', 'Debes seleccionar un producto', 'error');
      return;
    }
    
    // Verificar si el producto ya está en la lista
    if (productosOp.some(p => p.id === nuevoProducto.id)) {
      Swal.fire('Error', 'Este producto ya está en la lista', 'error');
      return;
    }
    
    setProductosOp(prev => [
      ...prev,
      {
        ...nuevoProducto,
        cantidad: nuevaCantidad,
        modificado: true,
        esNuevo: true
      }
    ]);
    
    setNuevoProducto(null);
    setNuevaCantidad(0);
  };

  const handleGuardarCambios = async () => {
    if (!opSeleccionada) return;

    try {
      // Filtrar solo los productos modificados
      const productosModificados = productosOp.filter(p => p.modificado);

      if (productosModificados.length === 0) {
        Swal.fire('Info', 'No hay cambios para guardar', 'info');
        return;
      }

      const payload = {
        idOp: opSeleccionada.id,
        productos: productosModificados.map(item => ({
          idOpProducto: item.idOpProducto,
          idSku: item.id,
          cantidad: item.cantidad
        }))
      };

      const response = await fetch(`${urlActualizarSelectivoOp}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Error en la respuesta');

      // Recargar datos actualizados
      await handleOpSeleccionada([opSeleccionada]);
      
      Swal.fire('Éxito', 'Cambios guardados correctamente', 'success');
      
    } catch (error) {
      console.error('Error al guardar:', error);
      Swal.fire('Error', 'No se pudieron guardar los cambios', 'error');
    }
  };

  return (
    <div className="w-full max-w-xl bg-white rounded-lg shadow-lg shadow-gray-500 p-8 mx-auto mb-6"
      style={{ maxWidth: '600px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)' }}>
      
      <div className="flex justify-center mb-6">
        <div className="h-16 w-16 bg-gray-300 rounded-full flex items-center justify-center">
          <span className="text-gray-500 font-bold">LOGO</span>
        </div>
      </div>
      
      <h2 className="text-2xl font-semibold text-gray-700 text-center mb-8">
        Actualizar Impo
      </h2>
      
      <div>
        <label htmlFor="op" className="block text-sm font-medium text-gray-700 mb-1">
          Operación:
        </label>
        <ListarOp
          endpoint={urlListarOp}
          onSeleccionado={handleOpSeleccionada}
          campos={['nombre']}
        />
      </div>

      {loading ? (
        <Loader />
      ) : opSeleccionada && (
        <div className="mt-6">
          <h2 className="flex text-xl font-semibold mb-4">
            {opSeleccionada.nombre}    {<p className="ml-3.5 mr-3.5">  -   </p>}    {formatearFecha(opSeleccionada.fechaIngreso)}
          </h2>
          
            <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {productosOp.map((item) => (
          <tr key={item.idOpProducto || item.id} className="hover:bg-gray-100">
            <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
              {item.sku}
            </td>
            <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
              <input
                type="number"
                
                value={item.cantidad}
                onChange={(e) => 
                  handleActualizarCantidad(item.idOpProducto!, parseInt(e.target.value))
                }
                className="w-20 text-right  rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </td>
            <td className="px-6 py-3 whitespace-nowrap text-sm text-center">
              <button
                onClick={() => handleEliminarProducto(item.idOpProducto!)}
                disabled={eliminando === item.idOpProducto}
                className={`px-3 py-0.5 rounded text-sm ${
                  eliminando === item.idOpProducto 
                    ? 'bg-gray-400 text-white cursor-wait' 
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {eliminando === item.idOpProducto ? 'Eliminando...' : 'Eliminar'}
              </button>
            </td>
          </tr>
        ))}
        
        {/* Fila para agregar nuevo producto */}
        <tr className="hover:bg-gray-50">
          <td className="px-6 py-2 whitespace-nowrap">
            <div className="w-full  rounded px-2 py-1 -ml-3.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <ListarProductos
                endpoint={urlProductos}
                onProductoSeleccionado={setNuevoProducto}
                campos={['sku']}
                value={nuevoProducto?.sku || ''}
              />
            </div>
          </td>
          <td className="px-6 py-2 whitespace-nowrap text-right">
            <input
              type="number"
              min={0}
              value={nuevaCantidad}
              onChange={(e) => setNuevaCantidad(parseInt(e.target.value))}
              className="w-20 text-right  rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </td>
          <td className="px-6 py-3 whitespace-nowrap text-center">
            <button
              onClick={handleAgregarProducto}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            >
              Agregar
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
          <div className="mt-4 text-center">
            <button
              onClick={handleGuardarCambios}
              className="bg-blue-500 w-full text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Guardar Cambios
            </button>
          </div>
        </div>
      )}
    </div>
  );
};