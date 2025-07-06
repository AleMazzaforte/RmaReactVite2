import React, { useState } from "react";

export function Calculator({ onClose }: { onClose: (result: string) => void }) {
  const [display, setDisplay] = useState("0");

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

  return (
    <div>

        
      <div className="bg-gray-100 p-2 mb-2 text-right text-2xl">{display}</div>
      <div className="grid grid-cols-4 gap-2">
        {["7", "8", "9", "/", "4", "5", "6", "X", "1", "2", "3", "-", "0", ".", "=", "+"].map((btn) => (
          <button
            key={btn}
            onClick={() => btn === "=" ? calculateResult() : handleButtonClick(btn)}
            className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            {btn}
          </button>
        ))}
      </div>
      <button
        onClick={() => onClose(display)}
        className="mt-4 bg-green-500 text-white p-2 w-full rounded"
      >
        Ingresar Valor
      </button>
    </div>
  );
}