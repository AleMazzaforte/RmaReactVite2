import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import Loader from './utilidades/Loader';  // Importar el componente Loader
import { ListarMarcas } from './utilidades/ListarMarcas';  // Importar el componente ListarMarcas
import { Contenedor } from './utilidades/Contenedor'; // Importar el componente Contenedor

interface Marca {
  id: string;
  nombre: string;
}

export const ActualizarMarca: React.FC = () => {
  let urlActualizarMarca = 'https://rma-back.vercel.app/actualizarMarca';
  let urlEliminarMarca = 'https://rma-back.vercel.app/eliminarMarca';
  let urlMarcas = 'https://rma-back.vercel.app/listarMarcas';  

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

    // Validar que el nombre de la marca no esté vacío
    if (!nombreMarca.trim()) {
        Swal.fire({
            icon: 'warning',
            title: 'Campo vacío',
            text: 'Por favor, ingrese el nombre de la marca',
        });
        return;
    }

    setLoading(true); // Activar estado de carga

    try {
        const response = await fetch(urlActualizarMarca, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: marcaSeleccionada?.id, nombre: nombreMarca }),
        });

        const data = await response.json(); // Parsear la respuesta JSON

        if (response.ok) {
            // Si la respuesta es exitosa
            Swal.fire({
                icon: 'success',
                title: '¡Marca actualizada exitosamente!',
            });

            // Restablecer formulario
            setMarcaSeleccionada(null);
            setNombreMarca("");
            setMostrarListarMarcas(true); // Vuelve a mostrar ListarMarcas
        } else {
            // Si hay un error en la respuesta
            const errorMessage = data.message || 'Error al actualizar la marca';
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorMessage,
            });
        }
    } catch (error) {
        // Si hay un error en la conexión o en la solicitud
        console.error('Error al actualizar la marca', error);
        Swal.fire({
            icon: 'error',
            title: 'Error de conexión',
            text: 'Por favor, inténtelo de nuevo más tarde',
        });
    } finally {
        setLoading(false); // Desactivar estado de carga
    }
  };
  
  //eliminar marca
  const eliminarMarca = async () => {
    if (!marcaSeleccionada) return;

    // Confirmar con el usuario antes de eliminar
    const confirmacion = await Swal.fire({
        icon: 'warning',
        title: '¿Estás seguro?',
        text: `¿Deseas eliminar la marca "${marcaSeleccionada.nombre}"?`,
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#d33', // Color rojo para el botón de confirmación
    });

    if (!confirmacion.isConfirmed) return;

    setLoading(true); // Activar estado de carga

    try {
        const response = await fetch(urlEliminarMarca, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: marcaSeleccionada.id }),
        });

        const data = await response.json(); // Parsear la respuesta JSON

        if (response.ok) {
            // Si la respuesta es exitosa
            Swal.fire({
                icon: 'success',
                title: '¡Marca eliminada exitosamente!',
            });

            // Restablecer formulario
            setMarcaSeleccionada(null);
            setNombreMarca("");
            setMostrarListarMarcas(true); // Vuelve a mostrar ListarMarcas
        } else {
            // Si hay un error en la respuesta
            const errorMessage = data.message || 'Error al eliminar la marca';
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorMessage,
            });
        }
    } catch (error) {
        // Si hay un error en la conexión o en la solicitud
        console.error('Error al eliminar la marca', error);
        Swal.fire({
            icon: 'error',
            title: 'Error de conexión',
            text: 'Por favor, inténtelo de nuevo más tarde',
        });
    } finally {
        setLoading(false); // Desactivar estado de carga
    }
};

  const handleKeyDown: React.KeyboardEventHandler<HTMLFormElement> = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };
  

  return (
    <div>
        <Contenedor>
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
                        className='block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none mb-9'
                    />
                )}
            </div>

            <button 
                type='submit'
                className='w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-300'
            >
                {loading ? 'Actualizando...' : 'Actualizar marca'}  
            </button>

            <button 
                type='button' // Importante: type="button" para evitar que se envíe el formulario
                onClick={eliminarMarca}
                className='w-full py-2 px-4 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 focus:outline-none focus:ring focus:ring-red-300 mt-4'
            >
                {loading ? 'Eliminando...' : 'Eliminar marca'}  
            </button>
            
        </form>
        </Contenedor>        
    </div>
  );
}
