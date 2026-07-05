import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { FlechasNavigator } from './FlechasNavigator';
import Loader from './Loader';

interface ListarKitsProps {
  endpoint: string;
  onKitSeleccionado: (kit: any) => void;
  campos: string[];
  inputRef?: React.RefObject<HTMLInputElement>;
  limpiarQuery?: () => void;
  value?: string;
  onClose?: () => void;
  onChange?: (value: string) => void;
}

export const ListarKits: React.FC<ListarKitsProps> = ({
  endpoint,
  onKitSeleccionado,
  campos,
  inputRef,
  limpiarQuery,
  value = '',
  onClose,
  onChange,
}) => {
  const [query, setQuery] = useState<string>(value);
  const [resultados, setResultados] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Llamar al onChange del padre si existe
    if (onChange) {
      onChange(value);
    }

    // Limpiar el timeout anterior si existe
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Si hay valor en el input, proceder con el retraso
    if (value) {
      // Establecer un nuevo timeout para la búsqueda
      timerRef.current = setTimeout(async () => {
        try {
          setLoading(true);
          const response = await fetch(`${endpoint}?query=${value}`);
          const data = await response.json();
          setResultados(data);
        } catch (error) {
          console.error('Error buscando kits:', error);
        } finally {
          setLoading(false);
        }
      }, 500); // 500 ms de retraso (más rápido que productos)
    } else {
      setResultados([]);
      setLoading(false);
    }
  };

  const handleKitSeleccionado = (kit: any) => {
    if (kit) {
      onKitSeleccionado(kit);
      setResultados([]);
      setQuery(kit.skuKit);
      
      // Llamar al onChange del padre con el valor seleccionado
      if (onChange) {
        onChange(kit.skuKit);
      }
      
      if (localInputRef.current && localInputRef.current.nextElementSibling) {
        (localInputRef.current.nextElementSibling as HTMLElement).focus();
      }
    }
  };

  return (
    <div ref={containerRef}>
      <input
        autoComplete='off'
        type="text"
        ref={localInputRef}
        value={query}
        onChange={handleInputChange}
        placeholder="Buscar kit..."
        className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
      />
      {loading ? <Loader /> : (
        <FlechasNavigator
          resultados={resultados}
          onSeleccionado={handleKitSeleccionado}
          campos={campos}
        />
      )}
    </div>
  );
};