import React from 'react';
import { sweetAlert } from './SweetAlertWrapper';


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
  onGuardar: (productosGuardados: ProductoConteo[]) => Promise<void>;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  loading?: boolean;
}

export const GuardarInventario: React.FC<GuardarInventarioProps> = ({ 
  productos, 
  onGuardar,
  children,
  disabled = false,
  style= {},
  
}) => {
  const [isLocalLoading, setIsLocalLoading] = React.useState(false);
  const handleClick = async () => {
    const productosValidos = productos.filter(p => p.conteoFisico !== null);
    if (productosValidos.length === 0 || isLocalLoading) {
      sweetAlert.error(
        'No hay productos para guardar',
        'Por favor, asegúrate de que al menos un producto tenga un conteo físico registrado.'
      );
      return;
    }
    setIsLocalLoading(true);
   try {
      await onGuardar(productosValidos);
    } catch (error) {
      console.error("Error al guardar:", error);
    } finally {
      setIsLocalLoading(false);
    }
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