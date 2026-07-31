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
  const [query, setQuery] = useState<string>(value); // ✅ Iniciar en mayúsculas
  const [resultados, setResultados] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const localInputRef = inputRef || useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery(value.toUpperCase());
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
    // ✅ Convertir inmediatamente a mayúsculas
    const valorUpper = e.target.value;
    setQuery(valorUpper.toUpperCase());

    if (onChange) {
      onChange(valorUpper);
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (valorUpper.trim()) {
      timerRef.current = setTimeout(async () => {
        try {
          setLoading(true);
          // ✅ Enviar la query en mayúsculas a la BD para que coincida exactamente
          const response = await fetch(`${endpoint}?query=${encodeURIComponent(valorUpper)}`);
          const data = await response.json();
          
          // ✅ Si no hay resultados, inyectamos un objeto "falso" para que FlechasNavigator despliegue el menú
          if (data.length === 0) {
            setResultados([{ id: -1, skuKit: "NO HAY COINCIDENCIAS", _esMensaje: true } as any]);
          } else {
            setResultados(data);
          }
        } catch (error) {
          console.error('Error buscando kits:', error);
          setResultados([]);
        } finally {
          setLoading(false);
        }
      }, 500);
    } else {
      setResultados([]);
      setLoading(false);
    }
  };

  const handleKitSeleccionado = (kit: any) => {
    // ✅ Ignorar la selección si el usuario hace clic o presiona Enter sobre el mensaje de "No hay coincidencias"
    if (kit && kit._esMensaje) {
      return; 
    }

    if (kit) {
      onKitSeleccionado(kit);
      setResultados([]);
      setQuery(kit.skuKit); // Asegurar mayúsculas al seleccionar
      
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
        placeholder="BUSCAR KIT..." // ✅ Placeholder en mayúsculas
        className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none" 
      />
      {loading ? (
        <Loader />
      ) : (
        <FlechasNavigator
          resultados={resultados}
          onSeleccionado={handleKitSeleccionado}
          campos={campos}
        />
      )}
    </div>
  );
};