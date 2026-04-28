import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import type { UserRole } from './authStorage';

type Props = {
  children: React.ReactElement;
  allowRoles?: UserRole[];
  redirectTo?: string;
};

export const ProtectedRoute: React.FC<Props> = ({ children, allowRoles, redirectTo = '/login' }) => {
  const auth = useAuth();
  const location = useLocation();

  if (!auth.isAuthenticated) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname + location.search }} />;
  }

  if (allowRoles && allowRoles.length > 0) {
    const role = auth.role || 'user';
    if (!allowRoles.includes(role)) {
      return <Navigate to={auth.homePath || '/'} replace />;
    }
  }

  return children;
};

