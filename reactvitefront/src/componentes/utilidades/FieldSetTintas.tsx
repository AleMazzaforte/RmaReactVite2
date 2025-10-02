import React from 'react';

export interface FieldSetTintasProps {
    legend: string;
    comboId?: string;
    inputRefs?: React.RefObject<Record<string, HTMLInputElement | null>>;
    inputs: {
      label: string;
      id: string;
      name: string;
    }[];
    onChange?: () => void;
    disableCombo?: boolean; 
  }
  
 export const FieldSetTintas: React.FC<FieldSetTintasProps> = ({ 
  legend, 
  comboId, 
  inputRefs, 
  onChange,
  inputs,
  disableCombo = false // Valor por defecto false
}) => {
  return (
    <fieldset className="grid grid-cols-2 gap-4 border rounded-2xl p-9 bg-blue-50" style={{ border: "black 1px solid", background: "#eff6ff" }}>
      <legend className="text-lg font-semibold text-gray-700 mb-4">{legend}</legend>

      {comboId && (
        <div className="col-span-2 flex flex-col" >
          <label htmlFor={comboId} className="mb-1">Combos</label>
          <input
          style={{ border: "black 1px solid" }}
            type="number"
            name={comboId}
            id={comboId}
            disabled={disableCombo} // Aquí aplicamos la prop
            className={`w-40 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none hover:outline-1 ${
              disableCombo ? 'bg-gray-100' : 'bg-white'
            }`}
            ref={(el) => {
                if (inputRefs && inputRefs.current) {
                  inputRefs.current[comboId || ''] = el;
                }
              }}
              onChange={onChange}
          />
        </div>
      )}

      {inputs.map((input) => (
        <div key={input.id} className="flex flex-col">
          <label htmlFor={input.id} className="mb-1">{input.label}</label>
          <input
          style={{ border: "black 1px solid" }}
            type="number"
            name={input.name}
            id={input.id}
            className="w-40 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none hover:outline-1 bg-white"
            ref={(el) => {
              if (inputRefs && inputRefs.current) {
                inputRefs.current[input.id] = el;
              }
            }}
            onChange={onChange}
          />
        </div>
      ))}
    </fieldset>
  );
};