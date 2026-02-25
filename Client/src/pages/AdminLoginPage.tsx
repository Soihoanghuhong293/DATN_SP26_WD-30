import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const AdminLoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const submit = async (e: any) => {
    e.preventDefault();
    const res = await axios.post("http://localhost:5000/api/auth/login", {
      email,
      password,
    });

    const { user, token } = res.data;

    if (user.role !== "admin") {
      alert("Không phải tài khoản admin");
      return;
    }

    localStorage.setItem("admin_token", token);
    navigate("/admin");
  };

  return (
    <form onSubmit={submit}>
      <h2>Admin Login</h2>
      <input placeholder="Email" onChange={e => setEmail(e.target.value)} />
      <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
      <button>Login</button>
    </form>
  );
};

export default AdminLoginPage;