import React, { useState } from 'react';
import { BusquedaClientes } from './utilidades/BusquedaClientes';
import { ListarProductos } from './utilidades/ListarProductos';
import { ListarMarcas } from './utilidades/ListarMarcas';
import { ListarOp } from './utilidades/ListarOp';
import Swal from 'sweetalert2';
import Loader from './utilidades/Loader';
import FechaInput from './utilidades/FechaInput';
import UltimoNIngreso from './utilidades/UltimoNIngreso';

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
  const [ultimoNIngreso, setUltimoNIngreso] = useState<number>(0);
  const [solicita, setSolicita] = useState('');
  const [vencimiento, setVencimiento] = useState('');
  const [seEntrega, setSeEntrega] = useState('');
  const [seRecibe, setSeRecibe] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [nEgreso, setNEgreso] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [marcaSeleccionada, setMarcaSeleccionada] = useState<Marca | null>(null);
  const [loading, setLoading] = useState(false);
  const [mostrarCampos, setMostrarCampos] = useState(false);
  const [productosAgregados, setProductosAgregados] = useState<any[]>([]);

  let urlClientes = 'https://rmareactvite2.onrender.com/buscarCliente';
  let urlProductos = 'https://rmareactvite2.onrender.com/listarProductos';
  let urlMarcas = 'https://rmareactvite2.onrender.com/listarMarcas';
  let urlAgregarRma = 'https://rmareactvite2.onrender.com/agregarRma';
  let urlOp = 'https://rmareactvite2.onrender.com/listarOp';

  if (window.location.hostname === 'localhost') {
    urlClientes = 'http://localhost:8080/buscarCliente';
    urlProductos = 'http://localhost:8080/listarProductos';
    urlMarcas = 'http://localhost:8080/listarMarcas';
    urlAgregarRma = 'http://localhost:8080/agregarRma';
    urlOp = 'http://localhost:8080/listarOp';
  }

  const handleClienteSeleccionado = (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
    setUltimoNIngreso((prev) => prev + 1); // Incrementar el número de ingreso
    setMostrarCampos(true);
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

  const limpiarInputsProducto = () => {
    setProductoSeleccionado(null);
    setMarcaSeleccionada(null);
    setOpLoteSeleccionado(null);
    setObservaciones('');
    const form = document.getElementById('formRma') as HTMLFormElement;
    form.reset(); // Limpiar los valores de los inputs
  };

  const agregarProducto = () => {
    if (!productoSeleccionado || !marcaSeleccionada) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos vacíos',
        text: 'Debe seleccionar un producto y una marca',
      });
      return;
    }

    const form = document.getElementById('formRma') as HTMLFormElement;
    const formData = new FormData(form);
    const producto = {
      modelo: productoSeleccionado.id, // ID del producto
      sku: productoSeleccionado.sku, // SKU para mostrar en la lista
      cantidad: formData.get('cantidad') || '',
      marca: marcaSeleccionada.id, // ID de la marca
      nombreMarca: marcaSeleccionada.nombre, // Nombre de la marca para mostrar en la lista
      opLote: opLoteSeleccionado?.nombre || null,
      observaciones: formData.get('observaciones') || null,
    };
    setProductosAgregados([...productosAgregados, producto]);
    limpiarInputsProducto(); // Limpiar los inputs después de agregar un producto
  };

  const limpiarInputs = () => {
    setProductoSeleccionado(null);
    setMarcaSeleccionada(null);
    setOpLoteSeleccionado(null);
    setObservaciones('');
    setVencimiento('');
    setSeEntrega('');
    setSeRecibe('');
    setNEgreso('');
    const form = document.getElementById('formRma') as HTMLFormElement;
    form.reset(); // Limpiar los valores de los inputs
  };

  const enviarFormulario = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (!clienteSeleccionado) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo vacío',
        text: 'Debe seleccionar un cliente',
      });
      return;
    }

    if (productosAgregados.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo vacío',
        text: 'Debe agregar al menos un producto',
      });
      return;
    }
    const formData = {
      
      
      cliente: clienteSeleccionado.id,
      solicita,
      vencimiento,
      seEntrega,
      seRecibe,
      observaciones,
      nIngreso: ultimoNIngreso, // Tomar el valor de ultimoNIngreso
      nEgreso,
      productos: productosAgregados.map((producto) => ({
        modelo: producto.modelo, // ID del producto
        cantidad: producto.cantidad,
        marca: producto.marca, // ID de la marca
        opLote: producto.opLote,
        observaciones: producto.observaciones,
      })),
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
          title: 'RMA agregado',
          text: 'El RMA se ha agregado correctamente',
        });
        limpiarInputs(); // Limpiar los inputs después de guardar
        setProductosAgregados([]); // Limpiar la lista de productos agregados
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Hubo un problema al agregar el RMA',
        });
      }
    } catch (error) {
      console.error('Error al enviar el formulario:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Hubo un problema al enviar el formulario',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex'>
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
            <h3>Último N° de Ingreso: {ultimoNIngreso}</h3>
            <label htmlFor="clienteSearch" className="block text-sm font-medium text-gray-700 mb-1">
              Cliente<span className="text-red-500">*</span>:
            </label>
            <BusquedaClientes endpoint={urlClientes} onClienteSeleccionado={handleClienteSeleccionado} campos={['nombre']} />
            <UltimoNIngreso onNIngresoUpdate={setUltimoNIngreso} />
          </div>
          {clienteSeleccionado && <input type="hidden" name="idCliente" value={clienteSeleccionado.id} />}

          <div>
            <label htmlFor="solicita" className="block text-sm font-medium text-gray-700 mb-1">Solicita:</label>
            <FechaInput id="solicita" value={solicita} onChange={setSolicita} />
          </div>

          {mostrarCampos && (
            <>
              <div>
                <label htmlFor="modelo" className="block text-sm font-medium text-gray-700 mb-1">SKU<span className="text-red-500">*</span>:</label>
                <ListarProductos endpoint={urlProductos} onProductoSeleccionado={handleProductoSeleccionado} campos={['sku']} />
              </div>
              {productoSeleccionado && <input type="hidden" name="idProducto" value={productoSeleccionado.id} required />}

              <div>
                <label htmlFor="cantidad" className="block text-sm font-medium text-gray-700 mb-1">Cantidad<span className="text-red-500">*</span>:</label>
                <input type="number" id="cantidad" name="cantidad" min="1" required className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none" />
              </div>

              <div>
                <label htmlFor="marca" className="block text-sm font-medium text-gray-700 mb-1">Marca<span className="text-red-500">*</span>:</label>
                <ListarMarcas endpoint={urlMarcas} onMarcaSeleccionada={handleMarcaSeleccionada} campos={['nombre']} />
              </div>
              {marcaSeleccionada && <input type="hidden" name="idMarca" required value={marcaSeleccionada.id} />}

              <div>
                <label htmlFor="opLote" className="block text-sm font-medium text-gray-700 mb-1">OP/Lote<span className="text-red-500">*</span>:</label>
                <ListarOp endpoint={urlOp} onSeleccionado={handleOpLoteSeleccionado} campos={['nombre']} />
              </div>

              <div>
                <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700 mb-1">Observaciones:</label>
                <textarea
                  id="observaciones"
                  name="observaciones"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
                ></textarea>
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
                <label htmlFor="nEgreso" className="block text-sm font-medium text-gray-700 mb-1">N° de Egreso:</label>
                <input
                  type="text"
                  id="nEgreso"
                  name="nEgreso"
                  value={nEgreso}
                  onChange={(e) => setNEgreso(e.target.value)}
                  className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={agregarProducto}
                className="w-full py-2 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring focus:ring-green-300"
              >
                Agregar Producto
              </button>

              <button
                type="button"
                onClick={enviarFormulario}
                className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-300"
              >
                {loading ? 'Cargando...' : 'Guardar RMA'}
              </button>
            </>
          )}
        </form>
        {loading && <Loader />}
      </div>
      <div className="ml-8 fixed">
        <h3 className="text-xl font-semibold mb-4">Productos Agregados:</h3>
        <ul>
          {productosAgregados.map((producto, index) => (
            <li key={index} className="mb-2 p-2 border border-gray-300 rounded-lg">
              <strong>SKU:</strong> {producto.sku} | <strong>Cantidad:</strong> {producto.cantidad} | <strong>Marca:</strong> {producto.nombreMarca}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};