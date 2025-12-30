import { ChangeEvent } from 'react';
import Urls from '../componentes/utilidades/Urls';

const urlBackup = Urls.backup.getBackup;

export const NavBar: React.FC = () => {
  function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }

  const handleBackupDownload = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(urlBackup, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`, // Si usas autenticación JWT
        },
      });

      if (!response.ok) {
        throw new Error('No se pudo generar el backup');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${new Date().toISOString().split('T')[0]}.sql`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error al descargar el backup:', error);
      alert('Error al generar el backup. ¿Eres administrador?');
    }
  };

  const handleSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    if (value === 'logout') {
      logout();
    } else if (value === 'backup') {
      handleBackupDownload();
      // Resetear el select para que vuelva a "Selecciona una opción"
      e.target.value = '';
    } else {
      window.location.href = value;
    }
  };


  return (
    <header className="h-32 mb-6 bg-gradient-to-b from-blue-500 to-green-500 text-white flex flex-col sm:flex-row items-center justify-between p-4 relative">
      <h1 className="text-xl sm:text-3xl font-bold mb-4 sm:mb-0">Bienvenido al Sistema</h1>

      <div className="w-full sm:w-auto flex justify-center sm:block sm:relative sm:right-0">
        <select
          defaultValue=""
          onChange={handleSelectChange}
          className="w-full sm:w-auto p-2 rounded bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="" disabled>Selecciona una opción</option>
          <option value="/cargarUsuario">Cargar Usuario</option>
          <option value="/cargarCliente">Cargar cliente</option>
          <option value="/actualizarCliente">Actualizar clientes</option>
          <option value="/cargarMarcas">Cargar marca</option>
          <option value="/actualizarMarca">Actualizar marca</option>
          <option value="/cargarProductos">Cargar Productos</option>
          <option value="/actualizarProductos">Actualizar Productos</option>
          <option value="/">Cargar RMA</option>
          <option value="/devolucionAGondola">Devolución a góndola</option>
          <option value="/gestionarRma">Gestionar RMA</option>
          <option value="/imprimirEtiqueta">Imprimir etiqueta</option>
          <option value="/cargarTransporte">Cargar transportes</option>
          <option value="/actualizarTransporte">Actualizar transportes</option>
          <option value="/stock">Consultar Stock</option>
          <option value="/cargarOp">Cargar Impo</option>
          <option value="/actualizarOp">Actualizar Impo</option>
          <option value="/estadisticas">Estadísticas</option>
          <option value="/cargarKits">Cargar KIT</option>
          <option value="/cargarTintas">Contador de tintas</option>
          <option value="/inventario">Inventario</option>
          <option value="/bloques">Bloques</option>
          <option value="/stock">Stock</option>
          <option value="/informeRma">Informe RMA</option>
          <option value="/api">Api</option>
          <option value="/magia">Magia</option>
          <option value="/productosConDescuento">Productos Con Descuento</option>
          <option value="/pokemon">Pokemon</option>

          <option value="backup">Descargar Backup</option>
          <option value="logout">Logout</option>
        </select>
      </div>
    </header>
  );
}
