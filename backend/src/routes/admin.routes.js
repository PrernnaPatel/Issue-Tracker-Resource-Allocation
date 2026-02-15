import express from "express";
import {
  adminLogin,
  addBuilding,
  createDepartmentalAdmin,
  getAllDepartmentalAdmin,
  updateDepartmentalAdmin,
  deleteDepartmentalAdmin,
  updateBuilding,
  getAvailableNetworkEngineerFloors,
  getDepartmentLocations,
  deleteBuilding,
  updateNetworkEngineerLocations,
  addComponentSet,
  getAllComponentSets,
  deleteComponentSet,
  editComponentSet,
  getLogs,
} from "../controller/admin.controller.js";
import {
  addDepartment,
  sendDepartment,
  updateDepartment,
  deleteDepartment,
} from "../controller/department.controller.js";
import { sendBuilding } from "../controller/employee.controller.js";
import { getAllTickets,getAttachment } from "../controller/ticket.controller.js";
import {
  getAllEmployees,
  getEmployeeDetails,
} from "../controller/employee.controller.js";
import { exportTicketReport,exportTicketReportExcel } from "../controller/exportReport.controller.js";
import adminAuthMiddleware from "../middleware/adminAuth.middleware.js";

const router = express.Router();

router.post("/login", adminLogin);
router.post("/add-department", adminAuthMiddleware, addDepartment);
router.get("/get-departments", adminAuthMiddleware, sendDepartment);
router.put("/update-department/:deptId", adminAuthMiddleware, updateDepartment);
router.put("/delete-department/:deptId", adminAuthMiddleware, deleteDepartment);
router.get("/get-all-tickets", adminAuthMiddleware, getAllTickets);
router.get("/get-all-employees", adminAuthMiddleware, getAllEmployees);
router.get(
  "/get-employee-details/:empId",
  adminAuthMiddleware,
  getEmployeeDetails
);
router.get("/export-report-pdf", adminAuthMiddleware, exportTicketReport);
router.get("/export-report-excel", adminAuthMiddleware, exportTicketReportExcel);
router.post("/add-building", adminAuthMiddleware, addBuilding);
router.put("/update-building/:id", adminAuthMiddleware, updateBuilding);
router.put("/delete-building/:buildId", adminAuthMiddleware, deleteBuilding);
router.get("/all-buildings", adminAuthMiddleware, sendBuilding);
router.post("/create-departmental-admin", adminAuthMiddleware, createDepartmentalAdmin);
router.put("/update-departmental-admin/:id", adminAuthMiddleware, updateDepartmentalAdmin);
router.delete("/delete-departmental-admin/:id", adminAuthMiddleware, deleteDepartmentalAdmin);
router.get("/available-network-engineer-floors", adminAuthMiddleware, getAvailableNetworkEngineerFloors);
router.get("/department-locations/:departmentId", adminAuthMiddleware, getDepartmentLocations);
router.get("/get-departmental-admins", adminAuthMiddleware, getAllDepartmentalAdmin);
router.get("/get-attachment/:filename", adminAuthMiddleware, getAttachment);
router.put(
  "/update-network-locations/:id",
  adminAuthMiddleware, 
  updateNetworkEngineerLocations
);
router.post("/add-componentset", adminAuthMiddleware, addComponentSet);
router.get("/get-componentset", adminAuthMiddleware, getAllComponentSets);
router.delete("/delete-componentset/:id", adminAuthMiddleware, deleteComponentSet);
router.put("/edit-componentset/:id", adminAuthMiddleware, editComponentSet);
router.get("/logs", adminAuthMiddleware, getLogs);

export default router;
