const HdvDashboard = () => {
  return (
    <div
      style={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          maxWidth: 640,
          width: "100%",
          padding: 32,
          borderRadius: 16,
          background:
            "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(16,185,129,0.08))",
          border: "1px solid rgba(148,163,184,0.4)",
          boxShadow: "0 18px 45px rgba(15,23,42,0.12)",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: 28,
            marginBottom: 12,
            fontWeight: 700,
            color: "#0f172a",
          }}
        >
          Khu vực làm việc của HDV
        </h1>
        <p
          style={{
            fontSize: 15,
            color: "#64748b",
            marginBottom: 4,
          }}
        >
          Tài khoản của bạn đã đăng nhập thành công với vai trò Hướng dẫn viên.
        </p>
        <p
          style={{
            fontSize: 15,
            color: "#64748b",
          }}
        >
          Hiện tại chưa có dữ liệu hay chức năng cụ thể. Khu vực này sẽ được
          sử dụng để quản lý tour, lịch làm việc và thông tin cho HDV trong các
          bước tiếp theo.
        </p>
      </div>
    </div>
  );
};

export default HdvDashboard;

