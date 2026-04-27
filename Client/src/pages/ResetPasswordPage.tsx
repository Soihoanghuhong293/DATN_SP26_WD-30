import { Navigate, useLocation } from "react-router-dom";

const ResetPasswordPage = () => {
  const { search } = useLocation();
  return <Navigate to={`/forgot-password${search}`} replace />;
};

export default ResetPasswordPage;

