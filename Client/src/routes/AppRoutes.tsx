import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AdminLayout from '../layouts/AdminLayout';
import HomePage from '../pages/HomePage';
import Dashboard from '../features/admin/Dashboard'; 
import TourList from '../features/admin/tours/TourList';
import TourDetail from '../features/admin/tours/TourDetail';

import GuideList from '../pages/admin/guides/GuideList';
import GuideCreate from '../pages/admin/guides/GuideCreate';
import GuideEdit from '../pages/admin/guides/GuideEdit';

import CategoryList from '../pages/admin/categories/CategoryList';
import CategoryCreate from '../pages/admin/categories/CategoryCreate';
import CategoryEdit from '../pages/admin/categories/CategoryEdit';
import TourCreate from '../features/admin/tours/TourCreate';
import TourEdit from '../features/admin/tours/TourEdit';

/* 👉 THÊM */
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import BookingCreate from '../features/bookings/BookingCreate';
import BookingList from '../features/bookings/BookingList';

const AppRoutes = () => {
  return (
    <Routes>
      {/* ===== CLIENT ===== */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />

        {/* 👉 THÊM */}
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
      </Route>

      {/* ===== ADMIN ===== */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />

        <Route path="tours" element={<TourList />} />
        <Route path="tours/create" element={<TourCreate />} />
        <Route path="tours/:id" element={<TourDetail />} />
        <Route path="tours/:id/edit" element={<TourEdit />} />

        <Route path="guides" element={<GuideList />} />
        <Route path="guides/create" element={<GuideCreate />} />
        <Route path="guides/edit/:id" element={<GuideEdit />} />

        <Route path="categories" element={<CategoryList />} />
        <Route path="categories/create" element={<CategoryCreate />} />
        <Route path="categories/edit/:id" element={<CategoryEdit />} />

               <Route path="bookings" element={<BookingList />} />

        <Route path="bookings/create" element={<BookingCreate />} />

      </Route>

      <Route
        path="*"
        element={
          <div className="text-center mt-20 text-2xl">
            404 - Không tìm thấy trang
          </div>
        }
      />
    </Routes>
  );
};

export default AppRoutes;