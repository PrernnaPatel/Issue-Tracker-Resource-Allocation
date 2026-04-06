import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  securityPin: {
    type: String,
    required: true,
  },
});

adminSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }

  if (this.isModified("securityPin")) {
    this.securityPin = await bcrypt.hash(this.securityPin, 10);
  }

  next();
});

export default mongoose.model("Admin",adminSchema)
