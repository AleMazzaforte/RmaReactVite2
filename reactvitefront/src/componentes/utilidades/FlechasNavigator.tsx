import React, { useState, useEffect, useRef } from 'react';

interface FlechasNavigatorProps {
  resultados: Array<{ nombre: string, [key: string]: any }>;
  onSeleccionado: (cliente: any) => void;
  campos: string[];
  useUniqueKey?: boolean;  // Nuevo parámetro para decidir si usar clave única
}

export const FlechasNavigator: React.FC<FlechasNavigatorProps> = ({ 
  resultados, 
  onSeleccionado, 
  campos, 
  useUniqueKey = false 
}) => {
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

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [resultados, selectedIndex, onSeleccionado]);

  return (
    <div>
      {resultados.length > 0 && (
        <div ref={resultadosRef} className="mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {resultados.map((item, index) => (
            <div
              key={useUniqueKey ? `${item.nombre}-${index}` : item.id ?? `item-${index}`}
              onClick={() => onSeleccionado(item)}
              className={`px-4 py-2 hover:bg-gray-200 cursor-pointer ${selectedIndex === index ? 'bg-gray-200' : ''}`}
            >
              {campos.map((campo) => (
                <div key={`${campo}-${index}`}>{item[campo]}</div>
              ))}
            </div>
          ))}

        </div>
      )}
    </div>
  );
};
