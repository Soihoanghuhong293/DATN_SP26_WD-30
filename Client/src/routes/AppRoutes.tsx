import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AdminLayout from '../layouts/AdminLayout';
import HomePage from '../pages/HomePage';
import Dashboard from '../features/admin/Dashboard'; 
import TourList from '../features/admin/tours/TourList';
import TourDetail from '../features/admin/tours/TourDetail';

const AppRoutes = () => {
  return (
    <Routes>
     
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<div>Login Page</div>} />
      </Route>

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="tours" element={<TourList />} />
        <Route path="tours/:id" element={<TourDetail />} />
      </Route>
      
      <Route path="*" element={<div className="text-center mt-20 text-2xl">404 - Không tìm thấy trang</div>} />
    </Routes>
  );
};

export default AppRoutes;