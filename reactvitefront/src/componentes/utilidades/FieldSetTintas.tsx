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
  }
  
  export const FieldSetTintas: React.FC<FieldSetTintasProps> = ({ legend, comboId, inputRefs, inputs }) => {
    return (
      <fieldset className="grid grid-cols-2 gap-4 border rounded-2xl p-9 bg-blue-50">
        <legend className="text-lg font-semibold text-gray-700 mb-4">{legend}</legend>
  
        <div className="col-span-2 flex flex-col">
          <label htmlFor={comboId} className="mb-1">Combos</label>
          <input
            type="number"
            name={comboId}
            id={comboId}
            className="w-40 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none hover:outline-1 bg-white"
            ref={(el) => {
                if (inputRefs && inputRefs.current) {
                  inputRefs.current[comboId || ''] = el;
                }
              }}
          />
        </div>
  
        {inputs.map((input) => (
          <div key={input.id} className="flex flex-col">
            <label htmlFor={input.id} className="mb-1">{input.label}</label>
            <input
              type="number"
              name={input.name}
              id={input.id}
              className="w-40 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none hover:outline-1 bg-white"
              ref={(el) => {
                if (inputRefs && inputRefs.current) {
                  inputRefs.current[input.id] = el;
                }
              }}
            />
          </div>
        ))}
      </fieldset>
    );
  };
  