import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { LoginContainer } from '../componentes/LoginContainer';
import { CargarRma } from '../componentes/CargarRma';
import { CargarUsuario } from '../componentes/CargarUsuario';
import { ProductosPorCliente } from '../componentes/ProductosPorCliente';
import { NotFound } from '../componentes/NotFound'; 
import { CargarClientes } from '../componentes/CargarClientes';
import { ActualizarClientes } from '../componentes/ActualizarClientes';
import { CargarProductos } from '../componentes/CargarProductos';
import { ActualizarProductos } from '../componentes/ActualizarProductos';
import { CargarMarca } from '../componentes/CargarMarca';
import { ActualizarMarca } from '../componentes/ActualizarMarca';
import { CargarTransporte } from '../componentes/CargarTransporte';
import { ActualizarTransporte } from '../componentes/ActualizarTransporte';

export const Rutas = (): JSX.Element => {
  return (
    <Routes>
      <Route path="/login" element={<LoginContainer />} />
      <Route path="/" element={<ProtectedRoute />}>
        <Route index element={<CargarRma />} />
        <Route path="/cargarUsuario" element={<CargarUsuario />} />
        <Route path="/gestionarRma" element={<ProductosPorCliente />} />
        <Route path="/cargarCLiente" element={<CargarClientes />} />
        <Route path="/actualizarCLiente" element={<ActualizarClientes />} />
        <Route path="/cargarProductos" element={<CargarProductos />} />
        <Route path="/actualizarProductos" element={<ActualizarProductos />} />
        <Route path="/cargarMarcas" element={<CargarMarca />} />
        <Route path="/actualizarMarca" element={<ActualizarMarca />} />
        <Route path="/cargarTransporte" element={<CargarTransporte />} />
        <Route path="/actualizarTransporte" element={<ActualizarTransporte />} />
      </Route>
      <Route path="*" element={<NotFound />} /> {/* Ruta para manejar páginas no encontradas */}
    </Routes>
  );
};
