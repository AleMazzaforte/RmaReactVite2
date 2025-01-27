import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { LoginContainer } from '../componentes/LoginContainer';
import { CargarRma } from '../componentes/CargarRma';

export const Rutas = (): JSX.Element => {
  return (
    <Routes>
      <Route path="/login" element={<LoginContainer />} />
      <Route path="/" element={<ProtectedRoute />}>
        <Route index element={<CargarRma />} />
      </Route>
    </Routes>
  );
};
