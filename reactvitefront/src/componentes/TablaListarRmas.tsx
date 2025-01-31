import React, { useState, useEffect } from 'react';
import { ActualizarRma } from './utilidades/ActualizarRma';
import { EliminarRma } from './utilidades/EliminarRma'; // Importa EliminarRma
import { Rma } from './ProductosPorCliente'; // Importa Rma
import { ConvertirFecha } from './utilidades/ConvertirFecha'; // Importa la función para convertir fechas
import Swal from 'sweetalert2'; // Importa SweetAlert2

interface TablaRmasProps {
  rmas: Rma[];
  handleActualizar: (rma: Rma) => void;
  handleEliminar: (id: string | undefined) => void;
}

export const TablaListarRmas: React.FC<TablaRmasProps> = ({ rmas, handleActualizar, handleEliminar }) => {
  const [editedRmas, setEditedRmas] = useState<Rma[]>(rmas);

  useEffect(() => {
    console.log('Datos de RMAs recibidos:', rmas);
  }, [rmas]); // Esto se ejecutará cuando 'rmas' cambie

  const handleInputChange = (index: number, field: keyof Rma, value: string) => {
    const updatedRmas = [...editedRmas];
    updatedRmas[index] = { ...updatedRmas[index], [field]: value };
    setEditedRmas(updatedRmas);
  };

  const handleActualizarWrapper = (index: number) => {
    handleActualizar(editedRmas[index]);
  };

  // Función para manejar la eliminación con confirmación
  const handleEliminarWrapper = (id: string | undefined) => {
    Swal.fire({
      title: '¿Estás seguro?',
      text: '¡Este RMA será eliminado!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        // Si el usuario confirma, elimina el RMA
        setEditedRmas(editedRmas.filter((rma) => rma.idRma !== id));
        handleEliminar(id); // Llama al manejador para eliminar del backend
        Swal.fire('Eliminado', 'El RMA ha sido eliminado.', 'success');
      }
    });
  };

  return (
    <div>
      <table className="w-full m-4 table-auto">
        <thead className="bg-gradient-to-b from-blue-400 to-green-400 text-white">
          <tr>
            <th className="px-4 py-2">Modelo</th>
            <th className="px-4 py-2">Cantidad</th>
            <th className="px-4 py-2">Marca</th>
            <th className="px-4 py-2">Solicita</th>
            <th className="px-4 py-2">OP/Lote</th>
            <th className="px-4 py-2">Vencimiento</th>
            <th className="px-4 py-2">Se Entrega</th>
            <th className="px-4 py-2">Se Recibe</th>
            <th className="px-4 py-2">Observaciones</th>
            <th className="px-4 py-2">N° de Ingreso</th>
            <th className="px-4 py-2">N° de Egreso</th>
            <th className="px-4 py-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {editedRmas.length > 0 ? (
            editedRmas.map((rma, index) => (
              <tr key={index}>
                <td className="border text-sm text-center">
                  <input
                    type="text"
                    value={rma.modelo}
                    onChange={(e) => handleInputChange(index, 'modelo', e.target.value)}
                    className="block w-full text-sm rounded-lg text-center"
                  />
                </td>
                <td className="border text-sm text-center">
                  <input
                    type="number"
                    value={rma.cantidad.toString()}
                    onChange={(e) => handleInputChange(index, 'cantidad', e.target.value)}
                    className="block w-full text-sm rounded-lg text-center"
                  />
                </td>
                <td className="border text-sm text-center">
                  <input
                    type="text"
                    value={rma.marca}
                    onChange={(e) => handleInputChange(index, 'marca', e.target.value)}
                    className="block w-full text-sm rounded-lg text-center"
                  />
                </td>
                <td className="border text-sm text-center">
                  <input
                    type="text"
                    value={rma.solicita}
                    onChange={(e) => handleInputChange(index, 'solicita', e.target.value)}
                    className="block w-full text-sm rounded-lg text-center"
                  />
                </td>
                <td className="border text-sm text-center">
                  <input
                    type="text"
                    value={rma.opLote}
                    onChange={(e) => handleInputChange(index, 'opLote', e.target.value)}
                    className="block w-full text-sm rounded-lg text-center"
                  />
                </td>
                <td className="border text-sm text-center">
                  <input
                    type="date"
                    value={ConvertirFecha(rma.vencimiento) || ''}
                    onChange={(e) => handleInputChange(index, 'vencimiento', e.target.value)}
                    className="block w-full text-sm rounded-lg text-center"
                  />
                </td>
                <td className="border text-sm text-center">
                  <input
                    type="text"
                    value={rma.seEntrega}
                    onChange={(e) => handleInputChange(index, 'seEntrega', e.target.value)}
                    className="block w-full text-sm rounded-lg text-center"
                  />
                </td>
                <td className="border text-sm text-center">
                  <input
                    type="text"
                    value={rma.seRecibe}
                    onChange={(e) => handleInputChange(index, 'seRecibe', e.target.value)}
                    className="block w-full text-sm rounded-lg text-center"
                  />
                </td>
                <td className="border text-sm text-center">
                  <input
                    type="text"
                    value={rma.observaciones}
                    onChange={(e) => handleInputChange(index, 'observaciones', e.target.value)}
                    className="block w-full text-sm rounded-lg text-center"
                  />
                </td>
                <td className="border text-sm text-center">
                  <input
                    type="text"
                    value={rma.nIngreso}
                    onChange={(e) => handleInputChange(index, 'nIngreso', e.target.value)}
                    className="block w-full text-sm rounded-lg text-center"
                  />
                </td>
                <td className="border text-sm text-center">
                  <input
                    type="text"
                    value={rma.nEgreso}
                    onChange={(e) => handleInputChange(index, 'nEgreso', e.target.value)}
                    className="block w-full text-sm rounded-lg text-center"
                  />
                </td>
                <td className="border py-1 text-sm text-center flex items-center justify-center space-x-2">
                  <ActualizarRma rma={editedRmas[index]} handleActualizar={() => handleActualizarWrapper(index)} />
                  <EliminarRma idRma={rma.idRma} handleEliminar={handleEliminarWrapper} />
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={12} className="text-center py-4">
                No hay datos disponibles.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
