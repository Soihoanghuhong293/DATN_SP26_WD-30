import { useState } from "react";

const ProfilePage = () => {
  const [form, setForm] = useState({
    name: "",
    phone: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // TODO: call API update profile
    console.log("Update profile:", form);
    alert("Cập nhật thông tin thành công (mock)");
  };

  return (
    <div style={{ maxWidth: 400 }}>
      <h2>Quản lý tài khoản</h2>

      <form onSubmit={handleSubmit}>
        <div>
          <label>Họ tên</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Số điện thoại</label>
          <input
            type="text"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit">Cập nhật</button>
      </form>
    </div>
  );
};

export default ProfilePage;
