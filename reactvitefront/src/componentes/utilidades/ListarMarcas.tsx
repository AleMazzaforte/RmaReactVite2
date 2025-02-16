import React, { useState, useRef, ChangeEvent } from 'react';
import { FlechasNavigator } from './FlechasNavigator';
import Loader from './Loader';

interface ListarMarcasProps {
  endpoint: string;
  onMarcaSeleccionada: (marca: any) => void;
  campos: string[];
}

export const ListarMarcas: React.FC<ListarMarcasProps> = ({ endpoint, onMarcaSeleccionada, campos }) => {
  const [query, setQuery] = useState<string>('');
  const [resultados, setResultados] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null); // Para manejar el timeout
  const inputRef = useRef<HTMLInputElement>(null); // Referencia al input

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Limpiar el timeout anterior si existe
    if (timer) {
      clearTimeout(timer);
    }

    // Si hay valor en el input, proceder con el retraso
    if (value) {
      setLoading(true);

      // Establecer un nuevo timeout para la búsqueda
      const newTimer = setTimeout(async () => {
        try {
          const response = await fetch(`${endpoint}?query=${value}`);
          const data = await response.json();
          setResultados(data.filter((marca: any) => marca.nombre.toLowerCase().includes(value.toLowerCase())));
        } catch (error) {
          console.error('Error buscando marcas:', error);
        } finally {
          setLoading(false);
        }
      }, 500); // 500 ms de retraso

      setTimer(newTimer);
    } else {
      setResultados([]);
      setLoading(false);
    }
  };

  const handleMarcaSeleccionada = (marca: any) => {
    if (marca) {
      onMarcaSeleccionada(marca);
      setResultados([]);
      setQuery(marca.nombre); // Mostrar la marca seleccionada en el input
      if (inputRef.current && inputRef.current.nextElementSibling) {
        (inputRef.current.nextElementSibling as HTMLElement).focus(); // Saltar al siguiente campo
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
        placeholder="Buscar marca"
        className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
      />
      {loading ? <Loader /> : (
        <FlechasNavigator
          resultados={resultados}
          onSeleccionado={handleMarcaSeleccionada}
          campos={campos}
        />
      )}
    </div>
  );
};
