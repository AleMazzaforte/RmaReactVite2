// FlechasNavigator.tsx

import { useState, useEffect, useRef } from 'react';

interface FlechasNavigatorProps<T> {
  resultados: T[];
  onSeleccionado: (item: T) => void; // ← Ahora es genérico
  campos: string[];
  useUniqueKey?: boolean;
}

export const FlechasNavigator = <T extends { nombre: string }>({
  resultados,
  onSeleccionado,
  campos,
  useUniqueKey = false,
}: FlechasNavigatorProps<T>) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const resultadosRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resultados.length > 0) {
      setSelectedIndex(0);
    } else {
      setSelectedIndex(-1);
    }
  }, [resultados]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (resultados.length === 0) return;

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
          const newIndex = prevIndex > 0 ? prevIndex - 1 : 0;
          scrollToItem(newIndex);
          return newIndex;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0 && resultados[selectedIndex]) {
          onSeleccionado(resultados[selectedIndex]); // ← Ahora TypeScript sabe que es del tipo T
        }
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

  if (resultados.length === 0) return null;

  return (
    <div>
      <div ref={resultadosRef} className="mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
        {resultados.map((item, index) => (
          <div
            key={useUniqueKey ? `${item.nombre}-${index}` : (item as any).id ?? `item-${index}`}
            onClick={() => onSeleccionado(item)} // ← item es de tipo T
            className={`px-4 py-2 hover:bg-gray-200 cursor-pointer ${selectedIndex === index ? 'bg-gray-200' : ''}`}
            role="option"
            aria-selected={selectedIndex === index}
          >
            {campos.map((campo) => (
              <div key={`${campo}-${index}`}>
                {String(item[campo as keyof T])} {/* ← Acceso seguro al campo */}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};