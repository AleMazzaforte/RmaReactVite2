import React, { useState, useRef, ChangeEvent } from 'react';
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
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
  
    if (value) {
      if (timer) clearTimeout(timer);
      const newTimer = setTimeout(() => setLoading(true), 300);
      setTimer(newTimer);
  
      try {
        const response = await fetch(`${endpoint}?query=${value}`);
        const data = await response.json();
        // Filtrar nombres coincidentes y guardar el objeto completo
        const filtrados = data.filter((transporte: any) => 
          transporte.nombre.toLowerCase().includes(value.toLowerCase())
        );
        setResultados(filtrados);
      } catch (error) {
        console.error('Error buscando transportes:', error);
      } finally {
        if (newTimer) clearTimeout(newTimer);
        setLoading(false);
      }
    } else {
      setResultados([]);
      setLoading(false);
    }
  };
  

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
        type="text"
        ref={inputRef}
        value={query}
        onChange={handleInputChange}
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

















