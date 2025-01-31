// convertirFecha.tsx

export const ConvertirFecha = (fecha: string): string | null => {
    if (!fecha || fecha.trim() === '') {
      return null;
    }
  
    const [dia, mes, anio] = fecha.split('/');
    return `${anio}-${mes}-${dia}`;
  };
  