import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import { FlechasNavigator } from './FlechasNavigator';
import Loader from './Loader';

interface Op {
  id: number;
  nombre: string;
  fechaIngreso?: string;
  producto: string;
  cantidad: number;
}

interface BusquedaOpLoteProps {
  endpoint: string;
  onSeleccionado: (opLote: Op[]) => void;
  campos: string[];
  value?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export const ListarOp: React.FC<BusquedaOpLoteProps> = ({
  endpoint,
  onSeleccionado,
  campos,
  value = '',
  inputRef,
}) => {
  const [query, setQuery] = useState<string>(value);
  const [resultados, setResultados] = useState<Op[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const localInputRef = inputRef || useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const handleInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (timer) {
      clearTimeout(timer);
    }

    if (value) {
      setLoading(true);

      const newTimer = setTimeout(async () => {
        try {
          const url = `${endpoint}/${encodeURIComponent(value)}`;
          const response = await fetch(url);

          if (!response.ok) {
            throw new Error('Error al obtener los datos');
          }

          const data: Op[] = await response.json();

          // Almacenar TODAS las OPs en resultados (para usarlas en el filtrado luego)
          setResultados(data);
        } catch (error) {
          console.error('Error buscando OP/Lote:', error);
          setResultados([]);
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

  const handleSeleccionado = (opLote: Op) => {
    if (opLote) {
      // Filtrar todas las filas de la OP seleccionada
      const opCompleta = resultados.filter((item) => item.nombre === opLote.nombre);
      onSeleccionado(opCompleta);
      setResultados([]); // Vaciar sugerencias
      setQuery(opLote.nombre);
      if (localInputRef.current && localInputRef.current.nextElementSibling) {
        (localInputRef.current.nextElementSibling as HTMLElement).focus();
      }
    }
  };

  // Obtener solo OPs únicas para las sugerencias
  const sugerenciasUnicas = Array.from(
    new Map(resultados.map((item) => [item.nombre, item])).values()
  );

  return (
    <div>
      <input
      id='opLote'
        autoComplete="off"
        type="text"
        ref={localInputRef}
        value={query}
        onChange={handleInputChange}
        placeholder="Buscar OP/Lote"
        className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
      />
      {loading ? (
        <Loader />
      ) : (
        <FlechasNavigator
          resultados={sugerenciasUnicas} // Mostrar solo nombres únicos en el listado
          onSeleccionado={handleSeleccionado}
          campos={campos}
          useUniqueKey={true}
        />
      )}
    </div>
  );
};
