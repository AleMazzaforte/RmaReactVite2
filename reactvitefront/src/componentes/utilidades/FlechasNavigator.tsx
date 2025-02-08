import React, { useState, useEffect, useRef } from 'react';

interface FlechasNavigatorProps {
  resultados: Array<{ id: string, [key: string]: any }>;
  onSeleccionado: (cliente: any) => void;
  campos: string[];
}



export const FlechasNavigator: React.FC<FlechasNavigatorProps> = ({ resultados, onSeleccionado, campos }) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const resultadosRef = useRef<HTMLDivElement>(null);

  

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prevIndex) => {
          const newIndex = prevIndex < resultados.length - 1 ? prevIndex + 1 : prevIndex;
          scrollToItem(newIndex);
          return newIndex;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prevIndex) => {
          const newIndex = prevIndex > 0 ? prevIndex - 1 : prevIndex;
          scrollToItem(newIndex);
          return newIndex;
        });
      } else if (e.key === 'Enter' && selectedIndex >= 0 && resultados[selectedIndex]) {
        e.preventDefault();
        onSeleccionado(resultados[selectedIndex]);
      }
    };

    const scrollToItem = (index: number) => {
      if (resultadosRef.current && resultadosRef.current.children[index]) {
        (resultadosRef.current.children[index] as HTMLDivElement).scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    };

    // Añadir el evento del teclado al montar el componente
    window.addEventListener('keydown', handleKeyDown);

    // Eliminar el evento del teclado al desmontar el componente
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [resultados, selectedIndex, onSeleccionado]);

  return (
    <div>
      {resultados.length > 0 && (
        <div ref={resultadosRef} className="mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {resultados.map((cliente, index) => (
            <div
              key={cliente.id}
              onClick={() => onSeleccionado(cliente)}
              className={`px-4 py-2 hover:bg-gray-200 cursor-pointer ${selectedIndex === index ? 'bg-gray-200' : ''}`}
            >
              {campos.map((campo) => (
                <div key={campo}>{cliente[campo]}</div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
