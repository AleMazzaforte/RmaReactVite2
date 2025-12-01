import { useState, FormEvent, ChangeEvent } from 'react';
import {sweetAlert} from './utilidades/SweetAlertWrapper'; // Importar sweetAlert
import { Contenedor } from './utilidades/Contenedor';
import Urls from './utilidades/Urls';


export const CargarUsuario: React.FC = () => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const enviarFormulario = async () => {
    const formData = { username, password };

    const urlCargarUsuario = Urls.usuarios.cargar; 
    try { 
      const response = await fetch(urlCargarUsuario, { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json', 
        }, 
        body: JSON.stringify(formData), 
      });

      if (response.ok) {
        // Si la respuesta es exitosa
        sweetAlert.fire({
          icon: 'success',
          title: 'Éxito',
          text: 'Usuario cargado exitosamente',
        });
        setUsername('');
        setPassword('');
      } else {
        // Si hay un error en la respuesta
        console.error('Error al cargar el usuario:', response.statusText);
        sweetAlert.fire({
          icon: 'error',
          title: 'Error',
          text: response.statusText || 'Hubo un problema al cargar el usuario',
        });
      }
    } catch (error) {
      console.error('Error al enviar el formulario:', error);
      // Mostrar alerta de error en la conexión
      sweetAlert.fire({
        icon: 'error',
        title: 'Error de conexión',
        text: 'Por favor, inténtelo de nuevo más tarde',
      }); 
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    sweetAlert.fire({
      title: `¿Quiere guardar a ${username} como usuario?`,
      icon: 'question',
      showCancelButton: true,

      confirmButtonText: 'Sí, guardar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        enviarFormulario();
      }
    });
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'username') {
      setUsername(value);
    } else if (name === 'password') {
      setPassword(value);
    }
  };

  return (
    <div>
      <Contenedor>
      <h2 className="text-2xl font-semibold text-gray-700 text-center mb-8">Cargar Usuario</h2>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Usuario:</label>
          <input
            type="text"
            id="username"
            name="username"
            value={username}
            onChange={handleChange}
            required
            className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Contraseña:</label>
          <input
            type="password"
            id="password"
            name="password"
            value={password}
            onChange={handleChange}
            required
            className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
          />
        </div>
        <div>
          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-black focus:ring focus:ring-black"
            disabled={loading}
          >
            {loading ? <span>Cargando...</span> : "Cargar Usuario"}
          </button>
        </div>
      </form>


      </Contenedor>

          </div>
  );
};
