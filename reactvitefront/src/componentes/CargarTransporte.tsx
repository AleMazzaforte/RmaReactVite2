import React, { useState, useRef } from 'react';
import Swal from 'sweetalert2';
import Loader from './utilidades/Loader';  // Importar el componente Loader


export const CargarTransporte: React.FC = () => {
  const [loading, setLoading] = useState(false);  // Estado para el loader
  const formRef = useRef<HTMLFormElement>(null);
  
  let urlcargarTransporte = 'https://rmareactvite2.onrender.com/cargarTransporte';
  
  if (window.location.hostname === 'localhost') {
    urlcargarTransporte = 'http://localhost:8080/cargarTransporte';
  }

  const enviarFormulario = async () => {
    if (formRef.current) {
      const formData = new FormData(formRef.current);
      const data = {
        nombre: formData.get("nombre") as string,
        direccionLocal: formData.get("direccionLocal")?.toString || null,
        telefono: formData.get("telefono")?.toString || null,
      };

      try {
        setLoading(true);
        const response = await fetch(urlcargarTransporte, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (response.ok) {
          Swal.fire({
            icon: "success",
            title: "Producto agregado",
            text: `El transporte ${data.nombre} se ha agregado correctamente`,
          }).then(() => {
            if (formRef.current) {
              formRef.current.reset();
             
            }
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: result.message || "Hubo un problema al agregar el transporte",
          });
        }
      } catch (error) {
        console.error("Error al enviar el formulario:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Hubo un problema al enviar el formulario",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const nombre = formData.get("nombre") as string;

    Swal.fire({
      title: `¿Quiere guardar el transporte ${nombre}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, guardar",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed) {
        enviarFormulario();
      }
    });
  };

  return (
    <div className="w-full max-w-xl bg-white rounded-lg shadow-lg shadow-gray-500 p-8 mx-auto mb-6"
      style={{ maxWidth: '600px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)' }}>
      <div className="flex justify-center mb-6">
        <div className="h-16 w-16 bg-gray-300 rounded-full flex items-center justify-center">
          <span className="text-gray-500 font-bold">LOGO</span>
        </div>
      </div>
      <h2 className="text-2xl font-semibold text-gray-700 text-center mb-8">Cargar Transporte</h2>
      <form id="formTransporte" className="space-y-6" onSubmit={handleFormSubmit} ref={formRef}>
        <div>
          <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre:
          </label>
          <input name="nombre" type="text" id="nombre" required className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none" />
        </div>
        
        <div>
          <label htmlFor="direccionLocal" className="block text-sm font-medium text-gray-700 mb-1">Dirección local:</label>
          <input type="text" id="direccionLOcal" name="direccionLocal"  className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none" />
        </div>

        <div>
          <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">Teléfono:</label>
          <input type="number" id="telefono" name="telefono"  className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none" />
        </div>

        <div>
          <button type="submit" id="botonCargar" className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-300">
            {loading ? <Loader /> : 'Cargar transporte'}
          </button>
        </div>
      </form>
    </div>
  );
};