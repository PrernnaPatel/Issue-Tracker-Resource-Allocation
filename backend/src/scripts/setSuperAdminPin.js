import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Admin from "../models/Admin.model.js";
import connectDB from "../database/database.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const DEFAULT_SUPER_ADMIN_EMAIL = "admin@gmail.com";
const DEFAULT_SUPER_ADMIN_PASSWORD = "abc123";
const DEFAULT_SUPER_ADMIN_PIN = "123456";

const setSuperAdminPin = async () => {
  await connectDB();

  const admin = await Admin.findOne({ email: DEFAULT_SUPER_ADMIN_EMAIL });
  if (!admin) {
    console.error(`Super admin not found for ${DEFAULT_SUPER_ADMIN_EMAIL}`);
    process.exit(1);
  }

  admin.password = DEFAULT_SUPER_ADMIN_PASSWORD;
  admin.securityPin = DEFAULT_SUPER_ADMIN_PIN;
  await admin.save();

  console.log(
    `Credentials updated for ${DEFAULT_SUPER_ADMIN_EMAIL}. Password: ${DEFAULT_SUPER_ADMIN_PASSWORD}, PIN: ${DEFAULT_SUPER_ADMIN_PIN}`
  );
  process.exit(0);
};

setSuperAdminPin().catch((error) => {
  console.error("Failed to update super admin pin:", error);
  process.exit(1);
});
