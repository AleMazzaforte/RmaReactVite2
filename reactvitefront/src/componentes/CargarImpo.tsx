import React, { useState, useRef, useEffect } from 'react';
import Loader from './utilidades/Loader';
import FechaInput from './utilidades/FechaInput';
import { ListarProductos } from './utilidades/ListarProductos';
import Swal from 'sweetalert2';

let guardarOp = 'https://rma-back.vercel.app/guardarOp';
let urlProductos = 'https://rma-back.vercel.app/listarProductos';
//let urlMarcas = 'https://rma-back.vercel.app/listarMarcas';
//let urlAgregarRma = 'https://rma-back.vercel.app/agregarRma';
//let urlOp = 'https://rma-back.vercel.app/listarOp';

if (window.location.hostname === 'localhost') {
  guardarOp = 'http://localhost:8080/guardarOp';
  urlProductos = 'http://localhost:8080/listarProductos';
  //urlMarcas = 'http://localhost:8080/listarMarcas';
  //urlAgregarRma = 'http://localhost:8080/agregarRma';
  //urlOp = 'http://localhost:8080/listarOp';
}


interface Op {
  op: string;
  fechaIngreso: string;
}

export class OpFactory implements Op {
  op: string;
  fechaIngreso: string;

  constructor(op: string, fecha: string) {
    this.op = op;
    this.fechaIngreso = fecha;
  }
}

export class OpService {
  async agregarOperacion(operacion: Op): Promise<{ success: boolean; message: string; idOp?: number }> {
    try {
      const response = await fetch( guardarOp, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(operacion),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || `Error al guardar la operación. Código: ${response.status}`);
      }

      return { success: data?.success ?? true, message: data?.message ?? "Operación exitosa", idOp: data?.idOp };
    } catch (error) {
      console.error("Error en OpService:", error);      
      return { success: false, message: error + "" };
    }
  }
}

type GetProducto<T = {}> = T & Producto 

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
  const [nombre, setNombre] = useState('');
  const cantidadRef = useRef<HTMLInputElement>(null);
  const [productosAgregados, setProductosAgregados] = useState<ProductoAgregado[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const localInputRef = useRef<HTMLInputElement>(null);
  const [listarProductosKey, setListarProductosKey] = useState(0);

  const mostrarInputsProductos = nombre.trim() !== '' && fechaImpo.trim() !== '';
  
  const handleCargarOp = async () => {
    if (!nombre.trim() || !fechaImpo.trim()) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Debe completar todos los campos.' });
      return;
    }
  
    setLoading(true);
    const nuevaOp = new OpFactory(nombre, fechaImpo);
    const opService = new OpService();
  
    try {
      const { success, message } = await opService.agregarOperacion(nuevaOp);
  
      Swal.fire({
        icon: success ? 'success' : 'error',
        title: success ? 'Operación cargada' : 'Error',
        text: message,
      });
  
      if (success) {
        setNombre('');
        setFechaImpo('');
      }
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar la operación.' });
    } finally {
      setLoading(false);
    }
  };

   // Función para agregar un producto a la lista
   const handleProductoSeleccionado = (producto: GetProducto) => {
    
    if (producto && producto.sku && producto.id) {
      setProductoSeleccionado({ id: producto.id, sku: producto.sku });
    } else {
      setProductoSeleccionado(null);
    }
  };

  // Función para agregar un producto a la lista
  const agregarProducto = () => {
    const inputProductos = document.getElementById('skuInput') as HTMLInputElement;
    if (!productoSeleccionado) {
      inputProductos.focus() 
      Swal.fire({ 
        icon: 'error', 
        title: 'Error', 
        text: 'Debe seleccionar un producto válido.' 
      }).then (() => {
        inputProductos.focus();
        
      });
        return;
    }
      
    

    if ( !cantidadRef.current || !cantidadRef.current.value) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Debe seleccionar una cantidad válida.' });
      return;
    }    

    const cantidad = parseInt(cantidadRef.current.value, 10);
    if (isNaN(cantidad)) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'La cantidad debe ser un número válido.' });
      return;
    }

    if (cantidad <= 0) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'La cantidad debe ser mayor que 0.' });
      return;
    }

    // Crear el nuevo producto agregado
    const nuevoProductoAgregado: ProductoAgregado = {
      producto: productoSeleccionado, // Incluye id y sku
      cantidad: cantidad,
    };

    // Agregar el producto a la lista
    setProductosAgregados([...productosAgregados, nuevoProductoAgregado]);
    cantidadRef.current.value = ''; // Limpiar el input de cantidad
    setProductoSeleccionado(null); // Limpiar el producto
    
    
    if (localInputRef.current) {
      localInputRef.current.value = '';
      localInputRef.current.focus(); // Enfocar el input de producto 
      inputProductos.focus(); 
         
    }
    inputProductos.focus();
    setListarProductosKey((prevKey) => prevKey + 1); // Forzar la actualización de la lista de productos
  };


  // Función para eliminar un producto de la lista
  const eliminarProducto = (index: number) => {
    const nuevosProductos = productosAgregados.filter((_, i) => i !== index);
    setProductosAgregados(nuevosProductos);
  };
  
  const guardarProductosEnOpProductos = async (idOp: number, productos: ProductoAgregado[]) => {
    try {     
      const urlOpProductos = window.location.hostname === 'localhost' 
        ? 'http://localhost:8080/guardarOpProductos' 
        : 'https://rma-back.vercel.app/guardarOpProductos';
  
      const response = await fetch(urlOpProductos, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          productos.map((p) => ({
            idOp,
            sku: p.producto.sku,
            cantidad: p.cantidad,
          }))
        ),
      });
  
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Error al guardar los productos en opProductos');
      }
  
      return { success: true, message: 'Productos guardados correctamente' };
    } catch (error) {
      console.error('Error en guardarProductosEnOpProductos:', error);
      return { success: false, message: error + '' };
    }
  };

  const handleCargarOpYProductos = async () => {
    if (!nombre.trim() || !fechaImpo.trim() || productosAgregados.length === 0) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Debe completar todos los campos y agregar al menos un producto.' });
      return;
    }
  
    setLoading(true);
  
    try {
      // 1. Guardar la operación en la tabla OP
      const nuevaOp = new OpFactory(nombre, fechaImpo);
      const opService = new OpService();
      const { success, message, idOp } = await opService.agregarOperacion(nuevaOp);
  
      if (!success || !idOp) {
        throw new Error(message || 'No se pudo obtener el ID de la operación');
      }
  
      // 2. Guardar los productos en la tabla opProductos
      const { success: successProductos, message: messageProductos } = await guardarProductosEnOpProductos(
        idOp,
        productosAgregados
      );
  
      if (!successProductos) {
        throw new Error(messageProductos);
      }
  
      // 3. Mostrar mensaje de éxito y limpiar el formulario
      Swal.fire({ icon: 'success', title: 'Éxito', text: 'Operación y productos guardados correctamente' });
      setNombre('');
      setFechaImpo('');
      setProductosAgregados([]);
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error + '' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex w-full min-h-screen h-auto' >
      <div className="w-full max-w-xl bg-white rounded-lg shadow-lg p-8 mx-auto mb-6 h-auto">
        <h2 className="text-2xl font-semibold text-gray-700 text-center mb-8">Cargar Impo</h2>
        <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Operación:</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha:</label>
            <FechaInput id="fechaImpo" value={fechaImpo} onChange={setFechaImpo} />
          </div>

          {mostrarInputsProductos && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Producto:</label>
              <ListarProductos 
                key={listarProductosKey}
                endpoint={urlProductos} 
                onProductoSeleccionado={handleProductoSeleccionado} 
                campos={["sku"]} 
                inputRef={localInputRef} 
              />
                <br />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad:</label>
                <input type="number" className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none" ref={cantidadRef} />
              </div><br />
              <button 
                onClick={agregarProducto}
                type="button" 
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:bg-blue-700"
              >
                Agregar producto
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleCargarOpYProductos}
            className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700"
            disabled={loading}
          >
            {loading ? 'Cargando...' : 'Cargar OP'}
          </button>
          {loading && <Loader />}
        </form>
      </div>
      {/*Tabla de productos agregados a la derecha*/} 
      {productosAgregados.length > 0 && (
        <div className="relative right-5 top-5 w-[300px] bg-white p-5  -ml-[300px] h-auto">
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
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-200' : 'bg-white'}>
                  <td>{item.producto.sku}</td>
                  <td style={{ width: '80px' }}>{item.cantidad}</td>
                  <td>
                    <button onClick={() => eliminarProducto(index)} className="text-red-600 hover:text-red-800">Eliminar</button>
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
