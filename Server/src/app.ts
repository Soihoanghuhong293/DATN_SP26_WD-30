import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

import { connectDB } from "./config/database";
import { AppError } from "./utils/AppError";

// Routes
import guideRouter from "./routes/guide.routes";
import tourRouter from "./routes/tourRoutes";
import categoryRoutes from "./routes/category.routes";
import authRoutes from "./routes/auth.route";
import providerRoutes from "./routes/provider.routes";
import bookingRouter from "./routes/bookingRoutes";
import userRoute from "./routes/user.route";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

/* ======================
   CONNECT DATABASE
====================== */
connectDB();

/* ======================
   MIDDLEWARE
====================== */
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

/* ======================
   TEST ROOT
====================== */
app.get("/", (req: Request, res: Response) => {
  res.send("API is running...");
});

/* ======================
   API ROUTES
====================== */
app.use("/api/v1/auth", authRoutes);

app.use("/api/v1/admin", userRoute); // 👈 QUẢN LÝ TÀI KHOẢN (ADMIN CRUD)

app.use("/api/v1/guides", guideRouter);
app.use("/api/v1/tours", tourRouter);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/providers", providerRoutes);
app.use("/api/v1/bookings", bookingRouter);

/* ======================
   HANDLE 404
====================== */
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

/* ======================
   GLOBAL ERROR HANDLER
====================== */
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
});

/* ======================
   START SERVER
====================== */
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;