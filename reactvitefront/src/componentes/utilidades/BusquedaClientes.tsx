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
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | null>(null);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = window.setTimeout(async () => {
      if (value) {
        setLoading(true);
        try {
          const response = await fetch(`${endpoint}?query=${value}`);
          const data = await response.json();
          setResultados(data.filter((cliente: any) => cliente.nombre.toLowerCase().includes(value.toLowerCase())));
        } catch (error) {
          console.error('Error buscando clientes:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setResultados([]);
        setLoading(false);
      }
    }, 500);
  };

  const handleClienteSeleccionado = (cliente: any) => {
    if (cliente) {
      onClienteSeleccionado(cliente);
      setResultados([]);
      setQuery(cliente.nombre);
      if (inputRef.current && inputRef.current.nextElementSibling) {
        (inputRef.current.nextElementSibling as HTMLElement).focus();
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
          onSeleccionado={handleClienteSeleccionado}
          campos={campos}
        />
      )}
    </div>
  );
};
