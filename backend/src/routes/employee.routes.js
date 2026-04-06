import express from "express";
import {
  registerEmployee,
  loginRequestOtp,
  verifyOtpAndLogin,
  requestPasswordWithOtp,
  resetPasswordWithOtp,
  changePassword,
  getMyProfile,
  updateMyProfile,
  sendBuilding,
} from "../controller/employee.controller.js";
import {
  raiseTicket,
  getMyTickets,
  updateMyTicket,
  filterMyTickets,
  revokeTicket,
  commentOnMyTicket,
  getAttachment,
} from "../controller/ticket.controller.js";
import { getEmployeeTicketOptions } from "../controller/ticketOption.controller.js";
import { sendDepartment } from "../controller/department.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import upload from "../middleware/multer.middleware.js";
import { fileUpload } from "../middleware/multerFile.js";

const router = express.Router();

router.post("/register", registerEmployee);
router.post("/login-request", loginRequestOtp);
router.post("/verify-login", verifyOtpAndLogin);
router.post("/forgot-pass-request", requestPasswordWithOtp);
router.post("/verify-forgot-pass-otp", resetPasswordWithOtp);
router.post("/change-password", authMiddleware, changePassword);
router.post(
  "/raise-ticket",
  authMiddleware,
  fileUpload.single("attachment"),
  raiseTicket
);
router.get("/my-tickets", authMiddleware, getMyTickets);
router.get("/filter-tickets", authMiddleware, filterMyTickets);
router.get("/ticket-options", authMiddleware, getEmployeeTicketOptions);
router.get("/all-departments", sendDepartment);
router.put(
  "/update-ticket/:ticketId",
  authMiddleware,
  fileUpload.single("attachment"),
  updateMyTicket
);
router.put("/revoke-ticket/:ticketId", authMiddleware, revokeTicket);
router.put(
  "/comment-ticket/:ticketId",
  authMiddleware,
  fileUpload.single("attachment"),
  commentOnMyTicket
);
router.get("/get-attachment/:filename", authMiddleware, getAttachment);
router.get("/get-profile", authMiddleware, getMyProfile);
router.get("/all-buildings", sendBuilding);
router.post(
  "/update-profile",
  authMiddleware,
  upload.single("image"),
  updateMyProfile
);

export default router;
