import React, { useState, useRef, ChangeEvent } from 'react';
import { FlechasNavigator } from './FlechasNavigator';
import Loader from './Loader';

interface ListarProductosProps {
  endpoint: string;
  onProductoSeleccionado: (producto: any) => void;
  campos: string[];
  inputRef?: React.RefObject<HTMLInputElement>; // Agregar inputRef a las props
  limpiarQuery?: () => void; // Prop para la función de limpiar query
}

export const ListarProductos: React.FC<ListarProductosProps> = ({ endpoint, onProductoSeleccionado, campos, inputRef, limpiarQuery }) => {
  const [query, setQuery] = useState<string>('');
  const [resultados, setResultados] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Utilizar la ref pasada a través de props o crear una nueva si no se pasa ninguna
  const localInputRef = inputRef || useRef<HTMLInputElement>(null);

  const handleInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (value) {
      if (timer) clearTimeout(timer);  // Limpiar cualquier temporizador previo
      const newTimer = setTimeout(() => setLoading(true), 300); // Iniciar el temporizador para mostrar loader después de 3 segundos
      setTimer(newTimer);

      try {
        const response = await fetch(`${endpoint}?query=${value}`);
        const data = await response.json();
        setResultados(data.filter((producto: any) => producto.sku.toLowerCase().includes(value.toLowerCase())));
      } catch (error) {
        console.error('Error buscando productos:', error);
      } finally {
        if (newTimer) clearTimeout(newTimer);  // Limpiar el temporizador si el fetch finaliza antes de los 3 segundos
        setLoading(false);
      }
    } else {
      setResultados([]);
      setLoading(false);
    }
  };

  const handleProductoSeleccionado = (producto: any) => {
    if (producto) {
      onProductoSeleccionado(producto);
      setResultados([]);
      setQuery(producto.sku);  // Mostrar el SKU seleccionado en el input
      if (localInputRef.current && localInputRef.current.nextElementSibling) {
        (localInputRef.current.nextElementSibling as HTMLElement).focus();  // Saltar al siguiente campo
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
        placeholder="Buscar SKU"
        className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
      />
      {loading ? <Loader /> : (
        <FlechasNavigator
          resultados={resultados}
          onSeleccionado={handleProductoSeleccionado}
          campos={campos}
        />
      )}
    </div>
  );
};
