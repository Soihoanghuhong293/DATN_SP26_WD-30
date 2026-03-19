import { useState, type ChangeEvent, type FormEvent } from "react";
import { registerAPI } from "../services/auth";
import { useNavigate } from "react-router-dom";

const RegisterPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await registerAPI(form);
      alert("Đăng ký thành công");
      navigate("/login");
    } catch (err: any) {
      alert(err.response?.data?.message || "Register failed");
    }
  };

  return (
    <div
      style={{
        width: "350px",
        margin: "100px auto",
        border: "1px solid #ccc",
        padding: "20px",
        borderRadius: "6px",
      }}
    >
      <form onSubmit={handleSubmit}>
        <h2 style={{ textAlign: "center" }}>Register</h2>

        <div style={{ marginBottom: "12px" }}>
          <input
            name="name"
            placeholder="Name"
            onChange={handleChange}
            style={{ width: "100%", padding: "8px" }}
          />
        </div>

        <div style={{ marginBottom: "12px" }}>
          <input
            name="email"
            placeholder="Email"
            onChange={handleChange}
            style={{ width: "100%", padding: "8px" }}
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <input
            name="password"
            type="password"
            placeholder="Password"
            onChange={handleChange}
            style={{ width: "100%", padding: "8px" }}
          />
        </div>

        <button
          type="submit"
          style={{
            width: "100%",
            padding: "10px",
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Register
        </button>
      </form>
    </div>
  );
};

export default RegisterPage;