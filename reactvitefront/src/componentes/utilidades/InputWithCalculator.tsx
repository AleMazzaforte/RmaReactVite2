import React, { useState, useRef, useEffect } from 'react';

interface InputWithLongTouchCalculatorProps {
  value: number | null;
  onChange: (value: number | null) => void;
  onFocus?: () => void;
}

export const InputWithCalculator: React.FC<InputWithLongTouchCalculatorProps> = ({ 
  value, 
  onChange,
  onFocus
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
          className="bg-gray-400 p-4 rounded-lg w-80">
            <Calculator 
            onClose={handleCalculatorClose}
             initialValue={value?.toString() || ""}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const Calculator = ({ 
  onClose, 
  initialValue 
}: { 
  onClose: (result: string) => void; 
  initialValue: string;
}) => {
  const [display, setDisplay] = useState(initialValue);

  const handleButtonClick = (value: string) => {
    setDisplay(prev => prev === "0" ? value : prev + value);
  };

  const calculateResult = () => {
    try {
      const result = eval(display).toString();
      setDisplay(result);
    } catch {
      setDisplay("Error");
    }
  };

  const clearDisplay = () => {
    setDisplay("0");
  };

  return (
    <div>
      <div className="bg-gray-100 p-4 mb-4 text-right text-3xl font-mono rounded">
        {display}
      </div>
      <div className="grid grid-cols-4 gap-2">
  {["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "=", "+", "(", ")"].map((btn) => (
    <button
      key={btn}
      onClick={() => btn === "=" ? calculateResult() : handleButtonClick(btn)}
      className={`p-3 rounded text-lg ${
        btn === "=" ? "bg-green-500" : "bg-blue-500"
      } text-white hover:opacity-80`}
    >
      {btn === "*" ? "×" : btn} {/* Mostrar "×" en lugar de "*" */}
    </button>
  ))}
  <button
    onClick={clearDisplay}
    className="col-span-2 bg-red-500 text-white p-3 rounded hover:opacity-80"
  >
    C
  </button>
  <button
    onClick={() => onClose(display)}
    className="col-span-4 bg-green-600 text-white p-3 rounded hover:opacity-80"
  >
    Ingresar
  </button>
</div>
    </div>
  );
};