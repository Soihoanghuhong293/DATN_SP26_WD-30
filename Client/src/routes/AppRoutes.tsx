import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AdminLayout from '../layouts/AdminLayout';
import HomePage from '../pages/HomePage';
import Dashboard from '../features/admin/Dashboard';
import { ProfilePage, ChangePassword } from '../pages/account';
import UsersPage from '../pages/admin/UsersPage';

const AppRoutes = () => {
  return (
    <Routes>
      {/* MAIN */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<div>Login Page</div>} />
      </Route>

      {/* ADMIN */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />

        {/* ACCOUNT */}
        <Route path="account" element={<ProfilePage />} />
        <Route path="account/change-password" element={<ChangePassword />} />

        {/* USERS */}
        <Route path="users" element={<UsersPage />} />
      </Route>

      {/* 404 */}
      <Route
        path="*"
        element={<div className="text-center mt-20 text-2xl">
          404 - Không tìm thấy trang
        </div>}
      />
    </Routes>
  );
};

export default AppRoutes;
