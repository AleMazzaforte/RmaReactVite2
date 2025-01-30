import React, { useState, useRef, ChangeEvent } from 'react';
import { FlechasNavigator } from './FlechasNavigator';
import Loader from './Loader';

interface BusquedaClientesProps {
  endpoint: string;
  onClienteSeleccionado: (cliente: any) => void;
  campos: string[];
}

export const BusquedaClientes: React.FC<BusquedaClientesProps> = ({ endpoint, onClienteSeleccionado, campos }) => {
  const [query, setQuery] = useState<string>('');
  const [resultados, setResultados] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);  // Referencia al input

  const handleInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (value) {
      if (timer) clearTimeout(timer);  // Limpiar cualquier temporizador previo
      const newTimer = setTimeout(() => setLoading(true), 300); // Iniciar el temporizador para mostrar loader después de 3 segundos
      setTimer(newTimer);

      try {
        const response = await fetch(`${endpoint}?query=${value}`);
        const data = await response.json();
        setResultados(data.filter((cliente: any) => cliente.nombre.toLowerCase().includes(value.toLowerCase())));
      } catch (error) {
        console.error('Error buscando clientes:', error);
      } finally {
        if (newTimer) clearTimeout(newTimer);  // Limpiar el temporizador si el fetch finaliza antes de los 3 segundos
        setLoading(false);
      }
    } else {
      setResultados([]);
      setLoading(false);
    }
  };

  const handleClienteSeleccionado = (cliente: any) => {
    if (cliente) {
      onClienteSeleccionado(cliente);
      setResultados([]);
      setQuery(cliente.nombre);  // Mostrar el nombre seleccionado en el input
      if (inputRef.current && inputRef.current.nextElementSibling) {
        (inputRef.current.nextElementSibling as HTMLElement).focus();  // Saltar al siguiente campo
      }
    }
  };

  return (
    <div>
      <input
        type="text"
        ref={inputRef}
        value={query}
        onChange={handleInputChange}
        placeholder="Buscar cliente"
        className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
      />
      {loading ? <Loader /> : (
        <FlechasNavigator
          resultados={resultados}
          onClienteSeleccionado={handleClienteSeleccionado}
          campos={campos}
        />
      )}
    </div>
  );
};
