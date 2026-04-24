import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

type Props = { children: React.ReactElement };

export const PublicOnlyRoute: React.FC<Props> = ({ children }) => {
  const auth = useAuth();
  const location = useLocation();

  if (auth.isAuthenticated) {
    const from = (location.state as any)?.from;
    return <Navigate to={typeof from === 'string' && from ? from : auth.homePath} replace />;
  }

  return children;
};

