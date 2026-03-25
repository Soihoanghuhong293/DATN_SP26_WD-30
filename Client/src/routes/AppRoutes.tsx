import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AdminLayout from '../layouts/AdminLayout';
import HdvLayout from '../layouts/HdvLayout';
import HomePage from '../pages/HomePage';
import ToursPage from '../pages/ToursPage';
import TourDetailPage from '../pages/TourDetailPage';
import Dashboard from '../features/admin/Dashboard'; 
import TourList from '../features/admin/tours/TourList';
import TourDetail from '../features/admin/tours/TourDetail';

import GuideList from '../pages/admin/guides/GuideList';
import GuideEdit from '../pages/admin/guides/GuideEdit';

import CategoryList from '../pages/admin/categories/CategoryList';
import CategoryCreate from '../pages/admin/categories/CategoryCreate';
import CategoryEdit from '../pages/admin/categories/CategoryEdit';
import ProviderList from '../pages/admin/providers/ProviderList';
import ProviderCreate from '../pages/admin/providers/ProviderCreate';
import ProviderDetail from '../pages/admin/providers/ProviderDetail';
import ProviderEdit from '../pages/admin/providers/ProviderEdit';
import TourCreate from '../features/admin/tours/TourCreate';
import TourEdit from '../features/admin/tours/TourEdit';
import ContactMessageList from '../pages/admin/ContactMessageList';
import HdvDashboard from '../pages/HdvDashboard';
import HdvTours from '../pages/HdvTours';
import HdvBookingDetail from '../pages/HdvBookingDetail';
import HdvSchedule from '../pages/HdvSchedule';

/* 👉 THÊM */
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import BookingCreate from '../features/bookings/BookingCreate';
import BookingPage from '../pages/BookingPage';
import BookingSuccessPage from '../pages/BookingSuccessPage';
import BookingPaymentPage from '../pages/BookingPaymentPage';

import BookingList from '../features/bookings/BookingList';
import BookingEdit from '../features/bookings/BookingEdit';
import UserList from '../features/admin/users/UserList';
import UserCreate from '../features/admin/users/UserCreate';
import BookingDetail from '../features/bookings/BookingDetail';
import HolidayPricingList from '../components/layout/HolidayPricingList';
import HolidayPricingCreate from '../components/layout/HolidayPricingCreate';
import TourTemplateList from '../features/admin/tourTemplates/TourTemplateList';
import TourTemplateCreate from '../features/admin/tourTemplates/TourTemplateCreate';
import TourTemplateEdit from '../features/admin/tourTemplates/TourTemplateEdit';

const AppRoutes = () => {
  return (
    <Routes>
      {/* ===== CLIENT ===== */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />

        {/* 👉 THÊM */}
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="tours" element={<ToursPage />} />
        <Route path="tours/:id" element={<TourDetailPage />} />
        <Route path="order/booking/:id" element={<BookingPage />} />
        <Route path="booking/payment/:id" element={<BookingPaymentPage />} />
        <Route path="booking/success/:id" element={<BookingSuccessPage />} />
      </Route>

      {/* ===== HDV (Hướng dẫn viên) ===== */}
      <Route path="/hdv" element={<HdvLayout />}>
        <Route index element={<HdvDashboard />} />
        <Route path="tours" element={<HdvTours />} />
        <Route path="tours/:id" element={<HdvBookingDetail />} />
        <Route path="schedule" element={<HdvSchedule />} />
      </Route>

      {/* ===== ADMIN ===== */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />

        <Route path="tours" element={<TourList />} />
        <Route path="tours/create" element={<TourCreate />} />
        <Route path="tours/:id" element={<TourDetail />} />
        <Route path="tours/:id/edit" element={<TourEdit />} />

        <Route path="tour-templates" element={<TourTemplateList />} />
        <Route path="tour-templates/create" element={<TourTemplateCreate />} />
        <Route path="tour-templates/:id/edit" element={<TourTemplateEdit />} />

        <Route path="guides" element={<GuideList />} />
       
        
        <Route path='guides' element={<GuideList />} />
        <Route path="guides/edit/:id" element={<GuideEdit />} />

        <Route path="categories" element={<CategoryList />} />
        <Route path="categories/create" element={<CategoryCreate />} />
        <Route path="categories/edit/:id" element={<CategoryEdit />} />
        <Route path="providers" element={<ProviderList />} />
        <Route path="providers/create" element={<ProviderCreate />} />
        <Route path="providers/edit/:id" element={<ProviderEdit />} />
        <Route path="providers/:id" element={<ProviderDetail />} />


        <Route path="bookings" element={<BookingList />} />
        <Route path="bookings/create" element={<BookingCreate />} />
        <Route path="bookings/edit/:id" element={<BookingEdit />} />
        <Route path="bookings/:id" element={<BookingDetail />} />
          <Route path="users" element={<UserList />} />
          <Route path="users/create" element={<UserCreate />} />

        <Route path="contact-messages" element={<ContactMessageList />} />
        <Route path="/admin/holiday-pricing" element={<HolidayPricingList />} />
        <Route path="holiday-pricing/create" element={<HolidayPricingCreate />} />

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