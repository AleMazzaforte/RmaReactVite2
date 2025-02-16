import React, { useState, useRef, ChangeEvent, useCallback } from 'react';
import { FlechasNavigator } from './FlechasNavigator';
import Loader from './Loader';

interface BusquedaTransportesProps {
  endpoint: string;
  onTransporteSeleccionado: (transporte: any) => void;
  campos: string[];
}

export const BusquedaTransportes: React.FC<BusquedaTransportesProps> = ({ endpoint, onTransporteSeleccionado, campos }) => {
  const [query, setQuery] = useState<string>('');
  const [resultados, setResultados] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimeout = useRef< number | null>(null); // Para manejar el timeout

  const handleInputChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);
      e.preventDefault();

      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current); // Limpiar el timeout anterior
      }

      if (value) {
        setLoading(true);

        // Retrasar la búsqueda por 500 ms
        debounceTimeout.current = setTimeout(async () => {
          try {
            const response = await fetch(`${endpoint}?query=${value}`);
            const data = await response.json();
            const filtrados = data.filter((transporte: any) => 
              transporte.nombre.toLowerCase().includes(value.toLowerCase())
            );
            setResultados(filtrados);
          } catch (error) {
            console.error('Error buscando transportes:', error);
          } finally {
            setLoading(false);
          }
        }, 500); // 500 ms de retraso
      } else {
        setResultados([]);
        setLoading(false);
      }
    },
    [endpoint]
  );

  const handleTransporteSeleccionado = (transporte: any) => {
    if (transporte) {
      onTransporteSeleccionado(transporte);
      setResultados([]);
      setQuery(transporte.nombre);
      if (inputRef.current && inputRef.current.nextElementSibling) {
        (inputRef.current.nextElementSibling as HTMLElement).focus();
      }
    }
  };

  return (
    <div>
      <input
        name="nombre"
        type="text"
        ref={inputRef}
        value={query}
        onChange={handleInputChange}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
          }
        }}
        placeholder="Buscar transporte"
        className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
      />
      {loading ? <Loader /> : (
        <FlechasNavigator
          resultados={resultados}
          onSeleccionado={handleTransporteSeleccionado}
          campos={campos}
        />
      )}
    </div>
  );
};
