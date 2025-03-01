import React, { useState } from 'react';
import { ListarOp } from './utilidades/ListarOp';
import { ListarProductos } from './utilidades/ListarProductos';
import Swal from 'sweetalert2';

interface Op {
  id: number;
  nombre: string;
  fechaIngreso: string;
  producto: string;
  cantidad: number;
}

export const ActualizarImpo = () => {
  const [opSeleccionada, setOpSeleccionada] = useState<Op[]>([]);


  let urlActualizarOp = 'https://rma-back.vercel.app/actualizarOp';
  let urlListarOp = 'https://rma-back.vercel.app/listarOp';
  if (window.location.hostname == 'localhost') {
    urlActualizarOp = 'http://localhost:8080/actualizarOp'
    urlListarOp = 'http://localhost:8080/listarOp'
  }
  

  const handleOpSeleccionada = (opCompleta: Op[]) => {
    console.log('opcompleta: ',opCompleta);
    
    setOpSeleccionada(opCompleta);
  };
  console.log('OP seleccionada', opSeleccionada);
  
  const handleActualizarProducto = (id: number, nuevoProducto: string) => {
    setOpSeleccionada((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, producto: nuevoProducto } : item
      )
    );
  };

  const handleActualizarCantidad = (id: number, nuevaCantidad: number) => {
    setOpSeleccionada((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, cantidad: nuevaCantidad } : item
      )
    );
  };

  const handleEliminarProducto = (id: number) => {
    setOpSeleccionada((prev) => prev.filter((item) => item.id !== id));
  };

  const handleGuardarCambios = async () => {
    try {
      const response = await fetch(`${urlActualizarOp}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(opSeleccionada),
      });

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Éxito',
          text: 'Cambios guardados correctamente.',
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Error al guardar los cambios.',
        });
      }
    } catch (error) {
      console.error('Error al guardar los cambios:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Hubo un problema al guardar los cambios.',
      });
    }
  };

  return (
    <div className="w-full max-w-xl bg-white rounded-lg shadow-lg shadow-gray-500 p-8 mx-auto mb-6"
    style={{ maxWidth: '600px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)' }}>
      <div className="flex justify-center mb-6">
          <div className="h-16 w-16 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-gray-500 font-bold">LOGO</span>
          </div>
        </div>
        <h2 className="text-2xl font-semibold text-gray-700 text-center mb-8">
          Actualizar Impo
        </h2>
      <div>
        <label htmlFor="op" className="block text-sm font-medium text-gray-700 mb-1">
          Operación:
        </label>
        <ListarOp
          endpoint= {urlListarOp}
          onSeleccionado={handleOpSeleccionada}
          campos={['nombre']}
        />
      </div>

      {opSeleccionada.length > 0 && (
        <div>
          <h2>
            {opSeleccionada[0].nombre} - {opSeleccionada[0].fechaIngreso}
          </h2>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {opSeleccionada.map((item) => (
                <tr key={item.id}>
                  <td>
                    <ListarProductos
                      endpoint="http://localhost:8080/listarProductos"
                      onProductoSeleccionado={(producto) =>
                        handleActualizarProducto(item.id, producto.sku)
                      }
                      campos={['sku']}
                      value={item.producto}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={item.cantidad}
                      onChange={(e) =>
                        handleActualizarCantidad(item.id, parseInt(e.target.value))
                      }
                    />
                  </td>
                  <td>
                    <button onClick={() => handleEliminarProducto(item.id)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={handleGuardarCambios}>Guardar Cambios</button>
        </div>
      )}
    </div>
  );
};