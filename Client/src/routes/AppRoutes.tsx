import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AdminLayout from '../layouts/AdminLayout';

/* ===== CLIENT PAGES ===== */
import HomePage from '../pages/HomePage';
import ToursPage from '../pages/ToursPage';
import TourDetailPage from '../pages/TourDetailPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';

/* ===== ADMIN DASHBOARD ===== */
import Dashboard from '../features/admin/Dashboard';

/* ===== ADMIN TOURS ===== */
import TourList from '../features/admin/tours/TourList';
import TourDetail from '../features/admin/tours/TourDetail';
import TourCreate from '../features/admin/tours/TourCreate';
import TourEdit from '../features/admin/tours/TourEdit';

/* ===== ADMIN GUIDES ===== */
import GuideList from '../pages/admin/guides/GuideList';
import GuideCreate from '../pages/admin/guides/GuideCreate';
import GuideEdit from '../pages/admin/guides/GuideEdit';

/* ===== ADMIN CATEGORIES ===== */
import CategoryList from '../pages/admin/categories/CategoryList';
import CategoryCreate from '../pages/admin/categories/CategoryCreate';
import CategoryEdit from '../pages/admin/categories/CategoryEdit';

/* ===== ADMIN PROVIDERS ===== */
import ProviderList from '../pages/admin/providers/ProviderList';
import ProviderCreate from '../pages/admin/providers/ProviderCreate';
import ProviderDetail from '../pages/admin/providers/ProviderDetail';
import ProviderEdit from '../pages/admin/providers/ProviderEdit';

/* ===== ADMIN BOOKINGS ===== */
import BookingList from '../features/bookings/BookingList';
import BookingCreate from '../features/bookings/BookingCreate';

/* ===== 👉 USER MANAGEMENT (THÊM) ===== */
import UserManagement from '../pages/admin/UserManagement';

const AppRoutes = () => {
  return (
    <Routes>
      {/* ================= CLIENT ================= */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="tours" element={<ToursPage />} />
        <Route path="tours/:id" element={<TourDetailPage />} />
      </Route>

      {/* ================= ADMIN ================= */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />

        {/* TOURS */}
        <Route path="tours" element={<TourList />} />
        <Route path="tours/create" element={<TourCreate />} />
        <Route path="tours/:id" element={<TourDetail />} />
        <Route path="tours/:id/edit" element={<TourEdit />} />

        {/* GUIDES */}
        <Route path="guides" element={<GuideList />} />
        <Route path="guides/create" element={<GuideCreate />} />
        <Route path="guides/edit/:id" element={<GuideEdit />} />

        {/* CATEGORIES */}
        <Route path="categories" element={<CategoryList />} />
        <Route path="categories/create" element={<CategoryCreate />} />
        <Route path="categories/edit/:id" element={<CategoryEdit />} />

        {/* PROVIDERS */}
        <Route path="providers" element={<ProviderList />} />
        <Route path="providers/create" element={<ProviderCreate />} />
        <Route path="providers/edit/:id" element={<ProviderEdit />} />
        <Route path="providers/:id" element={<ProviderDetail />} />

        {/* BOOKINGS */}
        <Route path="bookings" element={<BookingList />} />
        <Route path="bookings/create" element={<BookingCreate />} />

        {/* ✅ USER MANAGEMENT (ĐÂY LÀ CÁI BẠN MUỐN THÊM) */}
        <Route path="users" element={<UserManagement />} />
      </Route>

      {/* ================= 404 ================= */}
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