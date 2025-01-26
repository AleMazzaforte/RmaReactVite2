import React from "react";

const TablaRmas = ({ rmas, handleActualizar, handleEliminar }) => {
  if (rmas.length === 0) return null;

  return (
    <div>
      <table className="w-full m-4 table-auto ">
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
          {rmas.map((rma, index) => (
            <tr key={rma.id || index}>
              <td className="border-2 py-1 text-sm text-center">
                <input
                  type="text"
                  defaultValue={rma.modelo}
                  className="block w-full py-1 text-sm rounded-lg text-center"
                />
              </td>
              <td className="border-2 py-1 text-sm text-center">
                <input
                  type="number"
                  defaultValue={rma.cantidad}
                  className="block w-full py-1 text-sm rounded-lg text-center"
                />
              </td>
              <td className="border-2 py-1 text-sm text-center">
                <input
                  type="text"
                  defaultValue={rma.marca}
                  className="block w-full py-1 text-sm rounded-lg text-center"
                />
              </td>
              <td className="border-2 py-1 text-sm text-center">
                <input
                  type="text"
                  defaultValue={rma.solicita}
                  className="block w-full py-1 text-sm rounded-lg text-center"
                />
              </td>
              <td className="border-2 py-1 text-sm text-center">
                <input
                  type="text"
                  defaultValue={rma.opLote}
                  className="block w-full py-1 text-sm rounded-lg text-center"
                />
              </td>
              <td className="border-2 py-1 text-sm text-center">
                <input
                  type="date"
                  defaultValue={rma.vencimiento}
                  className="block w-full py-1 text-sm rounded-lg text-center"
                />
              </td>
              <td className="border-2 py-1 text-sm text-center">
                <input
                  type="text"
                  defaultValue={rma.seEntrega}
                  className="block w-full py-1 text-sm rounded-lg text-center"
                />
              </td>
              <td className="border-2 py-1 text-sm text-center">
                <input
                  type="text"
                  defaultValue={rma.seRecibe}
                  className="block w-full py-1 text-sm rounded-lg text-center"
                />
              </td>
              <td className="border-2 py-1 text-sm text-center">
                <input
                  type="text"
                  defaultValue={rma.observaciones}
                  className="block w-full py-1 text-sm rounded-lg text-center"
                />
              </td>
              <td className="border-2 py-1 text-sm text-center">
                <input
                  type="text"
                  defaultValue={rma.numeroIngreso}
                  className="block w-full py-1 text-sm rounded-lg text-center"
                />
              </td>
              <td className="border-2 py-1 text-sm text-center">
                <input
                  type="text"
                  defaultValue={rma.numeroEgreso}
                  className="block w-full py-1 text-sm rounded-lg text-center"
                />
              </td>
              <td className="border py-2 text-sm text-center flex items-center justify-center space-x-2">
                <button
                  className="bg-yellow-500 text-white px-2 py-1 text-sm rounded"
                  onClick={() => handleActualizar(rma)}
                >
                  Actualizar
                </button>
                <button
                  className="bg-red-500 text-white px-2 py-1 text-sm rounded"
                  onClick={() => handleEliminar(rma.id)}
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TablaRmas;
