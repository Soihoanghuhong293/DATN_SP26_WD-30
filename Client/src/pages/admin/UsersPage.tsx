const UsersPage = () => {
    const handleUpdateInfo = () => {
      console.log('Cập nhật thông tin tài khoản');
    };
  
    const handleChangePassword = () => {
      console.log('Đổi mật khẩu');
    };
  
    return (
      <div>
        <h1>Quản lý tài khoản</h1>
  
        <section style={{ marginTop: 20 }}>
          <h3>Thông tin tài khoản</h3>
          <p><b>Họ tên:</b> Nguyễn Văn A</p>
          <p><b>Email:</b> admin@gmail.com</p>
          <p><b>Vai trò:</b> Admin</p>
  
          <button onClick={handleUpdateInfo}>
            Cập nhật thông tin
          </button>
        </section>
  
        <section style={{ marginTop: 30 }}>
          <h3>Đổi mật khẩu</h3>
          <input type="password" placeholder="Mật khẩu hiện tại" /><br /><br />
          <input type="password" placeholder="Mật khẩu mới" /><br /><br />
          <input type="password" placeholder="Nhập lại mật khẩu mới" /><br /><br />
  
          <button onClick={handleChangePassword}>
            Đổi mật khẩu
          </button>
        </section>
      </div>
    );
  };
  
  export default UsersPage;
  