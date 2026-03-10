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
  type: "customer" | "guide" | "admin";
  isActive: boolean;
  createdAt?: string;
}

const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [mode, setMode] = useState<"add" | "edit" | "detail" | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
    type: "customer",
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
      type: "customer",
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
      type: user.type,
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
    await updateUser(user._id, {
      isActive: !user.isActive,
    });

    fetchUsers();
  };

  const formatDate = (date?: string) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("vi-VN");
  };

  const getRoleName = (type: string) => {
    if (type === "admin") return "Quản trị viên";
    if (type === "guide") return "Hướng dẫn viên";
    return "Khách hàng";
  };

  return (
    <div style={styles.container}>
      <h2>Quản lý Tài Khoản</h2>

      <button style={styles.btnAdd} onClick={openAdd}>
        + Thêm Tài Khoản
      </button>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Họ và Tên</th>
            <th style={styles.th}>Email</th>
            <th style={styles.th}>Ngày tham gia</th>
            <th style={styles.th}>Phân quyền</th>
            <th style={styles.th}>Trạng thái</th>
            <th style={styles.th}>Hành động</th>
          </tr>
        </thead>

        <tbody>
          {users.map((user) => (
            <tr key={user._id}>
              <td style={styles.td}>{user.name || "Chưa cập nhật"}</td>

              <td style={styles.td}>{user.email}</td>

              <td style={styles.td}>{formatDate(user.createdAt)}</td>

              <td style={styles.td}>{getRoleName(user.type)}</td>

              <td style={styles.td}>
                {user.isActive ? (
                  <span style={styles.statusActive}>Hoạt động</span>
                ) : (
                  <span style={styles.statusLock}>Đã khóa</span>
                )}
              </td>

              <td style={styles.td}>
                <button
                  style={styles.btnDetail}
                  onClick={() => openDetail(user)}
                >
                  Chi tiết
                </button>

                <button
                  style={styles.btnEdit}
                  onClick={() => openEdit(user)}
                >
                  Sửa
                </button>

                {user.isActive ? (
                  <button
                    style={styles.btnLock}
                    onClick={() => toggleStatus(user)}
                  >
                    Khóa
                  </button>
                ) : (
                  <button
                    style={styles.btnOpen}
                    onClick={() => toggleStatus(user)}
                  >
                    Mở
                  </button>
                )}

                <button
                  style={styles.btnDelete}
                  onClick={() => handleDelete(user._id)}
                >
                  🗑
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {mode && (
        <div style={styles.modal}>
          <div style={styles.modalBox}>
            {(mode === "add" || mode === "edit") && (
              <>
                <h3>{mode === "add" ? "Thêm tài khoản" : "Sửa tài khoản"}</h3>

                <input
                  style={styles.input}
                  placeholder="Họ và tên"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                />

                <input
                  style={styles.input}
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                />

                <input
                  type="password"
                  style={styles.input}
                  placeholder="Password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />

                <select
                  style={styles.input}
                  value={form.type}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value })
                  }
                >
                  <option value="admin">Quản trị viên</option>
                  <option value="guide">Hướng dẫn viên</option>
                  <option value="customer">Khách hàng</option>
                </select>

                <button
                  style={styles.btnSave}
                  onClick={mode === "add" ? handleAdd : handleUpdate}
                >
                  Lưu
                </button>

                <button
                  style={styles.btnCancel}
                  onClick={() => setMode(null)}
                >
                  Hủy
                </button>
              </>
            )}

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
                  <b>Loại tài khoản:</b> {getRoleName(selectedUser.type)}
                </p>

                <p>
                  <b>Trạng thái:</b>{" "}
                  {selectedUser.isActive ? "Hoạt động" : "Đã khóa"}
                </p>

                <button
                  style={styles.btnSave}
                  onClick={() => setMode(null)}
                >
                  Đóng
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const styles: any = {
  container: {
    padding: "30px",
    fontFamily: "Arial",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "20px",
  },

  th: {
    padding: "12px",
    borderBottom: "1px solid #ddd",
    textAlign: "left",
  },

  td: {
    padding: "12px",
    borderBottom: "1px solid #eee",
  },

  btnAdd: {
    background: "#1d72e8",
    color: "#fff",
    border: "none",
    padding: "10px 18px",
    borderRadius: "6px",
    cursor: "pointer",
  },

  btnDetail: {
    background: "#22c55e",
    color: "#fff",
    border: "none",
    padding: "6px 10px",
    marginRight: "5px",
    borderRadius: "5px",
    cursor: "pointer",
  },

  btnEdit: {
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    padding: "6px 10px",
    marginRight: "5px",
    borderRadius: "5px",
    cursor: "pointer",
  },

  btnLock: {
    border: "1px solid red",
    background: "#fff",
    color: "red",
    padding: "6px 10px",
    marginRight: "5px",
    borderRadius: "5px",
    cursor: "pointer",
  },

  btnOpen: {
    background: "#1d72e8",
    color: "#fff",
    border: "none",
    padding: "6px 10px",
    marginRight: "5px",
    borderRadius: "5px",
    cursor: "pointer",
  },

  btnDelete: {
    background: "transparent",
    border: "none",
    color: "red",
    fontSize: "18px",
    cursor: "pointer",
  },

  statusActive: {
    background: "#e6f7ec",
    color: "#16a34a",
    padding: "4px 10px",
    borderRadius: "5px",
  },

  statusLock: {
    background: "#fdecec",
    color: "#dc2626",
    padding: "4px 10px",
    borderRadius: "5px",
  },

  modal: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  modalBox: {
    background: "#fff",
    padding: "20px",
    borderRadius: "8px",
    width: "350px",
  },

  input: {
    width: "100%",
    padding: "8px",
    marginBottom: "10px",
    border: "1px solid #ddd",
    borderRadius: "5px",
  },

  btnSave: {
    background: "#22c55e",
    color: "#fff",
    border: "none",
    padding: "8px 14px",
    borderRadius: "5px",
    cursor: "pointer",
  },

  btnCancel: {
    background: "#ef4444",
    color: "#fff",
    border: "none",
    padding: "8px 14px",
    borderRadius: "5px",
    marginLeft: "10px",
    cursor: "pointer",
  },
};

export default UsersPage;