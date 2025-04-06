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
import { ImprimirEtiqueta  } from '../componentes/ImprimirEtiqueta';
import { CargarImpo  } from '../componentes/CargarImpo';
import { ActualizarImpo  } from '../componentes/ActualizarImpo';
import { Estadisticas } from '../componentes/Estadisticas';
import { DevolucionAGondola} from '../componentes/DevolucionAGondola';
import { PokemonList } from '../componentes/PokemonList'
import { ContadorDeTintas } from '../componentes/ContadorDeTintas';
import { Contenedor } from '../componentes/utilidades/Contenedor';

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
        <Route path="/imprimirEtiqueta" element={<ImprimirEtiqueta />} />
        <Route path="/cargarOp" element={<CargarImpo />} />
        <Route path="/actualizarOp" element={<ActualizarImpo />} />
        <Route path="/estadisticas" element={<Estadisticas />} />
        <Route path="/devolucionAGondola" element={<DevolucionAGondola />} />
        <Route path="/pokemon" element={<PokemonList />} />
        <Route path="/pokemon1" element={<Contenedor />} />
        <Route path="/cargarTintas" element={<ContadorDeTintas />} />
      </Route>
      <Route path="*" element={<NotFound />} /> {/* Ruta para manejar páginas no encontradas */}
    </Routes>
  );
};
