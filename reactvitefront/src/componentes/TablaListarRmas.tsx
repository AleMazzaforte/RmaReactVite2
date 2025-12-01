import { useState, useEffect } from 'react';
import { ListarOp } from './utilidades/ListarOp';
import Urls from './utilidades/Urls';

// Definición de la interfaz Rma para tipar los datos
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

// Props que recibe el componente TablaListarRmas
interface TablaRmasProps {
  rmas: Rma[];
  handleActualizar: (rma: Rma) => void;
  handleEliminar: (id: string | undefined) => void;
}

// Definición del endpoint según si está en producción o desarrollo
const url = Urls.rma.listarOp;

// Componente principal
export const TablaListarRmas: React.FC<TablaRmasProps> = ({ rmas, handleActualizar, handleEliminar }) => {
  // Estado para mantener los datos editables
  const [editableRmas, setEditableRmas] = useState<Rma[]>(rmas);
  // Controla si el selector de OP (ListarOp) está visible y en qué fila
  const [showOpSelector, setShowOpSelector] = useState<number | null>(null);

  // Efecto que actualiza el estado interno si cambian los props
  useEffect(() => {
    setEditableRmas(rmas);
  }, [rmas]);

  // Maneja los cambios en los campos de entrada
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

  // Renderiza el campo OP, mostrando ListarOp si el campo está enfocado
  const renderOpField = (rma: Rma, index: number) => {
    if (showOpSelector === index) {
      return (
        <div className="absolute z-10 -mt-5 bg-white shadow-lg text-left">
          <ListarOp          
            endpoint={`${url}`} // Endpoint para obtener lista de OPs
            onSeleccionado={(ops) => {
              handleOpChange(index, ops[0].nombre); //  Asigna solo el nombre de la OP seleccionada
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

  // Llama a la función pasada por props para actualizar un RMA
  const handleSave = (rma: Rma) => {
    handleActualizar(rma);

  };

  // Llama a la función pasada por props para eliminar un RMA
  const handleDelete = (rma: Rma) => {
    handleEliminar(rma.idRma);

  };

  // Render del componente
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
               // Condición para pintar la fila con fondo rojo si seEntrega o nEgreso están vacíos
              <tr key={rma.idRma || index} className={(rma.seEntrega.trim() && rma.nEgreso.trim()) === '' ? 'bg-red-200 ' : ''}>
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
                {/* Celda Acciones: Botones de actualizar y eliminar */}
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
            // Si no hay datos para mostrar
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
