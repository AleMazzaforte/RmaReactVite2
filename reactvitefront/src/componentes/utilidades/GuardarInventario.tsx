import React from 'react';

interface ProductoConteo {
  id: number;
  sku: string;
  conteoFisico: number | null;
}

interface GuardarInventarioProps {
  productos: {
    id: number;
    conteoFisico: number | null;
    sku: string;
    
  }[];
  onGuardar: (productosGuardados: ProductoConteo[]) => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export const GuardarInventario: React.FC<GuardarInventarioProps> = ({ 
  productos, 
  onGuardar,
  children,
  disabled = false,
  style= {}
}) => {
  const handleClick = () => {
    const productosValidos = productos.filter(p => p.conteoFisico !== null);
    if (productosValidos.length === 0) {
      alert("No hay conteos válidos para guardar");
      return;
    }
    onGuardar(productosValidos);
  };

  const baseStyle: React.CSSProperties = {
    backgroundColor: 'darkGreen', 
    color: 'white',
    padding: '0.5rem 1rem',
    borderRadius: '0.375rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    border: 'none',
    cursor: 'pointer',
    opacity: productos.filter(p => p.conteoFisico !== null).length === 0 ? 0.5 : 1
  };

  return (
    <button 
      onClick={handleClick}
      style={{...baseStyle, ...style}}
      disabled={productos.filter(p => p.conteoFisico !== null).length === 0}
    >
      {children}
    </button>
  );
};