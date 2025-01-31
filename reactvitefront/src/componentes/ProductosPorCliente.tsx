import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { TablaListarRmas } from './TablaListarRmas';
import { BusquedaClientes } from './utilidades/BusquedaClientes';
import { FlechasNavigator } from './utilidades/FlechasNavigator';

let url = 'https://rmareactvite2.onrender.com';
if (window.location.hostname === 'localhost') {
  url = 'http://localhost:8080';
}

interface Cliente {
  id: string;
  nombre: string;
}

export interface Rma {
  idRma?: string;
  modelo: string;
  cantidad: number;
  marca: string;
  solicita: string;
  opLote: string;
  vencimiento: string;
  seEntrega: string;
  seRecibe: string;
  observaciones: string;
  nIngreso: string;
  nEgreso: string;
}

export const ProductosPorCliente = (): JSX.Element => {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [rmas, setRmas] = useState<Rma[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState<boolean>(true);

  const handleClienteSeleccionado = (cliente: Cliente) => {
    setCliente(cliente);
    setMostrarFormulario(false);
    buscarRmas(cliente.id);
  };

  const buscarRmas = async (clienteId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${url}/getRmaCliente/${clienteId}`);
      const data = await response.json();

      if (data.length > 0) {
        setRmas(data);
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'Sin RMA',
          text: 'Este cliente no tiene RMA asociado.',
          confirmButtonText: 'Aceptar'
        }).then(() => {
          cambiarCliente(); // Restablecer el formulario al aceptar la alerta
        });
      }
    } catch (error) {
      console.error('Error al buscar RMA:', error);
      setRmas([]);
    } finally {
      setIsLoading(false);
    }
  };

  const cambiarCliente = () => {
    setMostrarFormulario(true);
    setCliente(null);
    setRmas([]);
  };

  const handleActualizar = (rmaActualizada: Rma) => {
    setRmas(rmas.map(rma => (rma.idRma === rmaActualizada.idRma ? rmaActualizada : rma)));
  };

  const handleEliminar = (id: string | undefined) => {
    if (id) {
      setRmas(rmas.filter(rma => rma.idRma !== id));
    }
  };

  return (
    <>
      {mostrarFormulario ? (
        <div className="w-full h-80 max-w-xl bg-white rounded-lg shadow-lg shadow-gray-500 p-8 mx-auto mb-6"
          style={{ maxWidth: '600px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)' }}
        >
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-gray-500 font-bold">LOGO</span>
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-gray-700 text-center mb-8">Gestión de productos por cliente</h1>
          <form className="space-y-6" onSubmit={e => e.preventDefault()}>
            <div>
              <label htmlFor="clienteSearch" className="block text-sm font-medium text-gray-700 mb-1">
                Cliente:
              </label>
              <BusquedaClientes
                endpoint={`${url}/buscarCliente`}
                onClienteSeleccionado={handleClienteSeleccionado}
                campos={['nombre']}
              />
            </div>
            <FlechasNavigator
              resultados={[]}
              onClienteSeleccionado={handleClienteSeleccionado}
              campos={['nombre']}
            />
          </form>
        </div>
      ) : null}

      {!mostrarFormulario && cliente && (
        <div>
          <h2 className="text-xl font-semibold text-gray-700 ml-10 mb-4"> {cliente?.nombre}</h2>
          
          {!isLoading && <TablaListarRmas rmas={rmas} handleActualizar={handleActualizar} handleEliminar={handleEliminar} />}
          <button 
            onClick={cambiarCliente}
            className="mb-4 ml-20 bg-gradient-to-b from-blue-500 to-green-500 text-white px-4 py-2 rounded"
          >
            Cambiar Cliente
          </button>
        </div>
      )}
    </>
  );
};
