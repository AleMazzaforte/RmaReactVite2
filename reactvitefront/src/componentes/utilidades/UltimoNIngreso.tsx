import { useState, useEffect } from "react";

interface UltimoNIngresoProps {
  onNIngresoUpdate: (nuevoNIngreso: number) => void;
}

const UltimoNIngreso = ({ onNIngresoUpdate }: UltimoNIngresoProps) => {
  const [ultimoNIngreso, setUltimoNIngreso] = useState<number>(0);

  useEffect(() => {
    const obtenerUltimoNIngreso = async () => {
        let url = 'https://rmareactvite2.onrender.com/getUltimoNIngreso';
        if (window.location.hostname == 'localhost') {
            url= 'http://localhost:8080/getUltimoNIngreso'
        }


      try {
        const response = await fetch(`${url}`);
        const data = await response.json();

        console.log('data', data)

        if (data.length != 0) {
          setUltimoNIngreso(data.nIngreso);
          onNIngresoUpdate(data.nIngreso); // Actualiza el estado en el componente padre
        } else {
          setUltimoNIngreso(0);
          onNIngresoUpdate(0);
        }
      } catch (error) {
        console.error("Error al obtener el último nIngreso:", error);
      }
    };

    obtenerUltimoNIngreso();
  }, []); // Se ejecuta solo al montar el componente

  return null; // No renderiza nada, solo ejecuta la lógica
};

export default UltimoNIngreso;
