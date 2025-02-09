import React, { useState, useRef, useEffect } from 'react';
import Loader from './utilidades/Loader';
import FechaInput from './utilidades/FechaInput';
import { ListarProductos } from './utilidades/ListarProductos';
import Swal from 'sweetalert2';

interface Producto {
  id: number;
  sku: string;
}

interface ProductoAgregado {
  producto: Producto;
  cantidad: number;
}

export const CargarImpo = () => {
  const [loading, setLoading] = useState(false);
  const [fechaImpo, setFechaImpo] = useState('');
  const [op, setOp] = useState('');
  const [productosAgregados, setProductosAgregados] = useState<ProductoAgregado[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [mostrarTabla, setMostrarTabla] = useState(false); // Estado para controlar la visibilidad de la tabla
  const [listarProductosKey, setListarProductosKey] = useState(0); // Key para forzar la regeneración del input
  const cantidadRef = useRef<HTMLInputElement>(null);
  const listarProductoRef = useRef<HTMLInputElement>(null); // Ref para el input de ListarProductos

  let urlProductos = 'https://rmareactvite2.onrender.com/listarProductos';
  if (window.location.hostname === 'localhost') {
    urlProductos = 'http://localhost:8080/listarProductos';
  }

  useEffect(() => {
    // Enfocar el nuevo input de producto después de regenerarlo
    if (listarProductoRef.current) {
      listarProductoRef.current.focus();
    }
  }, [listarProductosKey]);

  const handleProductoSeleccionado = (producto: Producto) => {
    setProductoSeleccionado(producto);
  };

  const agregarProducto = () => {
    if (productoSeleccionado && cantidadRef.current && cantidadRef.current.value) {
      const cantidad = parseInt(cantidadRef.current.value, 10);
      if (cantidad > 0) {
        const nuevoProducto: ProductoAgregado = {
          producto: productoSeleccionado,
          cantidad: cantidad,
        };
        setProductosAgregados([...productosAgregados, nuevoProducto]);
        setProductoSeleccionado(null); // Limpiar el producto seleccionado
        cantidadRef.current.value = ''; // Limpiar el campo de cantidad
        console.log('Productoagragados', productosAgregados)
        // Mostrar la tabla si es el primer producto
        if (!mostrarTabla) {
          setMostrarTabla(true);
        }

        // Forzar la regeneración del input de ListarProductos
        setListarProductosKey(prevKey => prevKey + 1);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'La cantidad debe ser mayor a 0.',
        });
      }
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Seleccione un producto y especifique la cantidad.',
      });
    }
  };

  const eliminarProducto = (index: number) => {
    const nuevosProductos = productosAgregados.filter((_, i) => i !== index);
    setProductosAgregados(nuevosProductos);

    // Ocultar la tabla si no hay productos
    if (nuevosProductos.length === 0) {
      setMostrarTabla(false);
    }
  };

  const handleSubmit = async () => {
    if (!op || !fechaImpo || productosAgregados.length === 0) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Complete la OP, la fecha y agregue al menos un producto.',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('https://rmareactvite2.onrender.com/guardarImpo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          op,
          fechaIngreso: fechaImpo,
          productos: productosAgregados,
        }),
      });

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Éxito',
          text: 'Impo cargada correctamente.',
        });
        setProductosAgregados([]); // Limpiar la lista de productos
        setOp(''); // Limpiar el campo OP
        setFechaImpo(''); // Limpiar el campo fecha
        setMostrarTabla(false); // Ocultar la tabla
        
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Error al cargar la Impo.',
        });
      }
    } catch (error) {
      console.error('Error al enviar la Impo:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Hubo un problema al enviar la Impo.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex' }}>
      {/* Formulario a la izquierda */}
      <div className="w-full max-w-xl bg-white rounded-lg shadow-lg shadow-gray-500 p-8 mx-auto mb-6"
        style={{ maxWidth: '600px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)' }}
      >
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-gray-500 font-bold">LOGO</span>
          </div>
        </div>
        <h2 className="text-2xl font-semibold text-gray-700 text-center mb-8">
          Cargar Impo
        </h2>
        <form id='formMarca' className="space-y-6">
          <div>
            <label htmlFor="op" className="block text-sm font-medium text-gray-700 mb-1">Operación:</label>
            <input
              type="text"
              id="op"
              name="op"
              value={op}
              onChange={(e) => setOp(e.target.value)}
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="fechaImpo" className="block text-sm font-medium text-gray-700 mb-1">Fecha:</label>
            <FechaInput id="fechaImpo" value={fechaImpo} onChange={setFechaImpo} />
          </div>
          <div>
            <label htmlFor="producto" className="block text-sm font-medium text-gray-700 mb-1">Producto:</label>
            <ListarProductos
              key={listarProductosKey} // Usar la key para forzar la regeneración
              endpoint={urlProductos}
              onProductoSeleccionado={handleProductoSeleccionado}
              campos={["sku"]}
              inputRef={listarProductoRef}
            />
          </div>
          <div>
            <label htmlFor="cantidad" className="block text-sm font-medium text-gray-700 mb-1">Cantidad:</label>
            <input
              type="number"
              id="cantidad"
              name="cantidad"
              ref={cantidadRef}
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={agregarProducto}
            className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-300 mb-4"
          >
            Agregar producto
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-2 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring focus:ring-green-300"
          >
            {loading ? 'Cargando...' : 'Cargar Impo'}
          </button>
        </form>
      </div>

      {/* Tabla de productos agregados a la derecha */}
      {mostrarTabla && (
        <div style={{ 
          position: 'fixed', 
          right: '20px', 
          top: '20px', 
          width: '300px', // Ancho reducido de la tabla
          backgroundColor: '#fff', 
          padding: '20px', 
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          marginLeft: '20px', // Margen para separar la tabla del formulario
          zIndex: 1000, // Asegurar que la tabla esté por encima de otros elementos
        }}>
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Productos Agregados</h3>
          <table className="w-full">
            <thead>
              <tr>
                <th></th>
                <th></th> 
                <th></th>
                </tr>
            </thead>
            <tbody>
              {productosAgregados.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-200' : 'bg-white'}> {/* Fondo alternado */}
                  <td>{item.producto.sku}</td>
                  <td style={{ width: '80px' }}>{item.cantidad}</td> {/* Ancho fijo para la columna Cantidad */}
                  <td>
                    <button
                      onClick={() => eliminarProducto(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

