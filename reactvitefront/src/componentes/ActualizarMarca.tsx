import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import Loader from './utilidades/Loader';  // Importar el componente Loader
import { ListarMarcas } from './utilidades/ListarMarcas';  // Importar el componente ListarMarcas

interface Marca {
  id: string;
  nombre: string;
}

export const ActualizarMarca: React.FC = () => {
  let urlActualizarMarca = 'https://rmareactvite2.onrender.com/actualizarMarca';
  let urlEliminarMarca = 'https://rmareactvite2.onrender.com/eliminarMarca';
  let urlMarcas = 'https://rmareactvite2.onrender.com/listarMarcas';  

  if (window.location.hostname === 'localhost') {
    urlActualizarMarca = 'http://localhost:8080/actualizarMarca';
    urlEliminarMarca = 'http://localhost:8080/eliminarMarca';
    urlMarcas = 'http://localhost:8080/listarMarcas';
  };

  const [loading, setLoading] = useState(false);
  const [marcaSeleccionada, setMarcaSeleccionada] = useState<Marca | null>(null);
  const [nombreMarca, setNombreMarca] = useState(""); // Controla el input
  const [mostrarListarMarcas, setMostrarListarMarcas] = useState(true); // Controla la visibilidad
  
  const handleMarcaSeleccionada = (marca: Marca) => {
    setMarcaSeleccionada(marca);
    setNombreMarca(marca.nombre); 
    setMostrarListarMarcas(false); // Oculta ListarMarcas cuando se selecciona una marca
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNombreMarca(e.target.value);
  };
  
  const enviarFormulario = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  
    if (!nombreMarca.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo vacío',
        text: 'Por favor, ingrese el nombre de la marca',
      });
      return;
    }
  
    setLoading(true);
  
    try {
      const response = await fetch(urlActualizarMarca, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: marcaSeleccionada?.id, nombre: nombreMarca }),
      });
  
      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: '¡Marca actualizada exitosamente!',
        });
  
        // Restablecer formulario
        setMarcaSeleccionada(null);
        setNombreMarca("");
        setMostrarListarMarcas(true); // Vuelve a mostrar ListarMarcas
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error al actualizar la marca',
          text: 'Por favor, inténtelo de nuevo',
        });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error al actualizar la marca',
        text: 'Por favor, inténtelo de nuevo',
      });
    } finally {
      setLoading(false);
    }
  };
  
  

  const handleKeyDown: React.KeyboardEventHandler<HTMLFormElement> = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };
  

  return (
    <div className='w-full max-w-xl bg-white rounded-lg shadow-lg shadow-grey-500 p-8 mx-auto mb-6' style={{maxWidth: '600px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'}}>
      <div className='flex justify-center mb-6'>
        <div className='h-16 w-16 bg-gray-300 rounded-full flex items-center justify-center'>
          <span className='text-gray-500 font-bold'>LOGO</span>
        </div>
      </div>
      <h2 className='text-2xl font-semibold text-gray-700 text-center mb-8'>
        Actualizar Marca
      </h2>

      <form id='formEditar' className='space-y-6' onSubmit={enviarFormulario} onKeyDown={handleKeyDown}>
  <div>
    <label htmlFor='marca' className='block text-sm font-medium text-gray-700 mb-1'>Marca:</label>

    {/* Muestra ListarMarcas solo si aún no se ha seleccionado una marca */}
    {mostrarListarMarcas && (
      <ListarMarcas 
        endpoint={urlMarcas} 
        onMarcaSeleccionada={handleMarcaSeleccionada} 
        campos={['nombre']} 
      />
      )}
      
      {/* Input editable donde se actualiza el nombre */}
      {marcaSeleccionada && (
        <input 
          type="text" 
          value={nombreMarca} 
          onChange={handleChange} 
          className='block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none '
        />
      )}
    </div>
    <div></div>

    <button 
      type='submit'
      className='w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-300'
    >
      {loading && <Loader />}
      {loading ? 'Actualizando...' : 'Actualizar marca'}  
      </button>
    </form>
      <div className='mb-2.5'></div>


    </div>
  );
}
