import React, { ChangeEvent } from 'react';

export const NavBar: React.FC = () => {
  function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }

  const handleSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'logout') {
      logout();
    } else {
      window.location.href = value;
    }
  }

  return (
    <header className="h-32 mb-6 bg-gradient-to-b from-blue-500 to-green-500 text-white flex items-center justify-between p-4 relative mt-0 mr-0 ml-0">
      <h1 className="text-3xl font-bold">Bienvenido al Sistema</h1>
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
        <select defaultValue="" onChange={handleSelectChange} className="p-2 rounded bg-white text-black">
          <option value="" disabled>Selecciona una opción</option>
          <option value="/cargarUsuario">Cargar Usuario</option>
          <option value="/cargarCliente">Cargar cliente</option>
          <option value="/actualizarCliente">Actualizar clientes</option>
          <option value="/cargarMarcas">Cargar marca</option>
          <option value="/cargarProductos">Cargar Productos</option>
          <option value="/">Cargar RMA</option>
          <option value="/gestionarRma">Gestionar RMA</option>
          <option value="/imprimirEtiqueta">Imprimir etiqueta</option>
          <option value="/agregarTransporte">Cargar transportes</option>
          <option value="/gestionarTransporte">Gestionar transportes</option>
          <option value="/stockEjs">Consultar Stock</option>
          <option value="/cargarOp">Cargar Impo</option>
          <option value="/actualizarOp">Actualizar Impo</option>
          <option value="/estadisticas">Estadísticas</option>
          <option value="logout">Logout</option>
        </select>
      </div>
    </header>
  );
}
