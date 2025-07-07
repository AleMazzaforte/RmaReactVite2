import React, { useState, useRef, useEffect } from 'react';

// Componente Calculator externo
interface CalculatorProps {
  onClose: (result: string) => void;
  initialValue: string;
  cantidadPorBulto: number;
  idProducto: number; 
  onUpdateCantidadPorBulto?: (idProducto: number, nuevaCantidad: number) => Promise<void>;
}

export const Calculator: React.FC<CalculatorProps> = ({ 
  onClose, 
  initialValue,
  cantidadPorBulto,
  idProducto,
  onUpdateCantidadPorBulto
}) => {
  const [display, setDisplay] = useState(initialValue);
  const [bultos, setBultos] = useState("0");
  const [unidadesPorBulto, setUnidadesPorBulto] = useState(cantidadPorBulto.toString());
  const [activeInput, setActiveInput] = useState<'display' | 'bultos' | 'unidades'>('display');

   useEffect(() => {
    setUnidadesPorBulto(cantidadPorBulto.toString());
  }, [cantidadPorBulto]);

  const handleUnidadesPorBultoChange = async (value: string) => {
  // Eliminar caracteres no numéricos excepto punto decimal
  const cleanedValue = value.replace(/[^0-9.]/g, '');
  
  // Verificar si es un número válido
  const nuevaCantidad = parseFloat(cleanedValue);
  if (!isNaN(nuevaCantidad) && nuevaCantidad >= 0) {
    setUnidadesPorBulto(cleanedValue);
    
    if (nuevaCantidad !== cantidadPorBulto && onUpdateCantidadPorBulto) {
      try {
        await onUpdateCantidadPorBulto(idProducto, nuevaCantidad);
      } catch (error) {
        console.error("Error al actualizar cantidad por bulto:", error);
        setUnidadesPorBulto(cantidadPorBulto.toString());
      }
    }
  }
};

  const handleButtonClick = (value: string) => {
    const updateValue = (current: string) => current === "0" ? value : current + value;
    
    if (activeInput === 'display') {
      setDisplay(updateValue);
    } else if (activeInput === 'bultos') {
      setBultos(updateValue);
    } else {
      setUnidadesPorBulto(updateValue);
    }
  };

  const calculateResult = () => {
  try {
    const safeEval = (exp: string): string => {
      try {
        const result = eval(exp);
        return isNaN(result) ? "0" : result.toString();
      } catch {
        return "Error";
      }
    };

    const result = activeInput === 'display' ? safeEval(display) : 
                   activeInput === 'bultos' ? safeEval(bultos) : 
                   safeEval(unidadesPorBulto);

    if (activeInput === 'display') {
      setDisplay(result);
    } else if (activeInput === 'bultos') {
      setBultos(result);
    } else {
      setUnidadesPorBulto(result);
    }
  } catch {
    const errorValue = "0"; // Usar "0" en lugar de "Error"
    if (activeInput === 'display') {
      setDisplay(errorValue);
    } else if (activeInput === 'bultos') {
      setBultos(errorValue);
    } else {
      setUnidadesPorBulto(errorValue);
    }
  }
};
  const clearActiveInput = () => {
    if (activeInput === 'display') {
      setDisplay("0");
    } else if (activeInput === 'bultos') {
      setBultos("0");
    } else {
      setUnidadesPorBulto("0");
    }
  };

  const handleSubmit = () => {
  try {
    // Función segura para evaluar expresiones
    const safeEval = (exp: string): number => {
      try {
        const result = eval(exp);
        return isNaN(result) ? 0 : Number(result);
      } catch {
        return 0;
      }
    };

    const unidadesSueltas = display === "Error" ? 0 : safeEval(display);
    
    // Conversión segura a número
    const parsedBultos = parseFloat(bultos) || 0;
    const parsedUnidades = parseFloat(unidadesPorBulto) || 0;
    
    const unidadesEnBultos = parsedBultos * parsedUnidades;
    const total = unidadesSueltas + unidadesEnBultos;
    
    onClose(total.toString());
  } catch {
    onClose("0"); // Enviar "0" en lugar de "Error" para evitar NaN
  }
};

  const handleInputClick = (inputType: 'display' | 'bultos' | 'unidades') => {
    setActiveInput(inputType);
  };

  return (
    <div>
      {/* Display principal */}
      <div 
        className={`bg-gray-100 p-1 pr-2 mb-2 mt-2 text-right text-3xl font-mono rounded cursor-pointer ${activeInput === 'display' ? 'ring-2 ring-blue-500' : ''}`}
        onClick={() => handleInputClick('display')}
      >
        {display}
      </div>
      
      {/* Inputs de bultos y unidades */}
      <div className="mb-4 flex justify-between space-x-2">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Bultos</label>
          <div 
            className={`w-full p-1 pl-2 bg-gray-100 rounded border border-gray-300 text-right cursor-pointer ${activeInput === 'bultos' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => handleInputClick('bultos')}
          >
            {bultos}
          </div>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Unid. x Bulto</label>
<div 
  className={`w-full p-1 pl-2 bg-gray-100 rounded border border-gray-300 text-right cursor-pointer ${activeInput === 'unidades' ? 'ring-2 ring-blue-500' : ''}`}
  onClick={() => handleInputClick('unidades')}
>
  {isNaN(parseFloat(unidadesPorBulto)) ? "0" : unidadesPorBulto}
</div>
        </div>
      </div>

      {/* Teclado de la calculadora */}
      <div className="grid grid-cols-4 gap-2">
        {["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "=", "+", "(", ")"].map((btn) => (
          <button
            key={btn}
            onClick={() => btn === "=" ? calculateResult() : handleButtonClick(btn)}
            className={`p-3 rounded text-lg ${
              btn === "=" ? "bg-green-500" : "bg-blue-500"
            } text-white hover:opacity-80`}
          >
            {btn === "*" ? "×" : btn}
          </button>
        ))}
        <button
          onClick={clearActiveInput}
          className="col-span-2 bg-red-500 text-white p-3 rounded hover:opacity-80"
        >
          C
        </button>
        <button
          onClick={handleSubmit}
          className="col-span-4 bg-green-600 text-white p-3 rounded hover:opacity-80"
        >
          Ingresar
        </button>
      </div>
    </div>
  );
};

