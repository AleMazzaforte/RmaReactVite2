import React, { useState, useRef, useEffect } from 'react';
import Swal from 'sweetalert2';
import Loader from './utilidades/Loader';
import { BusquedaClientes } from './utilidades/BusquedaClientes';

interface Cliente {
  id: string;
  nombre: string;
  cuit: string;
  provincia: string;
  ciudad: string;
  domicilio: string;
  telefono: string;
  transporte: string;
  seguro: string;
  condEntrega: string;
  condPago: string;
}

export const ActualizarClientes: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  let urlClientes = 'https://rmareactvite2.onrender.com/cargarCliente';
  let urlActualizarCliente = 'https://rmareactvite2.onrender.com/actualizarCliente';
  let urlEliminarCliente = 'https://rmareactvite2.onrender.com/eliminarCliente';

  if (window.location.hostname === 'localhost') {
    urlClientes = 'http://localhost:8080/cargarCliente';
    urlActualizarCliente = 'http://localhost:8080/actualizarCliente';
    urlEliminarCliente = 'http://localhost:8080/eliminarCliente';
  }

  const handleClienteSeleccionado = (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
  };

  useEffect(() => {
    if (clienteSeleccionado && formRef.current) {
      const { nombre, cuit, provincia, ciudad, domicilio, telefono, transporte, seguro, condEntrega, condPago } = clienteSeleccionado;
      formRef.current.cliente.value = nombre || '';
      formRef.current.cuit.value = cuit || '';
      formRef.current.provincia.value = provincia || '';
      formRef.current.ciudad.value = ciudad || '';
      formRef.current.domicilio.value = domicilio || '';
      formRef.current.telefono.value = telefono || '';
      formRef.current.transporte.value = transporte || '';
      formRef.current.seguro.value = seguro || '';
      formRef.current.condEntrega.value = condEntrega || '';
      formRef.current.condPago.value = condPago || '';
    }
  }, [clienteSeleccionado]);

  const enviarFormulario = async (nombre: string, url: string, mensajeExito: string, mensajeError: string) => {
    if (formRef.current) {
      const formData = new FormData(formRef.current);
      const data = {
        cliente: formData.get('cliente'),
        cuit: formData.get('cuit'),
        provincia: formData.get('provincia'),
        ciudad: formData.get('ciudad'),
        domicilio: formData.get('domicilio'),
        telefono: formData.get('telefono'),
        transporte: formData.get('transporte'),
        seguro: formData.get('seguro'),
        condEntrega: formData.get('condEntrega'),
        condPago: formData.get('condPago')
      };

      try {
        setLoading(true);
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          Swal.fire({
            icon: 'success',
            title: mensajeExito,
            text: `El cliente ${nombre} se ha procesado correctamente`,
          }).then(() => {
            if (formRef.current) {
              formRef.current.reset();
            }
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: mensajeError,
            text: 'Hubo un problema al procesar el cliente',
          });
        }
      } catch (error) {
        console.error('Error al enviar el formulario:', error);
        Swal.fire({
          icon: 'error',
          title: mensajeError,
          text: 'Hubo un problema al enviar el formulario',
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCrear = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    handleFormSubmit('crear');
  };

  const handleActualizar = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    handleFormSubmit('actualizar');
  };

  const handleEliminar = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    handleFormSubmit('eliminar');
  };

  const handleFormSubmit = (accion: string) => {
    if (formRef.current) {
      const formData = new FormData(formRef.current);
      const nombre = formData.get('cliente') as string;

      let url: string;
      let mensajeExito: string;
      let mensajeError: string;

      if (accion === 'crear') {
        url = urlClientes;
        mensajeExito = 'Cliente agregado';
        mensajeError = 'Error al agregar el cliente';
      } else if (accion === 'actualizar') {
        url = urlActualizarCliente;
        mensajeExito = 'Cliente actualizado';
        mensajeError = 'Error al actualizar el cliente';
      } else if (accion === 'eliminar') {
        url = urlEliminarCliente;
        mensajeExito = 'Cliente eliminado';
        mensajeError = 'Error al eliminar el cliente';
      }

      Swal.fire({
        title: `¿Quiere ${accion} a ${nombre} como cliente?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, proceder',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          enviarFormulario(nombre, url, mensajeExito, mensajeError);
        }
      });
    }
  };

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
      <h2 className="text-2xl font-semibold text-gray-700 text-center mb-8">Actualizar clientes</h2>
      <form id="formRma" className="space-y-6" ref={formRef}>
        <div>
          <label htmlFor="cliente" className="block text-sm font-medium text-gray-700 mb-1">
            Cliente:
          </label>
          <BusquedaClientes endpoint={urlClientes} onClienteSeleccionado={handleClienteSeleccionado} campos={['nombre']} />
          <input name="cliente" type="text" id="clienteSearch" className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none" />
        </div>
        <div>
          <label htmlFor="cuit" className="block text-sm font-medium text-gray-700 mb-1">CUIT:</label>
          <input type="number" name="cuit" id="cuit" className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none" />
        </div>
        <div>
          <label htmlFor="provincia" className="block text-sm font-medium text-gray-700 mb-1">Provincia:</label>
          <input type="text" id="provincia" name="provincia" className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none" />
        </div>
        <div>
          <label htmlFor="ciudad" className="block text-sm font-medium text-gray-700 mb-1">Ciudad:</label>
          <input type="text" id="ciudad" name="ciudad" className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none" />
        </div>
        <div>
          <label htmlFor="domicilio" className="block text-sm font-medium text-gray-700 mb-1">Domicilio:</label>
          <input type="text" id="domicilio" name="domicilio" autoComplete="off" className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none" />
        </div>
        <div>
          <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">Teléfono:</label>
          <input type="number" id="telefono" name="telefono" className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none" />
        </div>
        <div>
          <label htmlFor="transporte" className="block text-sm font-medium text-gray-700 mb-1">Transporte:</label>
          <input type="text" id="transporte" name="transporte" className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none" />
        </div>
        <div>
          <label htmlFor="seguro" className="block text-sm font-medium text-gray-700 mb-1">Seguro:</label>
          <input type="text" id="seguro" name="seguro" className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none" />
        </div>
        <div>
          <label htmlFor="condEntrega" className="block text-sm font-medium text-gray-700 mb-1">Condición de entrega:</label>
          <input type="text" id="condEntrega" name="condEntrega" className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none" />
        </div>
        <div>
          <label htmlFor="condPago" className="block text-sm font-medium text-gray-700 mb-1">Condición de pago:</label>
          <input type="text" id="condPago" name="condPago" className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none" />
        </div>
        <div>
          <button
            type="button"
            onClick={handleCrear}
            className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-300"
          >
            {loading ? 'Cargando...' : 'Cargar cliente'}
          </button>
        </div>
        <div>
          <button
            type="button"
            onClick={handleActualizar}
            className="w-full py-2 px-4 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 focus:outline-none focus:ring focus:ring-yellow-300"
          >
            {loading ? 'Cargando...' : 'Actualizar cliente'}
          </button>
        </div>
        <div>
          <button
            type="button"
            onClick={handleEliminar}
            className="w-full py-2 px-4 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 focus:outline-none focus:ring focus:ring-red-300"
          >
            {loading ? 'Cargando...' : 'Eliminar cliente'}
          </button>
        </div>
      </form>
      {loading && <Loader />}
    </div>
  );
};
