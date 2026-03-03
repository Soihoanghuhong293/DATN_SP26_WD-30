import mongoose from "mongoose";
import mysql from "mysql2/promise";

// ===== MongoDB =====
export const connectDB = async () => {
  try {
    const mongoURI =
      process.env.MONGO_URI || "mongodb://localhost:27017/tour-management";
    await mongoose.connect(mongoURI);
    console.log("✅ MongoDB Connected Successfully");
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error);
    process.exit(1);
  }
};

// ===== MySQL =====
export const pool = mysql.createPool({
  host: "127.0.0.1",
  user: "root",
  password: "",
  database: "tour_management",
});