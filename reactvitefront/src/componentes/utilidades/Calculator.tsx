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
  <div 
    style={{ 
      backgroundColor: 'rgb(138, 139, 141)',
      padding: '20px',
      transform: 'scale(1.2)'
    }}
  >
    {/* Display principal */}
    <div 
      style={{
        backgroundColor: '#f3f4f6',
        padding: '0.25rem 0.5rem 0.25rem 0.25rem',
        marginBottom: '0.5rem',
        marginTop: '0.5rem',
        textAlign: 'right',
        fontSize: '1.875rem',
        fontFamily: 'monospace',
        borderRadius: '0.375rem',
        border: '1px solid rgb(138, 139, 141)',
        cursor: 'pointer',
        ...(activeInput === 'display' && {
          boxShadow: '0 0 0 2px #3b82f6'
        })
      }}
      onClick={() => handleInputClick('display')}
    >
      {display}
    </div>
    
    {/* Inputs de bultos y unidades */}
    <div style={{
      marginBottom: '1rem',
      display: 'flex',
      justifyContent: 'space-between',
      gap: '0.5rem'
    }}>
      <div style={{flex: 1}}>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '500',
          color: '#374151',
          border: '1px solid rgb(138, 139, 141)'
        }}>Bultos</label>
        <div 
          style={{
            width: '100%',
            padding: '0.25rem 0.5rem 0.25rem 0.25rem',
            backgroundColor: '#f3f4f6',
            borderRadius: '0.375rem',
            border: '1px solid rgb(138, 139, 141)',
            textAlign: 'right',
            cursor: 'pointer',
            ...(activeInput === 'bultos' && {
              boxShadow: '0 0 0 2px #3b82f6'
            })
          }}
          onClick={() => handleInputClick('bultos')}
        >
          {bultos}
        </div>
      </div>
      <div style={{flex: 1}}>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '500',
          color: '#374151'
        }}>Unid. x Bulto</label>
        <div 
          style={{
            width: '100%',
            padding: '0.25rem 0.5rem 0.25rem 0.25rem',
            backgroundColor: '#f3f4f6',
            borderRadius: '0.375rem',
            border: '1px solid rgb(138, 139, 141)',
            textAlign: 'right',
            
            ...(activeInput === 'unidades' && {
              boxShadow: '0 0 0 2px #3b82f6'
            })
          }}
          onClick={() => handleInputClick('unidades')}
        >
          {isNaN(parseFloat(unidadesPorBulto)) ? "0" : unidadesPorBulto}
        </div>
      </div>
    </div>

    {/* Teclado de la calculadora */}
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '0.5rem'
    }}>
      {["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "=", "+", "(", ")"].map((btn) => (
        <button
          key={btn}
          onClick={() => btn === "=" ? calculateResult() : handleButtonClick(btn)}
          style={{
            padding: '0.75rem',
            borderRadius: '0.375rem',
            fontSize: '1.125rem',
            color: 'white',
            backgroundColor: btn === "=" ? '#22c55e' : '#3b82f6',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          {btn === "*" ? "×" : btn}
        </button>
      ))}
      <button
        onClick={clearActiveInput}
        style={{
          gridColumn: 'span 2',
          backgroundColor: '#ef4444',
          color: 'white',
          padding: '0.75rem',
          borderRadius: '0.375rem',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        C
      </button>
      <button
        onClick={handleSubmit}
        style={{
          gridColumn: 'span 4',
          backgroundColor: '#16a34a',
          color: 'white',
          padding: '0.75rem',
          borderRadius: '0.375rem',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        Ingresar
      </button>
    </div>
  </div>
);
};

