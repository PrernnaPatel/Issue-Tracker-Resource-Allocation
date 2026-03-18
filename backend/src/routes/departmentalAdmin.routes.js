import express from "express";
import {
  deptAdminLoginRequestOtp,
  deptAdminVerifyOtpAndLogin,
  changePassword,
  changePasswordWithCurrent,
  getDepartmentTickets,
  updateTicketStatus,
  assignTicketToEngineer,
  getLoggedInDepartmentalAdmin,
  getNetworkEngineersForDeptAdmin,
  addInventorySystem,
  getAllInventorySystems,
  updateInventorySystem,
  bulkUpdateInventoryLocation,
  deleteInventorySystem,
} from "../controller/deptAdmin.controller.js";
import {
  getAttachment,
  markTicketAsViewed,
  getUnreadTicketUpdates,
  markAllTicketsAsViewed,
} from "../controller/ticket.controller.js";
import { getAllComponentSets } from "../controller/admin.controller.js";
import { sendBuilding } from "../controller/employee.controller.js";
import {
  exportDepartmentalReport,
  exportDeptAdminTicketReportExcel,
  exportInventoryExcel,
} from "../controller/exportReport.controller.js";
import deptAdminAuthMiddleware from "../middleware/deptAdminAuth.middleware.js";
import upload from "../middleware/multer.middleware.js";
import { fileUpload } from "../middleware/multerFile.js";

const router = express.Router();

router.post("/login-request", deptAdminLoginRequestOtp);
router.post("/verify-otp", deptAdminVerifyOtpAndLogin);
router.post("/change-password", deptAdminAuthMiddleware, changePassword);
router.post("/change-password-current", deptAdminAuthMiddleware, changePasswordWithCurrent);
router.get("/my-data", deptAdminAuthMiddleware, getLoggedInDepartmentalAdmin);
router.get(
  "/network-engineers",
  deptAdminAuthMiddleware,
  getNetworkEngineersForDeptAdmin
);
router.get("/get-tickets", deptAdminAuthMiddleware, getDepartmentTickets);
router.get("/get-attachment/:filename", deptAdminAuthMiddleware, getAttachment);
router.put(
  "/update-ticket/:ticketId",
  deptAdminAuthMiddleware,
  fileUpload.single("attachment"),
  updateTicketStatus
);
router.post(
  "/assign-ticket/:ticketId",
  deptAdminAuthMiddleware,
  assignTicketToEngineer
);
router.get("/export-pdf", deptAdminAuthMiddleware, exportDepartmentalReport);
router.get(
  "/export-excel",
  deptAdminAuthMiddleware,
  exportDeptAdminTicketReportExcel
);
router.get(
  "/export-inventory-excel",
  deptAdminAuthMiddleware,
  exportInventoryExcel
);
router.patch(
  "/mark-viewed/:ticketId",
  deptAdminAuthMiddleware,
  markTicketAsViewed
);
router.post("/mark-all-viewed", deptAdminAuthMiddleware, markAllTicketsAsViewed);
router.get("/unread-updates", deptAdminAuthMiddleware, getUnreadTicketUpdates);
router.get("/get-componentset", deptAdminAuthMiddleware, getAllComponentSets);
router.get("/all-buildings", deptAdminAuthMiddleware, sendBuilding);
router.post("/add-inventory", deptAdminAuthMiddleware, addInventorySystem);
router.get("/get-inventory", deptAdminAuthMiddleware, getAllInventorySystems);
router.put(
  "/update-inventory/:id",
  deptAdminAuthMiddleware,
  updateInventorySystem
);
router.post(
  "/bulk-update-location",
  deptAdminAuthMiddleware,
  bulkUpdateInventoryLocation,
);
router.post(
  "/delete-system",
  deptAdminAuthMiddleware,
  deleteInventorySystem,
);

export default router;
