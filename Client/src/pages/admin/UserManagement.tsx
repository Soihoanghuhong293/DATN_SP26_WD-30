import React, { useEffect, useState } from "react";
import { getAllUsers, updateUser, deleteUser } from "../../services/user.service";

interface User {
  _id: string;
  email: string;
  role: string;
}

const styles: any = {
  container: { padding: "20px" },

  table: {
    borderCollapse: "collapse",
    width: "800px",
    marginTop: "20px",
  },

  th: {
    border: "1px solid #ddd",
    padding: "12px",
    background: "#f3f4f6",
  },

  td: {
    border: "1px solid #ddd",
    padding: "12px",
  },

  btnDetail: {
    background: "#10b981",
    color: "#fff",
    border: "none",
    padding: "6px 12px",
    marginRight: "8px",
    borderRadius: "6px",
    cursor: "pointer",
  },

  btnEdit: {
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    padding: "6px 12px",
    marginRight: "8px",
    borderRadius: "6px",
    cursor: "pointer",
  },

  btnDelete: {
    background: "#ef4444",
    color: "#fff",
    border: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    cursor: "pointer",
  },

  modal: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  },

  btnSave: {
    background: "#22c55e",
    color: "#fff",
    border: "none",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer",
  },
};

const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");

  const [mode, setMode] = useState<"detail" | "edit" | null>(null);

  const fetchUsers = async () => {
    const data = await getAllUsers();
    setUsers(data);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openDetail = (user: User) => {
    setSelectedUser(user);
    setMode("detail");
  };

  const openEdit = (user: User) => {
    setSelectedUser(user);
    setEmail(user.email);
    setRole(user.role);
    setPassword("");
    setMode("edit");
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;

    await updateUser(selectedUser._id, {
      email,
      password,
      role,
    });

    setSelectedUser(null);
    setMode(null);
    fetchUsers();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Bạn có chắc muốn xóa tài khoản này?")) {
      await deleteUser(id);
      fetchUsers();
    }
  };

  return (
    <div style={styles.container}>
      <h2>Quản lý tài khoản</h2>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Email</th>
            <th style={styles.th}>Role</th>
            <th style={styles.th}>Hành động</th>
          </tr>
        </thead>

        <tbody>
          {users.map((user) => (
            <tr key={user._id}>
              <td style={styles.td}>{user.email}</td>
              <td style={styles.td}>{user.role}</td>

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

                <button
                  style={styles.btnDelete}
                  onClick={() => handleDelete(user._id)}
                >
                  Xóa
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedUser && mode === "detail" && (
        <div style={styles.modal}>
          <div style={styles.modalBox}>
            <h3>Chi tiết tài khoản</h3>

            <p>
              <b>Email:</b> {selectedUser.email}
            </p>

            <p>
              <b>Role:</b> {selectedUser.role}
            </p>

            <button
              style={styles.btnSave}
              onClick={() => {
                setSelectedUser(null);
                setMode(null);
              }}
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {selectedUser && mode === "edit" && (
        <div style={styles.modal}>
          <div style={styles.modalBox}>
            <h3>Sửa tài khoản</h3>

            <label>Email</label>
            <input
              style={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label>Password</label>
            <input
              type="password"
              style={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <label>Role</label>
            <select
              style={styles.input}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>

            <button style={styles.btnSave} onClick={handleUpdate}>
              Lưu thay đổi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;