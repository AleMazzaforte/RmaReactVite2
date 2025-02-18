import React, { useState, useRef, useEffect } from 'react';
import Swal from 'sweetalert2';
import Loader from './utilidades/Loader';
import { BusquedaClientes } from './utilidades/BusquedaClientes';
import { BusquedaTransportes } from './utilidades/BusquedaTransportes'; // Importar BusquedaTransportes

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
  condicionDeEntrega: string;
  condicionDePago: string;
}

export const ActualizarClientes: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [transporteSeleccionado, setTransporteSeleccionado] = useState<string | null>(null); // Estado para el transporte seleccionado
  const formRef = useRef<HTMLFormElement>(null);
  const busquedaClientesRef = useRef<HTMLInputElement>(null);

  let urlListarClientes = 'https://rmareactvite2.onrender.com/listarCliente';
  let urlActualizarCliente = 'https://rmareactvite2.onrender.com/actualizarCliente';
  let urlBuscarTransporte = 'https://rmareactvite2.onrender.com/buscarTransporte'; // URL para buscar transportes

  if (window.location.hostname === 'localhost') {
    urlListarClientes = 'http://localhost:8080/listarCliente';
    urlActualizarCliente = 'http://localhost:8080/actualizarCliente';
    urlBuscarTransporte = 'http://localhost:8080/buscarTransporte';
  }

  const handleClienteSeleccionado = (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
    setTransporteSeleccionado(cliente.transporte); // Actualizar el transporte seleccionado
  };

  

  const handleTransporteSeleccionado = (transporte: any) => {
    setTransporteSeleccionado(transporte.nombre); // Asumimos que el transporte tiene un campo "nombre"
  };

  useEffect(() => {
    if (clienteSeleccionado && formRef.current) {
      const { nombre, cuit, provincia, ciudad, domicilio, telefono, transporte, seguro, condicionDeEntrega, condicionDePago } = clienteSeleccionado;
      formRef.current.cliente.value = nombre || '';
      formRef.current.cuit.value = cuit || '';
      formRef.current.provincia.value = provincia || '';
      formRef.current.ciudad.value = ciudad || '';
      formRef.current.domicilio.value = domicilio || '';
      formRef.current.telefono.value = telefono || '';
      formRef.current.transporte.value = transporte || '';
      formRef.current.seguro.value = seguro || '';
      formRef.current.condicionDeEntrega.value = condicionDeEntrega || '';
      formRef.current.condicionDePago.value = condicionDePago || '';
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
        transporte: transporteSeleccionado, // Usar el transporte seleccionado
        seguro: formData.get('seguro'),
        condicionDeEntrega: formData.get('condicionDeEntrega'),
        condicionDePago: formData.get('condicionDePago')
      };
      //console.log('Datos enviados:', data);
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
            text: `El cliente ${nombre} se ha actualizado correctamente`,
          }).then(() => {
            if (formRef.current) {
              formRef.current.reset();
              setTransporteSeleccionado(null); // Limpiar el transporte seleccionado
            }
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: mensajeError,
            text: `Hubo un problema al actualizar el cliente ${nombre}`,
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

  const handleActualizar = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (clienteSeleccionado) {
      const url = `${urlActualizarCliente}/${clienteSeleccionado.id}`;
      enviarFormulario(clienteSeleccionado.nombre, url, 'Cliente actualizado', 'Error al actualizar el cliente');
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'No se seleccionó ningún cliente',
        text: 'Seleccione un cliente para actualizar.',
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
          <BusquedaClientes endpoint={urlListarClientes} onClienteSeleccionado={handleClienteSeleccionado} campos={['nombre']} inputRef={busquedaClientesRef} value={clienteSeleccionado ? clienteSeleccionado.nombre : ''} />
          <input type="hidden" name="cliente" />
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
          <BusquedaTransportes
            endpoint={urlBuscarTransporte}
            onTransporteSeleccionado={handleTransporteSeleccionado} // Pasar la función para manejar la selección
            campos={['nombre']}
          />
          <input style={{position: 'fixed'}} type="hidden" name="transporte" value={transporteSeleccionado || ''} />
        </div>
        <div>
          <label htmlFor="seguro" className="block text-sm font-medium text-gray-700 mb-1">Seguro:</label>
          <select name="seguro" id="seguro" className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none">
            <option value="">Seleccionar</option>
            <option value="Mínimo">Mínimo</option>
            <option value="Sin IVA">Sin IVA</option>
            <option value="Mitad sin Iva">Mitad sin Iva</option>
          </select>
        </div>
        <div>
          <label htmlFor="condicionDeEntrega" className="block text-sm font-medium text-gray-700 mb-1">Condición de entrega:</label>
          <select name="condicionDeEntrega" id="condicionDeEntrega" className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none">
            <option value="">Seleccionar</option>
            <option value="Entrega a domicilio">Entrega a domicilio</option>
            <option value="Retira en depósito">Retira en depósito</option>
          </select>
        </div>
        <div>
          <label htmlFor="condicionDePago" className="block text-sm font-medium text-gray-700 mb-1">Condición de pago:</label>
          <select name="condicionDePago" id="condicionDePago" className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none">
            <option value="">Seleccionar</option>
            <option value="Pago en origen">Pago en origen</option>
            <option value="Pago en destino">Pago en destino</option>
          </select>
        </div>
        <div>
          <button
            type="button"
            onClick={handleActualizar}
            className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-yellow-700 focus:outline-none focus:ring focus:ring-yellow-300"
          >
            {loading ? 'Actualizando...' : 'Actualizar cliente'}
          </button>
        </div>
      </form>
      {loading && <Loader />}
    </div>
  );
};