import React, { useState, ChangeEvent, FormEvent } from 'react';
import Swal from 'sweetalert2';
import { useAuth } from '../rutas/AuthContext';
import { useNavigate } from 'react-router-dom';
import Loader from './utilidades/Loader';  // Importar el componente Loader

// Determinar la URL de la API según la url
let url = 'https://rmareactvite2.onrender.com';

if (window.location.hostname === 'localhost') {
  url = 'http://localhost:8080';
}

// Definir el tipo para los datos del formulario
interface FormData {
  nombre: string;
  password: string;
}

export function LoginContainer() {
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);  // Estado para controlar el loader

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [id]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (localStorage.getItem('token')) {
      Swal.fire({
        title: 'Error',
        text: 'Ya has iniciado sesión',
        icon: 'error',
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }

    try {
      setLoading(true);  // Mostrar el loader

      // Añadir setTimeout de 10 segundos para simular una espera
      await new Promise((resolve) => setTimeout(resolve, 10));

      const response = await fetch(`${url}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        login();
        Swal.fire({
          title: '¡Bienvenido!',
          text: `Hola, ${formData.nombre}. ¡Te has logueado exitosamente!`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
        });
        setTimeout(() => {
          navigate('/');
        }, 20);
      } else {
        let errorMessage = 'Ocurrió un error al iniciar sesión';
        if (data.error === 'Usuario no encontrado') {
          errorMessage = 'Usuario no encontrado';
        } else if (data.error === 'Contraseña incorrecta') {
          errorMessage = 'Contraseña incorrecta';
        }
        Swal.fire({
          title: 'Error',
          text: errorMessage,
          icon: 'error',
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      console.error(error);
      Swal.fire({
        title: 'Error',
        text: 'Ocurrió un error en la solicitud de login',
        icon: 'error',
        timer: 2000,
        showConfirmButton: false,
      });
    } finally {
      setLoading(false);  // Ocultar el loader
    }
  };

  return (
    <div
      className="w-full max-w-xl bg-white rounded-lg shadow-lg shadow-gray-500 p-8 mx-auto"
      style={{
        maxWidth: '600px',
        alignItems: 'center',
        height: '100vh',
        boxShadow: '0 -10px 20px rgba(0, 0, 0, 0.3)',
      }}
    >
      {loading && <Loader />}  
      <div className="flex justify-center mb-6">
        <div className="h-16 w-16 bg-gray-300 rounded-full flex items-center justify-center">
          <span className="text-gray-500 font-bold">LOGO</span>
        </div>
      </div>
      <h2 className="text-2xl font-semibold text-gray-700 text-center mb-8">Iniciar Sesión</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="nombre"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Nombre
          </label>
          <input
            id="nombre"
            type="text"
            value={formData.nombre}
            onChange={handleChange}
            className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
          />
        </div>
        <div>
          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-300"
          >
            {loading ? 'Cargando...' : 'Ingresar'}  
          </button>
        </div>
      </form>
    </div>
  );
}
