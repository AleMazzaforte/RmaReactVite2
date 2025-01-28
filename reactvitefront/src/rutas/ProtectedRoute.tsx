import React from 'react';
import { useLocation, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { NavBar } from '../plantillas/NavBar'; // Asegúrate de que la ruta sea correcta

const ProtectedRoute = (): JSX.Element => {
  const { isAuthenticated } = useAuth();
  const token = localStorage.getItem('token');
  const location = useLocation();

  if (!isAuthenticated && !token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <>
      <NavBar />
      <Outlet />
    </>
  );
};

export default ProtectedRoute;
