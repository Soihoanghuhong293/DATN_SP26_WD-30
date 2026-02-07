import { useState } from "react";

const ChangePassword = () => {
  const [form, setForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (form.newPassword !== form.confirmPassword) {
      alert("Mật khẩu mới không khớp");
      return;
    }

    // TODO: call API change password
    console.log("Change password:", form);
    alert("Đổi mật khẩu thành công (mock)");
  };

  return (
    <div style={{ maxWidth: 400, marginTop: 20 }}>
      <h3>Đổi mật khẩu</h3>

      <form onSubmit={handleSubmit}>
        <div>
          <label>Mật khẩu hiện tại</label>
          <input
            type="password"
            name="oldPassword"
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Mật khẩu mới</label>
          <input
            type="password"
            name="newPassword"
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Nhập lại mật khẩu mới</label>
          <input
            type="password"
            name="confirmPassword"
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit">Đổi mật khẩu</button>
      </form>
    </div>
  );
};

export default ChangePassword;
