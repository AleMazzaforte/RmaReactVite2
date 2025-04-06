import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import { FlechasNavigator } from './FlechasNavigator';
import Loader from './Loader';

interface ListarMarcasProps {
  endpoint: string;
  onMarcaSeleccionada: (marca: any) => void;
  campos: string[];
  value?: string; // Nueva prop para sincronizar el valor del input
  inputRef?: React.RefObject<HTMLInputElement>; // Agregar inputRef a las props
}

export const ListarMarcas: React.FC<ListarMarcasProps> = ({
  endpoint,
  onMarcaSeleccionada,
  campos,
  value = '', // Valor por defecto vacío
  inputRef,
}) => {
  const [query, setQuery] = useState<string>(value); // Inicializar con el valor de la prop
  const [resultados, setResultados] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null); // Para manejar el timeout

  // Utilizar la ref pasada a través de props o crear una nueva si no se pasa ninguna
  const localInputRef = inputRef || useRef<HTMLInputElement>(null);

  // Sincronizar el estado interno `query` con la prop `value`
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Limpiar el timeout anterior si existe
    if (timer) {
      clearTimeout(timer);
    }

    // Si hay valor en el input, proceder con el retraso
    if (value) {
      
      // Establecer un nuevo timeout para la búsqueda
      const newTimer = setTimeout(async () => {
        try {
          setLoading(true);
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
      if (localInputRef.current && localInputRef.current.nextElementSibling) {
        (localInputRef.current.nextElementSibling as HTMLElement).focus(); // Saltar al siguiente campo
      }
    }
  };

  return (
    <div>
      <input
        id='marca'
        autoComplete='off'
        type="text"
        ref={localInputRef} // Usar la ref apropiada
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