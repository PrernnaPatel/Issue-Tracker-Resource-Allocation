import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["employee", "departmental-admin"],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

otpSchema.index({email:1,role:1},{unique:true});

export default mongoose.model("OTP", otpSchema);
