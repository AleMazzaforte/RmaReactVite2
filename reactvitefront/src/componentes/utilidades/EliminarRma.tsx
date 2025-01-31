import React from 'react';
import Swal from 'sweetalert2';

interface EliminarRmaProps {
  idRma: string | undefined;
  handleEliminar: (id: string | undefined) => void;
}

export const EliminarRma: React.FC<EliminarRmaProps> = ({ idRma, handleEliminar }) => {
  const eliminarRma = async () => {
    let urlRma = 'https://rmareactvite2.onrender.com/eliminarRma';
    if (window.location.hostname === 'localhost') {
      urlRma = 'http://localhost:8080/eliminarRma';
    }

    try {
      const response = await fetch(`${urlRma}/${idRma}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        Swal.fire('Éxito', 'RMA eliminado correctamente', 'success');
        handleEliminar(idRma);
      } else {
        Swal.fire('Error', result.message, 'error');
      }
    } catch (error) {
      Swal.fire('Error', 'Error al eliminar RMA', 'error');
    }
  };

  return (
    <button
      className="bg-red-500 text-white px-2 text-sm rounded"
      onClick={eliminarRma}
    >
      Eliminar
    </button>
  );
};
