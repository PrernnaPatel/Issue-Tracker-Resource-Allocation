import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Admin from "../models/Admin.model.js";
import connectDB from "../database/database.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load environment variables (works whether run from repo root or backend/)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const createAdmin = async () => {
  connectDB();

  /* const hashedPassword = await bcrypt.hash("abc123", 10); */

  const admin = new Admin({
    name: "Super Admin",
    email: "admin@gmail.com",
    password: "abc123",
  });

  await admin.save();
  console.log("Admin created");
  process.exit();
};

createAdmin();
