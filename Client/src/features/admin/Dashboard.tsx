// src/pages/admin/Dashboard.tsx
const Dashboard = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Tổng quan hệ thống</h2>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-gray-500">Tổng Booking</h3>
          <p className="text-3xl font-bold">120</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-gray-500">Doanh thu</h3>
          <p className="text-3xl font-bold">50tr</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-gray-500">Khách mới</h3>
          <p className="text-3xl font-bold">15</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;