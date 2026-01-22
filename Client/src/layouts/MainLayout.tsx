import { Outlet } from 'react-router-dom';
// import Header from '../components/common/Header';
// import Footer from '../components/common/Footer';

const MainLayout = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="h-16 bg-blue-600 text-white p-4">Header (Logo, Nav)</header>
      
      <main className="flex-grow container mx-auto p-4">
        {/* render trang con */}
        <Outlet /> 
      </main>

      <footer className="bg-gray-800 text-white p-4">Footer hihii Content</footer>
    </div>
  );
};

export default MainLayout;