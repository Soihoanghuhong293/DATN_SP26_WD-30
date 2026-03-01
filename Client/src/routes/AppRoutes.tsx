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
import ProviderList from '../pages/admin/providers/ProviderList';
import ProviderCreate from '../pages/admin/providers/ProviderCreate';
import TourCreate from '../features/admin/tours/TourCreate';
import TourEdit from '../features/admin/tours/TourEdit';

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
        <Route path="tours/create" element={<TourCreate />} />
        <Route path="tours/:id/edit" element={<TourEdit />} />
        
        <Route path='guides' element={<GuideList />} />
        <Route path="guides/create" element={<GuideCreate />} />
        <Route path="guides/edit/:id" element={<GuideEdit />} />
        <Route path="categories" element={<CategoryList />} />
        <Route path="categories/create" element={<CategoryCreate />} />
        <Route path="categories/edit/:id" element={<CategoryEdit />} />
        <Route path="providers" element={<ProviderList />} />
        <Route path="providers/create" element={<ProviderCreate />} />
      </Route>
      
      <Route path="*" element={<div className="text-center mt-20 text-2xl">404 - Không tìm thấy trang</div>} />
    </Routes>
  );
};

export default AppRoutes;