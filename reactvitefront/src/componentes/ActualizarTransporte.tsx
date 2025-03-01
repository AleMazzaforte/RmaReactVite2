import React, { useState, useRef, useEffect } from 'react';
import Swal from 'sweetalert2';
import Loader from './utilidades/Loader';
import { BusquedaTransportes } from './utilidades/BusquedaTransportes';

export const ActualizarTransporte: React.FC = () => {
  
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [transporteSeleccionado, setTransporteSeleccionado] = useState<any>(null);
  const [formValues, setFormValues] = useState({ nombre: '', direccionLocal: '', telefono: '' });

  let urlActualizarTransporte = 'https://rma-back.vercel.app/actualizarTransporte';
  let urlEliminarTransporte = 'https://rma-back.vercel.app/eliminarTransporte';
  let urlBuscarTransporte = 'https://rma-back.vercel.app/buscarTransporte';

  if (window.location.hostname === 'localhost') {
    urlActualizarTransporte = 'http://localhost:8080/actualizarTransporte';
    urlEliminarTransporte = 'http://localhost:8080/eliminarTransporte';
    urlBuscarTransporte = 'http://localhost:8080/buscarTransporte';
  }

  useEffect(() => {
    if (transporteSeleccionado) {
      setFormValues({
        nombre: transporteSeleccionado.nombre || '',
        direccionLocal: transporteSeleccionado.direccionLocal || '',
        telefono: transporteSeleccionado.telefono || ''
      });
    } else {
      setFormValues({ nombre: '', direccionLocal: '', telefono: '' });
    }
  }, [transporteSeleccionado]);

  const actualizarTransporte = async () => {
    
    if (formRef.current && transporteSeleccionado) {
      const formData = new FormData(formRef.current);
      const data = {
        id: transporteSeleccionado.idTransporte,
        nombre: formData.get("nombre") as string || transporteSeleccionado.nombre,
        direccionLocal: formData.get("direccionLocal") as string || transporteSeleccionado.direccionLocal,
        telefono: parseInt(formData.get("telefono") as string) || transporteSeleccionado.telefono,
      };

      try {
        setLoading(true);
        const response = await fetch(urlActualizarTransporte, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (response.ok) {
          Swal.fire({
            icon: "success",
            title: "Transporte actualizado",
            text: `El transporte "${data.nombre}" se ha actualizado correctamente`,
          }).then(() => limpiarFormulario());
        } else {
          Swal.fire({ icon: "error", title: "Error", text: result.error || "Hubo un problema al actualizar el transporte" });
        }
      } catch (error) {
        Swal.fire({ icon: "error", title: "Error", text: "Hubo un problema al enviar el formulario" });
      } finally {
        setLoading(false);
      }
    }
  };

  const eliminarTransporte = async () => {
    if (transporteSeleccionado) {
      try {
        setLoading(true);
        const response = await fetch(urlEliminarTransporte, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: transporteSeleccionado.idTransporte }),
        });

        const result = await response.json();

        if (response.ok) {
          Swal.fire({
            icon: "success",
            title: "Transporte eliminado",
            text: `El transporte "${transporteSeleccionado.nombre}" se ha eliminado correctamente`,
          }).then(() => limpiarFormulario());
        } else {
          Swal.fire({ icon: "error", title: "Error", text: result.error || "Hubo un problema al eliminar el transporte" });
        }
      } catch (error) {
        Swal.fire({ icon: "error", title: "Error", text: "Hubo un problema al eliminar el transporte" });
      } finally {
        setLoading(false);
      }
    }
  };

  const limpiarFormulario = () => {
    if (formRef.current) {
      formRef.current.reset();
    }
    setTransporteSeleccionado(null);
    setFormValues({ nombre: '', direccionLocal: '', telefono: '' });
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (transporteSeleccionado) {
      Swal.fire({
        title: `¿Quiere actualizar el transporte "${transporteSeleccionado.nombre}"?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Sí, actualizar",
        cancelButtonText: "Cancelar",
      }).then((result) => {
        if (result.isConfirmed) {
          actualizarTransporte();
        }
      });
    }
  };

  const handleEliminarTransporte = () => {
    if (transporteSeleccionado) {
      Swal.fire({
        title: `¿Quiere eliminar el transporte "${transporteSeleccionado.nombre}"?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
      }).then((result) => {
        if (result.isConfirmed) {
          eliminarTransporte();
        }
      });
    }
  };

  return (
    <div className="w-full max-w-xl bg-white rounded-lg shadow-lg p-8 mx-auto mb-6" style={{ maxWidth: '600px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)' }}>
      <div className="flex justify-center mb-6">
            <div className="h-16 w-16 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-500 font-bold">LOGO</span>
            </div>
        </div>
      <h2 className="text-2xl font-semibold text-gray-700 text-center mb-8">Actualizar Transporte</h2>
      <form id="formTransportes" className="space-y-6" onSubmit={handleFormSubmit} ref={formRef}>
        <div>
          <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">Transporte:</label>
          <BusquedaTransportes
            endpoint={urlBuscarTransporte}
            onTransporteSeleccionado={setTransporteSeleccionado}
            campos={['nombre']}
          />
        </div>

        <div>
          <label htmlFor="direccionLocal" className="block text-sm font-medium text-gray-700 mb-1">Dirección Local:</label>
          <input
            type="text"
            id="direccionLocal"
            name="direccionLocal"
            value={formValues.direccionLocal}
            onChange={(e) => setFormValues({ ...formValues, direccionLocal: e.target.value })}
            className="block w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">Teléfono:</label>
          <input
            type="number"
            id="telefono"
            name="telefono"
            value={formValues.telefono}
            onChange={(e) => setFormValues({ ...formValues, telefono: e.target.value })}
            className="block w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div className="flex flex-col space-y-4">
          <button type="submit" className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg">
            {loading ? 'Cargando...' : 'Actualizar transporte'}
          </button>
          <button type="button" onClick={handleEliminarTransporte} className="w-full py-2 px-4 bg-red-600 text-white font-semibold rounded-lg">
            {loading ? 'Cargando...' : 'Eliminar transporte'}
          </button>
        </div>
      </form>
      {loading && <Loader />}
    </div>
  );
};
