import React, { useState, useEffect } from 'react';
import { ListarOp } from './utilidades/ListarOp';

interface Rma {
  idRma: string;
  modelo: string;
  cantidad: number;
  marca: string;
  solicita: string;
  opLote: string;
  vencimiento: string;
  seEntrega: string;
  seRecibe: string;
  observaciones: string;
  nIngreso: string;
  nEgreso: string;
}

interface TablaRmasProps {
  rmas: Rma[];
  handleActualizar: (rma: Rma) => void;
  handleEliminar: (id: string | undefined) => void;
}

let url = 'https://rma-back.vercel.app/listarOp';
if (window.location.hostname === 'localhost') {
  url = 'http://localhost:8080/listarOp';
}

export const TablaListarRmas: React.FC<TablaRmasProps> = ({ rmas, handleActualizar, handleEliminar }) => {
  const [editableRmas, setEditableRmas] = useState<Rma[]>(rmas);
  const [showOpSelector, setShowOpSelector] = useState<number | null>(null);

  useEffect(() => {
    setEditableRmas(rmas);
  }, [rmas]);

  const handleChange = (index: number, field: keyof Rma, value: string | number | undefined) => {
    const updatedRmas = [...editableRmas];
    updatedRmas[index] = { ...updatedRmas[index], [field]: value };
    setEditableRmas(updatedRmas);
  };

  // Cuando se edita el campo OP manualmente
  const handleOpChange = (index: number, value: string) => {
    const updatedRmas = [...editableRmas];
    updatedRmas[index] = { ...updatedRmas[index], opLote: value };
    setEditableRmas(updatedRmas);
    setShowOpSelector(null); // Oculta el selector
  };

  // Render condicional del campo OP
  const renderOpField = (rma: Rma, index: number) => {
    if (showOpSelector === index) {
      return (
        <div className="absolute z-10 -mt-5 bg-white shadow-lg text-left">
          <ListarOp          
            endpoint={`${url}`} // Endpoint existente
            onSeleccionado={(ops) => {
              handleOpChange(index, ops[0].nombre); // Envía solo el nombre como string
            }}
            campos={['nombre']}
            value={rma.opLote}
          />
        </div>
      );
    }
    return (
      <div className="relative">
        <input
          type="text"
          value={rma.opLote}
          className="block w-full py-1 text-sm rounded-lg text-center"
          onChange={(e) => handleOpChange(index, e.target.value)}
          onFocus={() => setShowOpSelector(index)} // Muestra ListarOp al enfocar
        />
      </div>
    );
  };
  const handleSave = (rma: Rma) => {
    handleActualizar(rma);

  };

  const handleDelete = (rma: Rma) => {
    handleEliminar(rma.idRma);

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
            <th className="px-4 py-2">N° de Egreso</th>
            <th className="px-4 py-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {editableRmas.length > 0 ? (
            editableRmas.map((rma, index) => (
              <tr key={rma.idRma || index}>
                <td className="border py-1 text-sm text-center">
                  <input
                    type="text"
                    value={rma.modelo}
                    className="block w-full py-1 text-sm rounded-lg text-center"
                    onChange={(e) => handleChange(index, 'modelo', e.target.value)}
                  />
                </td>
                <td className="border py-1 text-sm text-center">
                  <input
                    type="number"
                    value={rma.cantidad}
                    className="block w-full py-1 text-sm rounded-lg text-center"
                    onChange={(e) => handleChange(index, 'cantidad', parseInt(e.target.value))}
                  />
                </td>
                <td className="border py-1 text-sm text-center">
                  <input
                    type="text"
                    value={rma.marca}
                    className="block w-full py-1 text-sm rounded-lg text-center"
                    onChange={(e) => handleChange(index, 'marca', e.target.value)}
                  />
                </td>
                <td className="border py-1 text-sm text-center">
                  <input
                    type="text"
                    value={rma.solicita}
                    className="block w-full py-1 text-sm rounded-lg text-center"
                    onChange={(e) => handleChange(index, 'solicita', e.target.value)}
                  />
                </td>
                <td className="border py-1 text-sm text-center">
                  {renderOpField(rma, index)}
                </td>
                <td className="border py-1 text-sm text-center">
                  <input
                    type="text"
                    value={rma.vencimiento}
                    className="block w-full py-1 text-sm rounded-lg text-center"
                    onChange={(e) => handleChange(index, 'vencimiento', e.target.value)}
                  />
                </td>
                <td className="border py-1 text-sm text-center">
                  <input
                    type="text"
                    value={rma.seEntrega}
                    className="block w-full py-1 text-sm rounded-lg text-center"
                    onChange={(e) => handleChange(index, 'seEntrega', e.target.value)}
                  />
                </td>
                <td className="border py-1 text-sm text-center">
                  <input
                    type="text"
                    value={rma.seRecibe}
                    className="block w-full py-1 text-sm rounded-lg text-center"
                    onChange={(e) => handleChange(index, 'seRecibe', e.target.value)}
                  />
                </td>
                <td className="border py-1 text-sm text-center">
                  <input
                    type="text"
                    value={rma.observaciones}
                    className="block w-full py-1 text-sm rounded-lg text-center"
                    onChange={(e) => handleChange(index, 'observaciones', e.target.value)}
                  />
                </td>
                
                <td className="border py-1 text-sm text-center">
                  <input
                    type="text"
                    value={rma.nEgreso}
                    className="block w-full py-1 text-sm rounded-lg text-center"
                    onChange={(e) => handleChange(index, 'nEgreso', e.target.value)}
                  />
                </td>
                <td className="border py-2 text-sm text-center flex items-center justify-center space-x-2">
                  <button
                    className="bg-yellow-500 text-white px-2 py-1 text-sm rounded"
                    onClick={() => handleSave(rma)}
                  >
                    Actualizar
                  </button>
                  <button
                    className="bg-red-500 text-white px-2 py-1 text-sm rounded"
                    onClick={() => handleDelete(rma)}
                  >
                    Eliminar
                  </button>
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
