import React, { useState, useEffect } from 'react';
import { BusquedaClientes } from './utilidades/BusquedaClientes';
import { ListarProductos } from './utilidades/ListarProductos';
import { ListarMarcas } from './utilidades/ListarMarcas';
import { ListarOp } from './utilidades/ListarOp';
import Swal from 'sweetalert2';
import Loader from './utilidades/Loader';  // Importar el componente Loader
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

  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [marcaSeleccionada, setMarcaSeleccionada] = useState<Marca | null>(null);
  const [loading, setLoading] = useState(false);  // Estado para el loader
  const [sugerencias, setSugerencias] = useState<string[]>([]); // Estado para las sugerencias

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
  };

  const handleProductoSeleccionado = (producto: Producto) => {
    setProductoSeleccionado(producto);
  };

  const handleMarcaSeleccionada = (marca: Marca) => {
    setMarcaSeleccionada(marca);
  };

  const [opLoteSeleccionado, setOpLoteSeleccionado] = useState<any>(null);

  const handleOpLoteSeleccionado = (opLote: any) => {
    setOpLoteSeleccionado(opLote);  // Guarda la opción seleccionada en el estado
  };


  const buscarSugerencias = async (endpoint: string) => {
    setLoading(true);
    setSugerencias([]);
    try {
      const response = await fetch(endpoint);
      const data = await response.json();
      if (data.length > 0) {
        setSugerencias(data);
      } else {
        setSugerencias(['No hay coincidencia con su búsqueda']);
      }
    } catch (error) {
      console.error('Error al buscar sugerencias:', error);
      setSugerencias(['No hay coincidencia con su búsqueda']);
    } finally {
      setLoading(false);
    }
  };

  const enviarFormulario = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
  
    // Obtener el formulario manualmente
    const form = e.currentTarget.closest("form") as HTMLFormElement | null;
    if (!form) {
      console.error("No se encontró el formulario");
      return;
    }
  
    const target = form as typeof form & {
      cantidad: { value: string };
      solicita: { value: string };
      opLote: { value: string };
      vencimiento: { value: string };
      seEntrega: { value: string };
      seRecibe: { value: string };
      observaciones: { value: string };
      nIngreso: { value: string };
      nEgreso: { value: string };
    };
  
    // Validaciones de campos obligatorios
    if (!clienteSeleccionado) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo vacío',
        text: 'Debe seleccionar un cliente',
      });
      return;
    }
  
    if (!productoSeleccionado) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo vacío',
        text: 'Debe seleccionar un producto',
      });
      return;
    }
  
    if (!target.cantidad.value.trim()) {
          Swal.fire({
            icon: 'warning',
            title: 'Campo vacío',
            text: 'Debe ingresar la cantidad',
          });
          return;
        }

    if (!marcaSeleccionada) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo vacío',
        text: 'Debe seleccionar una marca',
      });
      return;
    }
    
    if (!target.solicita.value.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo vacío',
        text: 'Debe ingresar la fecha de solicitud',
      });
      return;
    }

    if (!opLoteSeleccionado) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo vacío',
        text: 'Debe ingresar la OP/Lote',
      });
      return;
    }
  ///////////////////////////////////////////////////////////////////////
    const formData = {
      modelo: productoSeleccionado?.id || '',
      cantidad: target.cantidad.value,
      marca: marcaSeleccionada?.id || '',
      solicita: target.solicita.value,
      opLote: opLoteSeleccionado?.nombre || null,
      vencimiento: target.vencimiento.value || null,
      seEntrega: target.seEntrega.value || null,
      seRecibe: target.seRecibe.value || null,
      observaciones: target.observaciones.value || null,
      nIngreso: target.nIngreso.value || null,
      nEgreso: target.nEgreso.value || null,
      idCliente: clienteSeleccionado?.id || '',
    };
   console.log('formData', formData)
    try {
      setLoading(true); // Mostrar el loader
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
      setLoading(false); // Ocultar el loader
    }
  };




  ///////////////////////////////////////////////////////////////////////
  return (
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
          <label htmlFor="modelo" className="block text-sm font-medium text-gray-700 mb-1 campoOculto">SKU<span className="text-red-500">*</span>:</label>
          <ListarProductos endpoint={urlProductos} onProductoSeleccionado={handleProductoSeleccionado} campos={['sku']} />
        </div>
        {productoSeleccionado && <input type="hidden" name="idProducto" value={productoSeleccionado.id} required />}

        <div className="divrelleno"></div>
        {loading && <Loader />} {/* Mostrar el loader mientras se carga */}
        <div id="suggestionsContainer2">
          {sugerencias.map((sugerencia, index) => (
            <div key={index} className="p-2 border-b border-gray-300">{sugerencia}</div>
          ))}
        </div>
        
        <div>
          <label htmlFor="cantidad" className="block text-sm font-medium text-gray-700 mb-1 campoOculto">Cantidad<span className="text-red-500">*</span>:</label>
          <input type="number" id="cantidad" name="cantidad" min="1" required className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none campoOculto" />
        </div>

        <div>
          <label htmlFor="marca" className="block text-sm font-medium text-gray-700 mb-1 campoOculto">Marca<span className="text-red-500">*</span>:</label>
          <ListarMarcas endpoint={urlMarcas} onMarcaSeleccionada={handleMarcaSeleccionada} campos={['nombre']} />
        </div>
        {marcaSeleccionada && (<input type="hidden" name="idMarca" required value={marcaSeleccionada.id} />)}

        <div>
          <label htmlFor="solicita" className="block text-sm font-medium text-gray-700 mb-1">Solicita:</label>
          <FechaInput id="solicita" value={solicita} onChange={setSolicita} />
        </div>
        <div>
          <label htmlFor="opLote" className="block text-sm font-medium text-gray-700 mb-1 campoOculto">OP/Lote<span className="text-red-500">*</span>:</label>
          <ListarOp endpoint={urlOp} onSeleccionado={handleOpLoteSeleccionado} campos={['nombre']} />
        </div>
        <div className="divrelleno"></div>
        <div id="suggestionsOp" className="suggestions-container" style={{ display: 'none' }}></div>

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
          <label htmlFor="numIngreso" className="block text-sm font-medium text-gray-700 mb-1 campoOculto">N° de Ingreso:</label>
          <input type="text" id="numIngreso" name="nIngreso" className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none campoOculto" />
        </div>

        <div>
          <label htmlFor="numEgreso" className="block text-sm font-medium text-gray-700 mb-1 campoOculto">N° de Egreso:</label>
          <input type="text" id="numEgreso" name="nEgreso" className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none campoOculto" />
        </div>

        <input type="hidden" id="idCliente" name="idCliente" />

        <div>
          <button
            type="button"
            id="botonCargar"
            onClick={(e) => enviarFormulario(e)}
            className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-300"
          >
            {loading ? 'Cargando...' : 'Cargar RMA'}  {/* Mostrar texto alternativo si loading es true */}
          </button>
          
        </div>
      </form>
    </div>
  );
};
