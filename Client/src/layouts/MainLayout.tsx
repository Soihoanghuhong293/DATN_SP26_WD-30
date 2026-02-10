import { Outlet } from 'react-router-dom';
import Header from '../components/Client/Header';
import Footer from '../components/Client/Footer'; 
import { Layout } from 'antd';

const { Content } = Layout;

const MainLayout = () => {
  return (
    <Layout style={{ minHeight: '100vh', background: '#fff' }}>      
      <Header />
      <Content>   
        <div style={{ minHeight: 'calc(100vh - 80px - 300px)' }}> 
           <Outlet />
        </div>
      </Content>
      <Footer />  
    </Layout>
  );
};

export default MainLayout;