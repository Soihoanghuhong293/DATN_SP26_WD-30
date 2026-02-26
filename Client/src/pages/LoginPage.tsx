import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginAPI } from "../services/auth";

const LoginPage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await loginAPI(form);

      const { token, role } = res.data;

      localStorage.setItem("token", token);
      localStorage.setItem("role", role);

      alert("Login success");

      if (role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/");
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Login failed");
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
        <h2 style={{ textAlign: "center" }}>Login</h2>

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
            backgroundColor: "#28a745",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Login
        </button>
      </form>
    </div>
  );
};

export default LoginPage;