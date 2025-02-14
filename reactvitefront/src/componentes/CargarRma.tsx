import React, { useState } from 'react';
import { BusquedaClientes } from './utilidades/BusquedaClientes';
import { ListarProductos } from './utilidades/ListarProductos';
import { ListarMarcas } from './utilidades/ListarMarcas';
import { ListarOp } from './utilidades/ListarOp';
import Swal from 'sweetalert2';
import Loader from './utilidades/Loader';
import FechaInput from './utilidades/FechaInput';

interface Cliente {
  id: string;
  nombre: string;
}

interface Producto {
  id: string;
  sku: string;
}

interface Marca {
  id: string;
  nombre: string;
}

export const CargarRma: React.FC = () => {
  const [solicita, setSolicita] = useState('');
  const [vencimiento, setVencimiento] = useState('');
  const [seEntrega, setSeEntrega] = useState('');
  const [seRecibe, setSeRecibe] = useState('');
  const [nIngreso, setNIngreso] = useState<number | null>(0); // Nuevo estado para nIngreso

  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [marcaSeleccionada, setMarcaSeleccionada] = useState<Marca | null>(null);
  const [loading, setLoading] = useState(false);
  const [sugerencias, setSugerencias] = useState<string[]>([]);
  const [productosAgregados, setProductosAgregados] = useState<Producto[]>([]); // Lista de productos agregados

  let urlClientes = 'https://rmareactvite2.onrender.com/buscarCliente';
  let urlProductos = 'https://rmareactvite2.onrender.com/listarProductos';
  let urlMarcas = 'https://rmareactvite2.onrender.com/listarMarcas';
  let urlAgregarRma = 'https://rmareactvite2.onrender.com/agregarRma';
  let urlOp = 'https://rmareactvite2.onrender.com/listarOp';
  let urlUltimoRemito = 'https://rmareactvite2.onrender.com/ultimoRemito'; // Nuevo endpoint para obtener el último remito

  if (window.location.hostname === 'localhost') {
    urlClientes = 'http://localhost:8080/buscarCliente';
    urlProductos = 'http://localhost:8080/listarProductos';
    urlMarcas = 'http://localhost:8080/listarMarcas';
    urlAgregarRma = 'http://localhost:8080/agregarRma';
    urlOp = 'http://localhost:8080/listarOp';
    urlUltimoRemito = 'http://localhost:8080/ultimoRemito'; // Endpoint local para desarrollo
  }

  const handleClienteSeleccionado = (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
  };

  const handleProductoSeleccionado = (producto: Producto) => {
    setProductoSeleccionado(producto);
  };

  const handleMarcaSeleccionada = (marca: Marca) => {
    setMarcaSeleccionada(marca);
  };

  const [opLoteSeleccionado, setOpLoteSeleccionado] = useState<any>(null);

  const handleOpLoteSeleccionado = (opLote: any) => {
    setOpLoteSeleccionado(opLote);
  };

  // Función para obtener el último número de remito
  const obtenerUltimoRemito = async () => {
    if (!clienteSeleccionado || !solicita) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Debes seleccionar un cliente e ingresar la fecha de solicitud.',
      });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${urlUltimoRemito}?clienteId=${clienteSeleccionado.id}&solicita=${solicita}`);
      const data = await response.json();
      console.log('data', data.ultimoNIngreso)

      if (data.ultimoNIngreso || data.ultimoNIngreso === 0) {
        
        const nuevoNIngreso = (parseInt(data.ultimoNIngreso) + 1); // Asigna el siguiente número de remito
        console.log('Nnuevoingreso', nuevoNIngreso);
        setNIngreso(nuevoNIngreso)
        console.log('setNumenro', nIngreso);                                                                        
      }
    } catch (error) {
      console.error('Error al obtener el último número de remito:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo obtener el número de remito. Inténtalo de nuevo.',
      });
    } finally {
      setLoading(false);
    }
  };
  

  // Función para agregar un producto a la lista
  const agregarProducto = () => {
    if (!productoSeleccionado) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo vacío',
        text: 'Debes seleccionar un producto.',
      });
      return;
    }

    setProductosAgregados([...productosAgregados, productoSeleccionado]);
    setProductoSeleccionado(null); // Limpiar el producto seleccionado
  };

  // Función para enviar el formulario
  const enviarFormulario = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (!clienteSeleccionado || !solicita || !nIngreso || productosAgregados.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Debes completar todos los campos y agregar al menos un producto.',
      });
      return;
    }

    const form = e.currentTarget.closest("form") as HTMLFormElement | null;
    if (!form) {
      console.error("No se encontró el formulario");
      return;
    }

    const target = form as typeof form & {
      cantidad: { value: string };
      opLote: { value: string };
      vencimiento: { value: string };
      seEntrega: { value: string };
      seRecibe: { value: string };
      observaciones: { value: string };
      nEgreso: { value: string };
    };

    const formData = {
      cliente: clienteSeleccionado.id,
      solicita,
      nIngreso,
      productos: productosAgregados.map((producto) => ({
        id: producto.id,
        cantidad: target.cantidad.value, // Asumiendo que la cantidad es la misma para todos los productos
      })),
      opLote: opLoteSeleccionado?.nombre || null,
      vencimiento: target.vencimiento.value || null,
      seEntrega: target.seEntrega.value || null,
      seRecibe: target.seRecibe.value || null,
      observaciones: target.observaciones.value || null,
      nEgreso: target.nEgreso.value || null,
    };

    try {
      setLoading(true);
      const response = await fetch(urlAgregarRma, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'RMA guardado',
          text: 'El RMA se ha guardado correctamente.',
        });
        // Limpiar el formulario después de guardar
        setClienteSeleccionado(null);
        setSolicita('');
        setNIngreso(null);
        setProductosAgregados([]);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Hubo un problema al guardar el RMA.',
        });
      }
    } catch (error) {
      console.error('Error al enviar el formulario:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Hubo un problema al enviar el formulario.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex mr-10">
      <div
        className="w-full max-w-xl bg-white rounded-lg shadow-lg shadow-gray-500 p-8 mx-auto mb-6"
        style={{ maxWidth: '600px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)' }}
      >
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-gray-500 font-bold">LOGO</span>
          </div>
        </div>
        <h2 className="text-2xl font-semibold text-gray-700 text-center mb-8">Cargar RMA</h2>
        <form id="formRma" className="space-y-6">
          <div>
            <label htmlFor="clienteSearch" className="block text-sm font-medium text-gray-700 mb-1">
              Cliente<span className="text-red-500">*</span>:
            </label>
            <BusquedaClientes endpoint={urlClientes} onClienteSeleccionado={handleClienteSeleccionado} campos={['nombre']} />
          </div>
          {clienteSeleccionado && <input type="hidden" name="idCliente" value={clienteSeleccionado.id} />}

          <div>
            <label htmlFor="solicita" className="block text-sm font-medium text-gray-700 mb-1">Solicita<span className="text-red-500">*</span>:</label>
            <FechaInput
              id="solicita"
              value={solicita}
              onChange={(value) => {
                setSolicita(value);
                obtenerUltimoRemito(); // Obtener el último remito después de ingresar solicita
              }}
            />
          </div>

          <div>
            <label htmlFor="modelo" className="block text-sm font-medium text-gray-700 mb-1 campoOculto">SKU<span className="text-red-500">*</span>:</label>
            <ListarProductos endpoint={urlProductos} onProductoSeleccionado={handleProductoSeleccionado} campos={['sku']} />
          </div>

          <div>
            <label htmlFor="cantidad" className="block text-sm font-medium text-gray-700 mb-1 campoOculto">Cantidad<span className="text-red-500">*</span>:</label>
            <input type="number" id="cantidad" name="cantidad" min="1" required className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none campoOculto" />
          </div>

          <div>
            <label htmlFor="marca" className="block text-sm font-medium text-gray-700 mb-1 campoOculto">Marca<span className="text-red-500">*</span>:</label>
            <ListarMarcas endpoint={urlMarcas} onMarcaSeleccionada={handleMarcaSeleccionada} campos={['nombre']} />
          </div>
          {marcaSeleccionada && <input type="hidden" name="idMarca" required value={marcaSeleccionada.id} />}

          <div>
            <label htmlFor="opLote" className="block text-sm font-medium text-gray-700 mb-1 campoOculto">OP/Lote<span className="text-red-500">*</span>:</label>
            <ListarOp endpoint={urlOp} onSeleccionado={handleOpLoteSeleccionado} campos={['nombre']} />
          </div>

          <div>
            <label htmlFor="vencimiento" className="block text-sm font-medium text-gray-700 mb-1">Vencimiento:</label>
            <FechaInput id="vencimiento" value={vencimiento} onChange={setVencimiento} />
          </div>

          <div>
            <label htmlFor="seEntrega" className="block text-sm font-medium text-gray-700 mb-1">Se Entrega:</label>
            <FechaInput id="seEntrega" value={seEntrega} onChange={setSeEntrega} />
          </div>

          <div>
            <label htmlFor="seRecibe" className="block text-sm font-medium text-gray-700 mb-1">Se Recibe:</label>
            <FechaInput id="seRecibe" value={seRecibe} onChange={setSeRecibe} />
          </div>

          <div>
            <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700 mb-1 campoOculto">Observaciones:</label>
            <textarea id="observaciones" name="observaciones" className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none campoOculto"></textarea>
          </div>

          <div>
            <label htmlFor="numEgreso" className="block text-sm font-medium text-gray-700 mb-1 campoOculto">N° de Egreso:</label>
            <input type="text" id="numEgreso" name="nEgreso" className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none campoOculto" />
          </div>

          <button
            type="button"
            onClick={agregarProducto}
            className="mt-2 w-full py-2 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring focus:ring-green-300"
          >
            Agregar Producto
          </button>

          <div>
            <button
              type="button"
              id="botonCargar"
              onClick={(e) => enviarFormulario(e)}
              className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-300"
            >
              {loading ? 'Cargando...' : 'Cargar RMA'}
            </button>
          </div>
        </form>
      </div>

      {/* Lista de productos agregados */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Productos Agregados:</h3>
        <ul>
          {productosAgregados.map((producto, index) => (
            <li key={index} className="p-2 border-b border-gray-300">
              {producto.sku}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};