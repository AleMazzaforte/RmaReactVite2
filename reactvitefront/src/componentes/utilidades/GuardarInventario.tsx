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
}

export const GuardarInventario: React.FC<GuardarInventarioProps> = ({ 
  productos, 
  onGuardar,
  children,
  disabled = false,
  className = "bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center flex-1"
}) => {
  const handleClick = () => {
    const productosValidos = productos.filter(p => p.conteoFisico !== null);
    if (productosValidos.length === 0) {
      alert("No hay conteos válidos para guardar");
      return;
    }
    onGuardar(productosValidos);
  };

  return (
    <button 
      onClick={handleClick}
      className={className}
      disabled={productos.filter(p => p.conteoFisico !== null).length === 0}
    >
      {children}
    </button>
  );
};