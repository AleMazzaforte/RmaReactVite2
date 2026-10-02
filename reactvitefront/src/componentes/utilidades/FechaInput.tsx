import { useState, useEffect } from 'react';

interface FechaInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const FechaInput: React.FC<FechaInputProps> = ({ id, value, onChange }) => {

  // Detectamos si la ruta actual contiene 'gestionarRma' 
  // (Ajusta esta cadena si tu ruta en el navegador es diferente, ej: '/rmas')
  const isGestionarRma = location.pathname.includes('gestionarRma');

  // Clases base (sin el borde condicional)
  const baseClasses = "block w-full px-4 py-2 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none";

  // Si es gestionarRma, quitamos el borde (border-0). Si no, lo mantenemos.
  const borderClass = isGestionarRma ? "border-0" : "border border-gray-300";

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'h') {
        const today = new Date();
        const formattedDate = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`; // Formato YYYY-MM-DD

        if (document.activeElement instanceof HTMLInputElement && document.activeElement.id === id) {
          e.preventDefault();
          onChange(formattedDate); // Actualiza el valor del input
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [id, onChange]);

  return (
    <input
      type="date"
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${baseClasses} ${borderClass} `}
    />
  );
};

export default FechaInput;
