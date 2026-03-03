import React, { useEffect, useState } from "react";
import { getAllUsers } from "../../services/user.service";

interface User {
  _id: string;
  email: string;
  role: string;
}

const styles: {
  container: React.CSSProperties;
  table: React.CSSProperties;
  th: React.CSSProperties;
  td: React.CSSProperties;
  btnDelete: React.CSSProperties;
  btnEdit: React.CSSProperties;
  roleAdmin: React.CSSProperties;
  roleUser: React.CSSProperties;
} = {
  container: {
    padding: "20px",
  },
  table: {
    borderCollapse: "collapse",
    width: "700px",
    marginTop: "20px",
  },
  th: {
    border: "1px solid #ddd",
    padding: "12px",
    background: "#f3f4f6",
    textAlign: "left",
    fontWeight: 600,
  },
  td: {
    border: "1px solid #ddd",
    padding: "12px",
  },
  btnDelete: {
    background: "#ef4444",
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
    borderRadius: "6px",
    cursor: "pointer",
  },
  roleAdmin: {
    color: "#dc2626",
    fontWeight: 600,
  },
  roleUser: {
    color: "#16a34a",
    fontWeight: 600,
  },
};

const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await getAllUsers();
        setUsers(data);
      } catch (error) {
        console.error("Lỗi lấy users:", error);
      }
    };

    fetchUsers();
  }, []);

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
              <td
                style={
                  user.role === "admin"
                    ? styles.roleAdmin
                    : styles.roleUser
                }
              >
                {user.role}
              </td>
              <td style={styles.td}>
                <button style={styles.btnDelete}>Xóa</button>
                <button style={styles.btnEdit}>Sửa</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UsersPage;