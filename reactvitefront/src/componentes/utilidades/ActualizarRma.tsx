import React from 'react';
import Swal from 'sweetalert2';
import { Rma } from '../../componentes/ProductosPorCliente';
import { ConvertirFecha } from './ConvertirFecha';

let urlRma = 'https://rmareactvite2.onrender.com/actualizarProductoRma';

if (window.location.hostname === 'localhost') {
  urlRma = 'http://localhost:8080/actualizarProductoRma';
}

interface ActualizarRmaProps {
  rma: Rma;
  handleActualizar: (rma: Rma) => void;
}
//console.log('Rma', rma)

export const ActualizarRma: React.FC<ActualizarRmaProps> = ({ rma, handleActualizar }) => {
  const actualizarRma = async (rma: Rma) => { 
    const rmaConvertido = {
        ...rma,
        solicita: ConvertirFecha(rma.solicita),
        vencimiento: ConvertirFecha(rma.vencimiento),
        seEntrega: ConvertirFecha(rma.seEntrega),
        seRecibe: ConvertirFecha(rma.seRecibe)
    }
    console.log('rmaconvertido', rmaConvertido)
    try {
      // Llamada a la API para actualizar el RMA
      const response = await fetch(`${urlRma}/${rma.idRma}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rmaConvertido),
    
      });
      const result = await response.json();

      if (result.success) {
        Swal.fire('Éxito', 'Producto actualizado correctamente', 'success');
        handleActualizar(rma);
      } else {
        Swal.fire('Error', result.message, 'error');
      }
    } catch (error) {
      Swal.fire('Error', 'Error al actualizar producto', 'error');
    }
  };

  return (
    <button
      className="bg-yellow-500 text-white px-2 text-sm rounded"
      onClick={() => actualizarRma(rma)}
    >
      Actualizar
    </button>
  );
};
