import React from 'react';
import { InputWithCalculator } from './InputWithCalculator';

export interface FieldSetTintasProps {
    legend: string;
    comboId?: string;
    valores: Record<string, number>;
    onValorChange: (id: string, value: number) => void;
    inputs: {
      label: string;
      id: string;
      name: string;
      sku?: string;
    }[];
    disableCombo?: boolean; 
    productosReposicion?: {sku: string; cantidad: number}[];
    onUpdateReposicion?: (sku: string, cantidad: number) => void;
}

export const FieldSetTintas: React.FC<FieldSetTintasProps> = ({ 
  legend, 
  comboId, 
  valores,
  onValorChange,
  inputs,
  disableCombo = false,
  productosReposicion = [],
  onUpdateReposicion = () => {}
}) => {
  const fieldsetStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem',
    border: '1px solid black',
    borderRadius: '1rem',
    padding: '2.25rem',
    backgroundColor: '#eff6ff',
    marginBottom: '2rem',
  };

  const legendStyle: React.CSSProperties = {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '1rem',
    paddingLeft: '0.5rem',
  };

  const labelStyle: React.CSSProperties = {
    marginBottom: '0.25rem',
    fontSize: '1rem',
    color: '#1f2937',
  };

  const inputBaseStyle: React.CSSProperties = {
    width: '10rem',
    padding: '0.5rem 1rem',
    border: '1px solid black',
    borderRadius: '0.5rem',
    backgroundColor: 'white',
    fontSize: '1rem',
    textAlign: 'right',
  };

  const inputDisabledStyle: React.CSSProperties = {
    ...inputBaseStyle,
    backgroundColor: '#f3f4f6',
    cursor: 'not-allowed',
  };

  return (
    <fieldset style={fieldsetStyle}>
      <legend style={legendStyle}>{legend}</legend>

      {comboId && (
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column' }}>
          <label htmlFor={comboId} style={labelStyle}>Combos</label>
          <InputWithCalculator
            value={valores[comboId] || 0}
            onChange={(value) => onValorChange(comboId, Number(value) || 0)}
            cantidadPorBulto={1}
            idProducto={0}
            productosReposicion={productosReposicion}
            sku=""
            onUpdateReposicion={onUpdateReposicion}
            disabled={disableCombo}
            style={disableCombo ? inputDisabledStyle : inputBaseStyle}
            className="tablet-large-text"
          />
        </div>
      )}

      {inputs.map((input) => (
        <div key={input.id} style={{ display: 'flex', flexDirection: 'column' }}>
          <label htmlFor={input.id} style={labelStyle}>{input.label}</label>
          <InputWithCalculator
            value={valores[input.id] || 0}
            onChange={(value) => onValorChange(input.id, Number(value) || 0)}
            cantidadPorBulto={1}
            idProducto={0}
            productosReposicion={productosReposicion}
            sku={input.sku || ""}
            onUpdateReposicion={onUpdateReposicion}
            style={inputBaseStyle}
            className="tablet-large-text"
          />
        </div>
      ))}
    </fieldset>
  );
};