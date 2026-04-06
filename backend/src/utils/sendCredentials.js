import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const otpDeliveryMode = (process.env.OTP_DELIVERY || "email").toLowerCase();

const shouldPrintOtp = otpDeliveryMode === "console" || otpDeliveryMode === "both";
const shouldSendEmail = otpDeliveryMode === "email" || otpDeliveryMode === "both";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendCredentialsEmail = async ({
  name,
  email,
  tempPassword,
  tempSecurityPin,
  departmentName,
}) => {
  await transporter.sendMail({
    from: `"Issue Tracker Team" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your Departmental Admin Login Credentials",
    html: `
    <p>Hello ${name},</p>
      <p>You have been registered as a Departmental Admin for the <b>${departmentName.name}</b> department.</p>
      <p><strong>Your temporary login credentials are:</strong></p>
      <ul>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Temporary Password:</strong> ${tempPassword}</li>
        <li><strong>Temporary 6-digit Security PIN:</strong> ${tempSecurityPin}</li>
      </ul>
      <p>On first login, you will be required to change both your password and your 6-digit security PIN.</p>
      <p>Do not share these credentials with anyone.</p>
      <p>— Issue Tracker Team</p>
  `,
  });
  console.log("Credentials eMail sent to ",email);
};

export const sendOtpOnce = async (email, otp) => {
  if (shouldPrintOtp) {
    console.log(`[OTP:FIRST_LOGIN] email=${email} otp=${otp}`);
  }

  if (!shouldSendEmail) {
    return;
  }

  await transporter.sendMail({
    from: `"Issue Tracker Team" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your Login OTP",
    text: `Your OTP is ${otp}.`,
    html: `
    <p>Hello,</p>
    <p>We received a login request for your Issue Tracker account.</p>
    <p>Your OTP is: <b>${otp}</b></p>
    <p>This OTP is valid for 5 minutes only. Do not share it with anyone.</p>
    <p>If you didn't request this, you can ignore this message.</p>
    <p>— Issue Tracker Team</p>
  `,
  });
  console.log("Mail sent");
};
