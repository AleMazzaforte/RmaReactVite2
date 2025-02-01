import React, { useState, useRef, ChangeEvent } from 'react';
import { FlechasNavigator } from './FlechasNavigator';
import Loader from './Loader';

interface BusquedaOpLoteProps {
  endpoint: string;
  onSeleccionado: (opLote: any) => void;
  campos: string[];
}

export const ListarOp: React.FC<BusquedaOpLoteProps> = ({ endpoint, onSeleccionado, campos }) => {
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
        console.log('data', data);

        // Formatear datos eliminando duplicados
        const formattedData = data.map((item: any) => ({
          nombre: item.op
        }));

        const filteredData = formattedData.filter((opLote: any) =>
          opLote.nombre.toLowerCase().includes(value.toLowerCase())
        );
        console.log('filteredData', filteredData);

        // Eliminar duplicados usando la función
        const uniqueData = filteredData
          .map((item: any) => item.nombre)
          .reduce((unique: string[], item: string) => {
            return unique.includes(item) ? unique : [...unique, item];
          }, [])
          .map((name: string) => ({ nombre: name }));

        setResultados(uniqueData);
      } catch (error) {
        console.error('Error buscando OP/Lote:', error);
      } finally {
        if (newTimer) clearTimeout(newTimer);
        setLoading(false);
      }
    } else {
      setResultados([]);
      setLoading(false);
    }
  };

  const handleSeleccionado = (opLote: any) => {
    if (opLote) {
      onSeleccionado(opLote);
      setResultados([]);
      setQuery(opLote.nombre); // Usar "nombre" en lugar de "op"
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
        placeholder="Buscar OP/Lote"
        className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
      />
      {loading ? <Loader /> : (
        <FlechasNavigator
          resultados={resultados}
          onSeleccionado={handleSeleccionado}
          campos={campos}
        />
      )}
    </div>
  );
};
