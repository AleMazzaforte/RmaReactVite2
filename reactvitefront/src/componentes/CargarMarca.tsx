import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import Loader from './utilidades/Loader';  // Importar el componente Loader

let urlMarca = 'https://rma-back.vercel.app/cargarMarca';

if (window.location.hostname === 'localhost') {
  urlMarca = 'http://localhost:8080/cargarMarca';
}

export const CargarMarca: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const enviarFormulario = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Obtener datos del formulario
    const form = e.currentTarget.closest("#formMarca") as HTMLFormElement | null;
    if (!form) return;

    const nombreMarca = form.marca.value.trim();

    // Validar datos
    if (nombreMarca === '') {
        Swal.fire({
            icon: 'warning',
            title: 'Campo vacío',
            text: 'Por favor, ingrese la marca',
        });
        return;
    }

    const formData = {
        nombre: nombreMarca,
    };

    // Enviar datos a la API
    try {
        setLoading(true); // Activar estado de carga
        const response = await fetch(urlMarca, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
        });

        const data = await response.json(); // Parsear la respuesta JSON

        if (response.ok) {
            // Si la respuesta es exitosa
            Swal.fire({
                icon: 'success',
                title: '¡Marca cargada exitosamente!',
            });
        } else {
            // Si hay un error en la respuesta
            const errorMessage = data.message || 'Error al cargar la marca';
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorMessage,
            });
        }
    } catch (error) {
        // Si hay un error en la conexión o en la solicitud
        console.error('Error al cargar la marca', error);
        Swal.fire({
            icon: 'error',
            title: 'Error de conexión',
            text: 'Por favor, inténtelo de nuevo más tarde',
        });
    } finally {
        setLoading(false); // Desactivar estado de carga
    }
  };

  return (
    <div className="w-full max-w-xl bg-white rounded-lg shadow-lg shadow-gray-500 p-8 mx-auto mb-6"
      style={{ maxWidth: '600px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)' }}
    >
      <div className="flex justify-center mb-6">
        <div className="h-16 w-16 bg-gray-300 rounded-full flex items-center justify-center">
          <span className="text-gray-500 font-bold">LOGO</span>
        </div>
      </div>
      <h2 className="text-2xl font-semibold text-gray-700 text-center mb-8">
        Cargar Marca
      </h2>
      <form id='formMarca' className="space-y-6" onSubmit={enviarFormulario}>
        <div>
          <label htmlFor="marca" className="block text-sm font-medium text-gray-700 mb-1">Marca:</label>
          <input 
            type="text" 
            id="marca" 
            name='marca' 
            className='block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none ' 
          />
        </div>
        <div></div>
        <button 
          type='submit'
          className='w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-300 mb-20'
        >
          {loading && <Loader />}
          {loading ? 'Cargando...' : 'Cargar marca'}  
        </button>
        <div></div>
      </form>
    </div>
  );
};
