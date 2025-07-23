import React, { useState, useRef, ChangeEvent, useEffect, useMemo } from 'react';
import { FlechasNavigator } from './FlechasNavigator';
import Loader from './Loader';
import { Debounce } from './Debounce';
import Swal from 'sweetalert2';


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

interface BusquedaClientesProps {
  endpoint: string;
  onClienteSeleccionado: (cliente: Cliente) => void;
  campos: string[];
  value?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export const BusquedaClientes: React.FC<BusquedaClientesProps> = ({
  endpoint,
  onClienteSeleccionado,
  campos,
  value = '',
  inputRef,
}) => {
  const [query, setQuery] = useState<string>(value);
  const [resultados, setResultados] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const localInputRef = inputRef || useRef<HTMLInputElement>(null);

  // Sincronizar el estado interno con la prop value
  useEffect(() => {
    setQuery(value);
  }, [value]);


  const buscarClientes = React.useCallback(async (value: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${endpoint}?query=${value}`);

      if (!response.ok) {
        throw new Error('Error en la respuesta del servidor');
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        const resultadosFiltrados = data.filter((cliente: Cliente) =>
          cliente?.nombre?.toLowerCase().includes(value.toLowerCase())
        );
        setResultados(resultadosFiltrados);
      } else {
        setResultados([]);
      }
    } catch (error) {
      console.error('Error buscando clientes:', error);
      Swal.fire ({
        icon: "error",
        title: "Error",
        text: "Error buscando clientes"
      })
      setResultados([]);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);;


  const debouncedBuscarClientes = React.useMemo(() =>
    Debounce((value: string) => buscarClientes(value), 800),
    [buscarClientes]
  );

  // Manejador de cambio en el input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (value.trim()) {
      debouncedBuscarClientes(value);
    } else {
      setResultados([]);
    }
  };


  // Selección de cliente
  const handleClienteSeleccionado = (cliente: Cliente) => {

    if (cliente) {
      onClienteSeleccionado(cliente);
      setResultados([]);
      setQuery(cliente.nombre);
      if (localInputRef.current?.nextElementSibling) {
        (localInputRef.current.nextElementSibling as HTMLElement).focus();
      }
    }
  };

  return (
    <div>
      <input
        autoComplete='off'
        type="text"
        ref={localInputRef}
        value={query}
        onChange={handleInputChange}
        placeholder="Buscar cliente"
        className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
      />
      {loading ? <Loader /> : (
        <FlechasNavigator
          resultados={resultados}
          onSeleccionado={handleClienteSeleccionado}
          campos={campos}
        />
      )}
    </div>
  );
};