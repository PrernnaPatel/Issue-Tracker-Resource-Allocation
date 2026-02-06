import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const now=new Date()
const midnight=new Date(now)
midnight.setHours(24,0,0,0)
const formattedMidnight=midnight.toLocaleString("en-IN",{
  day:"numeric",
  month:"long",
  year:"numeric",
  hour:"numeric",
  minute:"2-digit",
  hour12:true,
})

export const sendOtp = async (email, otp) => {
  await transporter.sendMail({
    from: `"Issue Tracker Team" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your Login OTP",
    text: `Your OTP is ${otp}.`,
    html: `
    <p>Hello,</p>
    <p>We received a login request for your Issue Tracker account.</p>
    <p>Your OTP is: <b>${otp}</b></p>
    <p>This OTP is valid till ${formattedMidnight}. Do not share it with anyone.</p>
    <p>If you didn't request this, you can ignore this message.</p>
    <p>— Issue Tracker Team</p>
  `,
  });
  console.log("Mail sent");
};

export const forgotPassOtp = async (email, otp) => {
  await transporter.sendMail({
    from: `"Issue Tracker Team" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your Forgot Password OTP",
    text: `Your OTP is ${otp}. It is valid for 10 minutes.`,
    html: `
    <p>Hello,</p>
    <p>We received a Reset Password request for your Issue Tracker account.</p>
    <p>Your OTP is: <b>${otp}</b></p>
    <p>This OTP is valid 10 mins. Do not share it with anyone.</p>
    <p>If you didn't request this, you can ignore this message.</p>
    <p>— Issue Tracker Team</p>
  `,
  });
  console.log("Forgot password Mail sent");
};