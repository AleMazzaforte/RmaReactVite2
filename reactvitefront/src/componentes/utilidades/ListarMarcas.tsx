import React, { useState, useRef } from 'react';
import { FlechasNavigator } from './FlechasNavigator';
import Loader from './Loader';

export const ListarMarcas = ({ endpoint, onMarcaSeleccionada, campos }) => {
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(null);
  const inputRef = useRef(null); // Referencia al input

  const handleInputChange = async (e) => {
    const value = e.target.value;
    setQuery(value);

    if (value) {
      if (timer) clearTimeout(timer); // Limpiar cualquier temporizador previo
      const newTimer = setTimeout(() => setLoading(true), 3000); // Iniciar el temporizador para mostrar loader después de 3 segundos
      setTimer(newTimer);

      try {
        const response = await fetch(`${endpoint}?query=${value}`);
        const data = await response.json();
        setResultados(data.filter(marca => marca.nombre.toLowerCase().includes(value.toLowerCase())));
      } catch (error) {
        console.error('Error buscando marcas:', error);
      } finally {
        clearTimeout(newTimer); // Limpiar el temporizador si el fetch finaliza antes de los 3 segundos
        setLoading(false);
      }
    } else {
      setResultados([]);
      setLoading(false);
    }
  };

  const handleMarcaSeleccionada = (marca) => {
    if (marca) {
      onMarcaSeleccionada(marca);
      setResultados([]);
      setQuery(marca.nombre); // Mostrar la marca seleccionada en el input
      inputRef.current.nextElementSibling?.focus(); // Saltar al siguiente campo
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
          onClienteSeleccionado={handleMarcaSeleccionada}
          campos={campos}
        />
      )}
    </div>
  );
};
