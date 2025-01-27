import React from 'react';
import { useLocation, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

const ProtectedRoute = (): JSX.Element => {
  const { isAuthenticated } = useAuth();
  const token = localStorage.getItem('token');
  const location = useLocation();

  if (!isAuthenticated && !token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
