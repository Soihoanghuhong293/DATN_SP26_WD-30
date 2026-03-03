import express from "express";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/user.controller";

const router = express.Router();

router.get("/users", getUsers);
router.post("/users", createUser);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

export default router;