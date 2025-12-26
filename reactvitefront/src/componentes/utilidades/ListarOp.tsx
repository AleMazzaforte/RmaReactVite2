import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { FlechasNavigator } from './FlechasNavigator';
import Loader from './Loader';

interface Op {
  id: number;
  nombre: string;
  fechaIngreso?: string;
  skus: string[];
}

interface BusquedaOpLoteProps {
  endpoint: string;
  onSeleccionado: (opLote: Op[]) => void;
  campos: string[];
  value?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  onClose?: () => void;
}

export const ListarOp: React.FC<BusquedaOpLoteProps> = ({
  endpoint,
  onSeleccionado,
  campos,
  value = '',
  inputRef,
  onClose,
}) => {
  const [query, setQuery] = useState<string>(value);
  const [resultados, setResultados] = useState<Op[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const localInputRef = inputRef || useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (onClose && containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, timer]);

  const handleInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (timer) {
      clearTimeout(timer);
    }

    if (value) {
      const newTimer = setTimeout(async () => {
        try {
          setLoading(true);
          const url = `${endpoint}/${encodeURIComponent(value)}`;
          const response = await fetch(url);

          if (!response.ok) {
            throw new Error('Error al obtener los datos');
          }

          const data: Op[] = await response.json();
          setResultados(data);
        } catch (error) {
          console.error('Error buscando OP/Lote:', error);
          setResultados([]);
        } finally {
          setLoading(false);
        }
      }, 1000);
      setTimer(newTimer);
    } else {
      setResultados([]);
      setLoading(false);
      onSeleccionado([]);
    }
  };

  const handleSeleccionado = (opLote: Op) => {
    if (opLote) {
      const opCompleta = resultados.filter((item) => item.nombre === opLote.nombre);
      onSeleccionado(opCompleta);
      setResultados([]);
      setQuery(opLote.nombre);
      if (localInputRef.current && localInputRef.current.nextElementSibling) {
        (localInputRef.current.nextElementSibling as HTMLElement).focus();
      }
    }
  };

  const sugerenciasUnicas = Array.from(
    new Map(resultados.map((item) => [item.nombre, item])).values()
  );

  return (
    <div ref={containerRef}>
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
          resultados={sugerenciasUnicas}
          onSeleccionado={handleSeleccionado}
          campos={campos}
          useUniqueKey={true}
        />
      )}
    </div>
  );
};

