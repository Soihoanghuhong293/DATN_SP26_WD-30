import { Request, Response } from "express";
import User from "../models/user.model";

// GET ALL USERS
export const getUsers = async (_req: Request, res: Response) => {
  const users = await User.find().select("-password");
  res.json(users);
};

// CREATE USER (ADMIN)
export const createUser = async (req: Request, res: Response) => {
  const user = await User.create(req.body);
  res.json(user);
};

// UPDATE USER
export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await User.findByIdAndUpdate(
    id,
    {
      ...req.body,
    },
    { new: true }
  );

  res.json(user);
};

// DELETE USER
export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  await User.findByIdAndDelete(id);
  res.json({ message: "Deleted" });
};