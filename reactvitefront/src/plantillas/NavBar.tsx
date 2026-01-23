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
          Authorization: `Bearer ${token}`,
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
      e.target.value = '';
    } else {
      window.location.href = value;
    }
  };

  // Definimos las opciones como un array de objetos
  const opciones = [
    { label: 'Cargar Usuario', value: '/cargarUsuario' },
    { label: 'Cargar cliente', value: '/cargarCliente' },
    { label: 'Actualizar clientes', value: '/actualizarCliente' },
    { label: 'Cargar marca', value: '/cargarMarcas' },
    { label: 'Actualizar marca', value: '/actualizarMarca' },
    { label: 'Cargar Productos', value: '/cargarProductos' },
    { label: 'Actualizar Productos', value: '/actualizarProductos' },
    { label: 'Cargar RMA', value: '/' },
    { label: 'Devolución a góndola', value: '/devolucionAGondola' },
    { label: 'Gestionar RMA', value: '/gestionarRma' },
    { label: 'Imprimir etiqueta', value: '/imprimirEtiqueta' },
    { label: 'Cargar transportes', value: '/cargarTransporte' },
    { label: 'Actualizar transportes', value: '/actualizarTransporte' },
    { label: 'Consultar Stock', value: '/stock' },
    { label: 'Cargar Impo', value: '/cargarOp' },
    { label: 'Actualizar Impo', value: '/actualizarOp' },
    { label: 'Estadísticas', value: '/estadisticas' },
    { label: 'Cargar KIT', value: '/cargarKits' },
    { label: 'Contador de tintas', value: '/cargarTintas' },
    { label: 'Inventario', value: '/inventario' },
    { label: 'Bloques', value: '/bloques' },
    { label: 'Stock', value: '/stock' },
    { label: 'Informe RMA', value: '/informeRma' },
    { label: 'MercadoLibre', value: '/mercadoLibre' },
    { label: 'Magia', value: '/magia' },
    { label: 'Productos Con Descuento', value: '/productosConDescuento' },
  ];

  // Ordenamos alfabéticamente por el label (ignorando mayúsculas/minúsculas)
  const opcionesOrdenadas = [...opciones].sort((a, b) =>
    a.label.localeCompare(b.label, 'es', { sensitivity: 'base' })
  );

  return (
    <header className="h-32 mb-6 bg-gradient-to-b from-blue-500 to-green-500 text-white flex flex-col sm:flex-row items-center justify-between p-4 relative">
      <h1 className="text-xl sm:text-3xl font-bold mb-4 sm:mb-0">Bienvenido al Sistema</h1>

      <div className="w-full sm:w-auto flex justify-center sm:block sm:relative sm:right-0">
        <select
          defaultValue=""
          onChange={handleSelectChange}
          className="w-full sm:w-auto p-2 rounded bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="" disabled>
            Selecciona una opción
          </option>
          {opcionesOrdenadas.map((opcion) => (
            <option key={opcion.value} value={opcion.value}>
              {opcion.label}
            </option>
          ))}
          <option value="/pokemon">Pokemon</option>
          <option value="backup">Descargar Backup</option>
          <option value="logout">Logout</option>
        </select>
      </div>
    </header>
  );
};