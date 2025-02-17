import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import { FlechasNavigator } from './FlechasNavigator';
import Loader from './Loader';

interface BusquedaClientesProps {
  endpoint: string;
  onClienteSeleccionado: (cliente: any) => void;
  campos: string[];
  value?: string; // Nueva prop para sincronizar el valor del input
  inputRef?: React.RefObject<HTMLInputElement>; // Agregar inputRef a las props
}

export const BusquedaClientes: React.FC<BusquedaClientesProps> = ({
  endpoint,
  onClienteSeleccionado,
  campos,
  value = '', // Valor por defecto vacío
  inputRef,
}) => {
  const [query, setQuery] = useState<string>(value); // Inicializar con el valor de la prop
  const [resultados, setResultados] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const timerRef = useRef<number | null>(null);

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
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Si hay valor en el input, proceder con el retraso
    if (value) {
      setLoading(true);

      // Establecer un nuevo timeout para la búsqueda
      timerRef.current = window.setTimeout(async () => {
        try {
          const response = await fetch(`${endpoint}?query=${value}`);
          const data = await response.json();
          setResultados(data.filter((cliente: any) => cliente.nombre.toLowerCase().includes(value.toLowerCase())));
        } catch (error) {
          console.error('Error buscando clientes:', error);
        } finally {
          setLoading(false);
        }
      }, 500); // 500 ms de retraso
    } else {
      setResultados([]);
      setLoading(false);
    }
  };

  const handleClienteSeleccionado = (cliente: any) => {
    if (cliente) {
      onClienteSeleccionado(cliente);
      setResultados([]);
      setQuery(cliente.nombre); // Mostrar el nombre del cliente seleccionado en el input
      if (localInputRef.current && localInputRef.current.nextElementSibling) {
        (localInputRef.current.nextElementSibling as HTMLElement).focus(); // Saltar al siguiente campo
      }
    }
  };

  return (
    <div>
      <input
        type="text"
        ref={localInputRef} // Usar la ref apropiada
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