import React, { useState, useRef, useEffect } from 'react';
import { Calculator } from './Calculator';
import { N } from 'vite/dist/node/moduleRunnerTransport.d-CXw_Ws6P';

interface InputWithLongTouchCalculatorProps {
  value: number | null;
  onChange: (value: number | null) => void;
  onFocus?: () => void;
  cantidadPorBulto: number;
  idProducto: Number; 
}

let urlClientes = 'https://rma-back.vercel.app/buscarCliente';
let urlProductos = 'https://rma-back.vercel.app/listarProductos';
let urlMarcas = 'https://rma-back.vercel.app/listarMarcas';
let urlAgregarRma = 'https://rma-back.vercel.app/agregarRma';
let urlOp = 'https://rma-back.vercel.app/listarOp';
let urlActualizarCantidadPorBulto = 'https://rma-back.vercel.app/actualizarCantidadPorBulto';

if (window.location.hostname === 'localhost') {
  urlClientes = 'http://localhost:8080/buscarCliente';
  urlProductos = 'http://localhost:8080/listarProductos';
  urlMarcas = 'http://localhost:8080/listarMarcas';
  urlAgregarRma = 'http://localhost:8080/agregarRma';
  urlOp = 'http://localhost:8080/listarOp';
  urlActualizarCantidadPorBulto = 'http://localhost:8080/actualizarCantidadPorBulto';
}

export const InputWithCalculator: React.FC<InputWithLongTouchCalculatorProps> = ({ 
  value, 
  onChange,
  onFocus,
  cantidadPorBulto,
  idProducto
}) => {
  const [showCalculator, setShowCalculator] = useState(false);
  const longPressTimer = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const calculatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (calculatorRef.current && !calculatorRef.current.contains(event.target as Node)) {
        setShowCalculator(false);
      }
    };

    if (showCalculator) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showCalculator]);

  const handleTouchStart = () => {
    longPressTimer.current = window.setTimeout(() => {
      setShowCalculator(true);
    }, 800); // 800ms para long press
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleCalculatorClose = (result: string) => {
    const numericValue = result === "" ? null : Number(result);
    onChange(numericValue);
    setShowCalculator(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onChange(value === "" ? null : Number(value));
  };

  const handleUpdateCantidadPorBulto = async (id: number, nuevaCantidad: number) => {
    try {
      const response = await fetch(`${urlActualizarCantidadPorBulto}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idProducto: id,
          nuevaCantidad: nuevaCantidad
        }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar cantidad por bulto');
      }

      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="number"
        min="0"
        value={value ?? ""}
        onChange={handleInputChange}
        onFocus={(e) => {
          e.target.select();
          onFocus?.();
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        className="w-full p-1 rounded text-right border-0 focus:border-0 focus:ring-0 focus:outline-none"
      />

      {showCalculator && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div 
            ref={calculatorRef}
            onClick={(e) => e.stopPropagation()}
            className="bg-gray-400 p-4 rounded-lg w-80"
          >
            <Calculator 
              onClose={handleCalculatorClose}
              initialValue={value?.toString() || ""}
              cantidadPorBulto={cantidadPorBulto}
              idProducto={Number(idProducto)}
              onUpdateCantidadPorBulto={handleUpdateCantidadPorBulto}
            />
          </div>
        </div>
      )}
    </div>
  );
};


;