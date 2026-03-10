import React, { useEffect, useState } from "react";
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../../services/user.service";

interface User {
  _id: string;
  name?: string;
  email: string;
  role: string;
  status?: string;
  createdAt?: string;
}

const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [mode, setMode] = useState<"add" | "edit" | "detail" | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
  });

  const fetchUsers = async () => {
    const data = await getAllUsers();
    setUsers(data);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openAdd = () => {
    setForm({
      name: "",
      email: "",
      password: "",
      role: "user",
    });
    setMode("add");
  };

  const openEdit = (user: User) => {
    setSelectedUser(user);

    setForm({
      name: user.name || "",
      email: user.email,
      password: "",
      role: user.role,
    });

    setMode("edit");
  };

  const openDetail = (user: User) => {
    setSelectedUser(user);
    setMode("detail");
  };

  const handleAdd = async () => {
    await createUser(form);
    setMode(null);
    fetchUsers();
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;

    await updateUser(selectedUser._id, form);
    setMode(null);
    fetchUsers();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Bạn chắc chắn muốn xóa?")) {
      await deleteUser(id);
      fetchUsers();
    }
  };

  const toggleStatus = async (user: User) => {
    const newStatus = user.status === "locked" ? "active" : "locked";

    await updateUser(user._id, { status: newStatus });
    fetchUsers();
  };

  const formatDate = (date?: string) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("vi-VN");
  };

  return (
    <div style={{ padding: "30px", fontFamily: "Arial" }}>
      <h2>Quản lý Tài Khoản</h2>

      <button
        onClick={openAdd}
        style={{
          background: "#3b82f6",
          color: "#fff",
          padding: "10px 16px",
          borderRadius: "6px",
          border: "none",
          marginBottom: "20px",
          cursor: "pointer",
        }}
      >
        + Thêm Tài Khoản
      </button>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
        }}
      >
        <thead>
          <tr style={{ background: "#f3f4f6" }}>
            <th style={th}>Họ và Tên</th>
            <th style={th}>Email</th>
            <th style={th}>Ngày tham gia</th>
            <th style={th}>Phân quyền</th>
            <th style={th}>Trạng thái</th>
            <th style={th}>Hành động</th>
          </tr>
        </thead>

        <tbody>
          {users.map((user) => (
            <tr key={user._id}>
              <td style={td}>{user.name || "Chưa cập nhật"}</td>

              <td style={td}>{user.email}</td>

              <td style={td}>{formatDate(user.createdAt)}</td>

              <td style={td}>
                {user.role === "admin"
                  ? "Quản trị viên"
                  : user.role === "guide"
                  ? "Hướng dẫn viên"
                  : "Khách hàng"}
              </td>

              <td style={td}>
                {user.status === "locked" ? (
                  <span style={statusLock}>Đã khóa</span>
                ) : (
                  <span style={statusActive}>Hoạt động</span>
                )}
              </td>

              <td style={td}>
                <button style={btnDetail} onClick={() => openDetail(user)}>
                  Chi tiết
                </button>

                <button style={btnEdit} onClick={() => openEdit(user)}>
                  Sửa
                </button>

                <button
                  style={btnLock}
                  onClick={() => toggleStatus(user)}
                >
                  {user.status === "locked" ? "Mở" : "Khóa"}
                </button>

                <button
                  style={btnDelete}
                  onClick={() => handleDelete(user._id)}
                >
                  Xóa
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* MODAL */}
      {mode && (
        <div style={modal}>
          <div style={modalBox}>
            {mode === "detail" && selectedUser && (
              <>
                <h3>Chi tiết tài khoản</h3>

                <p>
                  <b>Họ tên:</b> {selectedUser.name}
                </p>

                <p>
                  <b>Email:</b> {selectedUser.email}
                </p>

                <p>
                  <b>Role:</b> {selectedUser.role}
                </p>

                <button style={btnSave} onClick={() => setMode(null)}>
                  Đóng
                </button>
              </>
            )}

            {(mode === "add" || mode === "edit") && (
              <>
                <h3>{mode === "add" ? "Thêm tài khoản" : "Sửa tài khoản"}</h3>

                <input
                  style={input}
                  placeholder="Họ và tên"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                />

                <input
                  style={input}
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                />

                <input
                  style={input}
                  placeholder="Password"
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />

                <select
                  style={input}
                  value={form.role}
                  onChange={(e) =>
                    setForm({ ...form, role: e.target.value })
                  }
                >
                  <option value="admin">Quản trị viên</option>
                  <option value="guide">Hướng dẫn viên</option>
                  <option value="user">Khách hàng</option>
                </select>

                <button
                  style={btnSave}
                  onClick={mode === "add" ? handleAdd : handleUpdate}
                >
                  Lưu
                </button>

                <button
                  style={{ ...btnDelete, marginLeft: "10px" }}
                  onClick={() => setMode(null)}
                >
                  Hủy
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const th = {
  padding: "12px",
  borderBottom: "1px solid #ddd",
};

const td = {
  padding: "12px",
  borderBottom: "1px solid #eee",
};

const btnDetail = {
  background: "#10b981",
  color: "#fff",
  border: "none",
  padding: "6px 10px",
  marginRight: "6px",
  borderRadius: "6px",
  cursor: "pointer",
};

const btnEdit = {
  background: "#3b82f6",
  color: "#fff",
  border: "none",
  padding: "6px 10px",
  marginRight: "6px",
  borderRadius: "6px",
  cursor: "pointer",
};

const btnLock = {
  background: "#f59e0b",
  color: "#fff",
  border: "none",
  padding: "6px 10px",
  marginRight: "6px",
  borderRadius: "6px",
  cursor: "pointer",
};

const btnDelete = {
  background: "#ef4444",
  color: "#fff",
  border: "none",
  padding: "6px 10px",
  borderRadius: "6px",
  cursor: "pointer",
};

const btnSave = {
  background: "#22c55e",
  color: "#fff",
  border: "none",
  padding: "8px 14px",
  borderRadius: "6px",
  cursor: "pointer",
  marginTop: "10px",
};

const modal = {
  position: "fixed" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const modalBox = {
  background: "#fff",
  padding: "20px",
  borderRadius: "8px",
  width: "350px",
};

const input = {
  width: "100%",
  padding: "8px",
  marginBottom: "10px",
};

const statusActive = {
  background: "#dcfce7",
  color: "#16a34a",
  padding: "4px 10px",
  borderRadius: "6px",
};

const statusLock = {
  background: "#fee2e2",
  color: "#dc2626",
  padding: "4px 10px",
  borderRadius: "6px",
};

export default UsersPage;