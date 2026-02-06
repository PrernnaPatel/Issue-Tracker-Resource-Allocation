import DepartmentalAdmin from "../models/DepartmentalAdmin.model.js";
import OTP from "../models/Otp.model.js";
import bcrypt from "bcryptjs";
import moment from "moment-timezone";
import { sendOtpOnce } from "../utils/sendCredentials.js";
import { sendOtp } from "../utils/sendOtp.js";
import Department from "../models/Department.model.js";
import OtpAttempt from "../models/OtpAttempt.model.js";
import jwt from "jsonwebtoken";
import Ticket from "../models/Ticket.model.js";
import Employee from "../models/Employee.js";
import InventorySystem from "../models/InventorySystem.model.js";
import { Building } from "../models/Building.model.js";
import { updateBuilding } from "./admin.controller.js";
import { logAction } from "../utils/logAction.js";

export const deptAdminLoginRequestOtp = async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await DepartmentalAdmin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ message: "Departmental admin not found." });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid Credentials." });
    }
    await logAction({
      action: "FAILED_LOGIN",
      performedBy: null,
      description: `Failed login attempt with email "${email}" (invalid password).`,
    });
    const nowIST = moment().tz("Asia/Kolkata");
    const todayDateIST = nowIST.format("YYYY-MM-DD");

    //If first time login
    if (admin.isFirstLogin) {
      await OTP.deleteMany({ email, role: "departmental-admin" });
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await OTP.create({
        email,
        otp,
        role: "departmental-admin",
        createdAt: nowIST.toDate(),
      });
      await sendOtpOnce(email, otp);
      return res.status(200).json({
        message: "First-time Login. OTP sent to your email.",
        isFirstLogin: true,
      });
    }

    //Not first Login

    const existingOtp = await OTP.findOne({ email });

    if (existingOtp) {
      const otpCreatedDate = moment(existingOtp.createdAt)
        .tz("Asia/Kolkata")
        .format("YYYY-MM-DD");

      if (otpCreatedDate === todayDateIST) {
        // Reuse today's OTP
        return res.status(200).json({
          message: "Use the OTP sent to your mail",
        });
      } else {
        // Delete old OTP
        await OTP.deleteOne({ email });
      }
    }

    // Generate and save new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.create({
      email,
      otp,
      role: "departmental-admin",
      createdAt: nowIST.toDate(),
    });

    // Send OTP via email
    await sendOtp(email, otp);
    await logAction({
      action: "LOGIN_OTP_REQUEST",
      performedBy: admin._id,
      description: `OTP login requested by departmental admin (${email}).`,
    });
    return res.status(200).json({
      message: "OTP sent to your email",
      isFirstLogin: false,
    });
  } catch (e) {
    console.error("Dept admin OTP login error:", e);
    return res
      .status(500)
      .json({ message: "Login OTP request failed", error: e.message });
  }
};

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MIN = 15;

const checkOtpRateLimit = async (email) => {
  const now = new Date();
  let attempt = await OtpAttempt.findOne({ email });

  if (!attempt) {
    return await OtpAttempt.create({ email });
  }

  if (attempt.lockedUntil && now < attempt.lockedUntil) {
    throw new Error(`Too many attempts.Try again after ${attempt.lockedUntil}`);
  }

  const timeSinceLast = (now - attempt.lastAttemptAt) / 60000;
  if (timeSinceLast > LOCK_DURATION_MIN) {
    attempt.attempts = 1;
  } else {
    attempt.attempts += 1;
  }

  attempt.lastAttemptAt = now;

  if (attempt.attempts > MAX_ATTEMPTS) {
    attempt.lockedUntil = new Date(now.getTime() + LOCK_DURATION_MIN * 60000);
    await OTP.deleteOne({ email });
  }

  await logAction({
    action: "OTP_LOCKOUT",
    performedBy: null,
    description: `OTP locked for ${email} due to exceeding max attempts. Locked until ${attempt.lockedUntil}`,
  });

  await attempt.save();
  if (attempt.lockedUntil && now < attempt.lockedUntil) {
    throw new Error(`Too many attempts.Try again after ${attempt.lockedUntil}`);
  }
};

//Verify OTP and login
export const deptAdminVerifyOtpAndLogin = async (req, res) => {
  const { email, otp } = req.body;

  try {
    // 1. Rate limit check
    await checkOtpRateLimit(email);

    // 2. Find the OTP generated today
    const startOfDay = moment().startOf("day").toDate();
    const endOfDay = moment().endOf("day").toDate();

    const record = await OTP.findOne({
      email,
      role: "departmental-admin",
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    if (!record || record.otp !== otp) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // 3. Fetch admin in one call and check existence
    const admin = await DepartmentalAdmin.findOne({ email }).populate(
      "department"
    );
    if (!admin) {
      return res.status(404).json({ message: "Departmental admin not found" });
    }

    // 4. If it's first login, check OTP expiry (5 min)
    if (admin.isFirstLogin) {
      const otpCreated = moment(record.createdAt);
      const now = moment();
      const diffInMinutes = now.diff(otpCreated, "minutes");

      if (diffInMinutes > 5) {
        await OTP.deleteMany({ email }); // Clean up expired OTPs
        return res
          .status(400)
          .json({ message: "OTP expired. Please request a new one." });
      }

      // Clean up OTP after first login
      await OTP.deleteMany({ email });
    }

    // 5. Generate token (valid until midnight IST)
    const now = moment().tz("Asia/Kolkata");
    const midnight = moment().tz("Asia/Kolkata").endOf("day");
    const secondsUntilMidnight = midnight.diff(now, "seconds");

    const token = jwt.sign(
      {
        id: admin._id,
        department: admin.department.name,
        email: admin.email,
        role: "departmental-admin",
        isFirstLogin: admin.isFirstLogin,
      },
      process.env.JWT_SECRET,
      { expiresIn: secondsUntilMidnight }
    );

    // 6. Clear failed OTP attempts after successful login
    await OtpAttempt.deleteOne({ email });

    await logAction({
      action: "LOGIN_SUCCESS",
      performedBy: admin._id,
      description: `Departmental Admin (${admin.email}) logged in successfully via OTP.`,
    });

    // 7. Respond with token and user details
    return res.status(200).json({
      message: "OTP verified, login successful",
      token,
      admin: {
        name: admin.name,
        email: admin.email,
        department: admin.department.name,
        isFirstLogin: admin.isFirstLogin,
      },
    });
  } catch (e) {
    console.error("OTP verification error:", e);
    return res.status(500).json({
      message: "OTP verification failed",
      error: e.message,
    });
  }
};

export const changePassword = async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    const admin = await DepartmentalAdmin.findOne({ email });
    if (!admin || !admin.isFirstLogin) {
      return res.status(404).json({ message: "Departmental Admin not found." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    admin.password = hashedPassword;
    admin.isFirstLogin = false;
    await admin.save();

    await logAction({
      action: "PASSWORD_CHANGED",
      performedBy: admin._id,
      description: `Departmental Admin (${admin.email}) changed password after first login.`,
    });

    return res.status(200).json({
      message: "Password updated successfully. Please Login again.    ",
    });
  } catch (e) {
    return res.status(500).json({
      message: "Failed to change password",
      error: e.message,
    });
  }
};

export const getLoggedInDepartmentalAdmin = async (req, res) => {
  try {
    const adminId = req.user.id;

    const admin = await DepartmentalAdmin.findById(adminId)
      .populate("department", "name description")
      .populate("locations.building", "name code") // for network engineer
      .select("-password");

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const isNetworkEngineer =
      admin.department?.name.toLowerCase() === "network engineer";

    const response = {
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      department: admin.department,
      isNetworkEngineer,
      ...(isNetworkEngineer && {
        locations: admin.locations.map((loc) => ({
          building: loc.building,
          floor: loc.floor,
          labs: loc.labs,
        })),
      }),
    };

    await logAction({
      action: "FETCH_PROFILE",
      performedBy: admin._id,
      description: `Departmental Admin (${admin.email}) fetched their own profile.`,
    });

    res.status(200).json({
      message: "Logged-in departmental admin fetched successfully.",
      admin: response,
    });
  } catch (err) {
    console.error("Error fetching logged-in departmental admin:", err);
    res.status(500).json({
      message: "Server error fetching admin data.",
      error: err.message,
    });
  }
};

//Fetch the tickets for each department
export const getDepartmentTickets = async (req, res) => {
  try {
    const { department: departmentName, role, id } = req.user;
    const department = await Department.findOne({ name: departmentName });
    if (!department) {
      return res.status(404).json({ message: "Department not found." });
    }

    let query = { to_department: department._id };

    // Special logic for network engineers with locations
    if (
      departmentName.toLowerCase() === "network engineer" &&
      role === "departmental-admin"
    ) {
      const engineer = await DepartmentalAdmin.findById(id);
      if (
        !engineer ||
        !Array.isArray(engineer.locations) ||
        engineer.locations.length === 0
      ) {
        return res
          .status(400)
          .json({ message: "Network Engineer locations not assigned." });
      }

      // Build OR conditions for all assigned locations
      const locationFilters = engineer.locations.map((loc) => ({
        building: loc.building,
        floor: loc.floor,
        lab_no: { $in: loc.labs },
      }));

      // Find employees who match any assigned location
      const matchingEmployees = await Employee.find({
        $or: locationFilters,
      }).select("_id");

      const employeeIds = matchingEmployees.map((emp) => emp._id);
      query.raised_by = { $in: employeeIds };
    }
    const tickets = await Ticket.find(query)
      .populate("raised_by", "name email building floor lab")
      .populate("to_department", "name");

    await logAction({
      action: "VIEW_TICKETS",
      performedBy: req.user.id,
      description: `Fetched tickets for department ${departmentName}.`,
    });

    return res.status(200).json({ tickets });
  } catch (error) {
    console.error("Error fetching departmental tickets:", error);
    return res.status(500).json({
      message: "Failed to fetch tickets",
      error: error.message,
    });
  }
};

//Update Ticket status
export const updateTicketStatus = async (req, res) => {
  const { ticketId } = req.params;
  const { status, comment } = req.body;
  const { department: adminDeptName, role, id: adminId } = req.user;
  const attachmentPath = req.file ? req.file.filename : "";

  if (role !== "departmental-admin") {
    return res.status(403).json({ message: "Unauthorized access." });
  }

  try {
    const ticket = await Ticket.findById(ticketId).populate(
      "to_department raised_by"
    );

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    if (ticket.to_department?.name !== adminDeptName) {
      return res.status(403).json({
        message: `This ticket does not belong to your department ${adminDeptName}.`,
      });
    }

    const currentStatus = ticket.status;

    if (currentStatus === "revoked") {
      return res.status(400).json({
        message: `Cannot modify a 'revoked' ticket.`,
      });
    }

    const allowedTransitions = {
      pending: ["in_progress", "revoked"],
      in_progress: ["resolved", "revoked"],
    };

    let statusChanged = false;

    if (status) {
      if (
        currentStatus !== "resolved" &&
        !allowedTransitions[currentStatus]?.includes(status)
      ) {
        return res.status(400).json({
          message: `Invalid status transition from '${currentStatus}' to '${status}'.`,
        });
      }

      if (status === "in_progress") {
        if (!ticket.assigned_to) {
          ticket.assigned_to = adminId; // Assign current admin
        } else if (ticket.assigned_to.toString() !== adminId) {
          return res.status(403).json({
            message: "Only the assigned admin can update this ticket.",
          });
        }
      } else {
        // For resolved or revoked, only assigned admin can change status
        if (ticket.assigned_to?.toString() !== adminId) {
          return res.status(403).json({
            message: "Only the assigned admin can update this ticket.",
          });
        }
      }

      ticket.status = status;
      statusChanged = true;
    }

    let newComment = null;

    if (comment?.trim() || attachmentPath) {
      if (ticket.assigned_to?.toString() !== adminId) {
        return res.status(403).json({
          message: "Only the assigned admin can comment on this ticket.",
        });
      }

      newComment = {
        text: comment?.trim() || "",
        by: "departmental-admin",
        at: new Date(),
        attachment: attachmentPath || undefined,
      };
      ticket.comments.push(newComment);
    }

    await ticket.save();

    const logs = [];

    if (statusChanged) {
      logs.push(
        logAction({
          action: "TICKET_STATUS_UPDATE",
          performedBy: adminId,
          description: `Updated status of ticket '${ticket.title}' to '${status}'.`,
          ticketId: ticket._id,
        })
      );
    }

    if (newComment) {
      logs.push(
        logAction({
          action: "TICKET_COMMENT_ADDED",
          performedBy: adminId,
          description: `Added comment${
            attachmentPath ? " with attachment" : ""
          } to ticket '${ticket.title}'.`,
          ticketId: ticket._id,
        })
      );
    }

    await Promise.all(logs);

    // ========== Socket.IO Notifications ==========
    const io = req.app.get("io");
    if (io && ticket.to_department?._id) {
      const deptRoom = ticket.to_department._id.toString();
      const employeeRoom = `employee-${
        ticket.raised_by._id || ticket.raised_by
      }`;

      if (statusChanged) {
        io.to(deptRoom).emit("status-update", {
          ticketId: ticket._id,
          status: ticket.status,
          updatedBy: "departmental-admin",
          updatedAt: new Date(),
          title: ticket.title,
        });

        io.to(employeeRoom).emit("ticket-status-updated", {
          ticketId: ticket._id,
          status: ticket.status,
          updatedBy: "departmental-admin",
          updatedAt: new Date(),
          title: ticket.title,
        });
      }

      if (newComment) {
        io.to(deptRoom).emit("new-comment", {
          ticketId: ticket._id,
          title: ticket.title,
          comment: newComment,
        });

        io.to(employeeRoom).emit("new-comment", {
          ticketId: ticket._id,
          title: ticket.title,
          comment: newComment,
          from: "departmental-admin",
        });
      }
    }

    return res.status(200).json({
      message: "Ticket updated successfully",
      ticket,
    });
  } catch (e) {
    console.error("Error updating ticket status:", e);
    return res.status(500).json({
      message: "Failed to update ticket status",
      error: e.message,
    });
  }
};

export const addInventorySystem = async (req, res) => {
  try {
    const {
      tag,
      systemName,
      systemType,
      modelNo,
      manufacturer,
      designation,
      buildingName,
      floor,
      labNumber,
      ipAddress,
      macAddress,
      usbStatus,
      hasAntivirus,
      desktopPolicy,
      remark,
      owner,
      components,
    } = req.body;

    if (
      !tag ||
      !systemName ||
      !systemType ||
      !buildingName ||
      !floor ||
      !labNumber
    ) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const building = await Building.findOne({ name: buildingName });
    if (!building) {
      return res
        .status(404)
        .json({ message: `Building "${buildingName}" not found.` });
    }

    let ownerRef = null;
    let departmentRef = null;
    let ownerNameText = null;

    if (owner) {
      const employee = await Employee.findOne({ email: owner });

      if (employee && employee.department) {
        const locationMismatch =
          String(employee.building) !== String(building._id) ||
          String(employee.floor) !== String(floor) ||
          String(employee.lab_no) !== String(labNumber);

        if (locationMismatch) {
          return res.status(400).json({
            message: `Owner's assigned location does not match the selected system location.`,
          });
        }

        ownerRef = employee._id;
        departmentRef = employee.department;
      } else {
        ownerNameText = owner;
        departmentRef = null;
      }
    }

    const newSystem = await InventorySystem.create({
      tag,
      systemName,
      systemType,
      modelNo,
      manufacturer,
      designation,
      department: departmentRef,
      building: building._id,
      floor,
      labNumber,
      ipAddress,
      macAddress,
      usbStatus,
      hasAntivirus,
      desktopPolicy,
      remark,
      owner: ownerRef,
      ownerName: ownerNameText,
      components,
      addedBy: req.user.id,
      updatedBy: req.user.id,
    });

    await logAction({
      action: "CREATE",
      performedBy: req.user.id,
      affectedSystem: newSystem._id,
      description: `Inventory system '${tag}' created in ${buildingName}, floor ${floor}, lab ${labNumber}.`,
    });

    res.status(201).json({ success: true, system: newSystem });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error adding inventory system",
      error: error.message,
    });
  }
};

export const getAllInventorySystems = async (req, res) => {
  try {
    const { id } = req.query;

    if (id) {
      const system = await InventorySystem.findById(id)
        .populate("building", "name")
        .populate("department", "name")
        .populate("owner", "name email")
        .populate("addedBy", "name email")
        .populate("updatedBy", "name email");

      if (!system) {
        return res
          .status(404)
          .json({ success: false, message: "Inventory system not found." });
      }

      return res.status(200).json({ success: true, system });
    }

    const systems = await InventorySystem.find()
      .populate("building", "name")
      .populate("department", "name")
      .populate("owner", "name email")
      .populate("addedBy", "name email")
      .populate("updatedBy", "name email");

    res.status(200).json({ success: true, systems });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching inventory systems",
      error: error.message,
    });
  }
};

export const updateInventorySystem = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const system = await InventorySystem.findById(id);
    if (!system) {
      return res.status(404).json({ message: "System not found." });
    }

    let building = system.building;
    if (updates.building) {
      const foundBuilding = await Building.findOne({ name: updates.building });
      if (!foundBuilding) {
        return res.status(404).json({ message: "Building not found by name." });
      }
      building = foundBuilding._id;
    }

    let ownerRef = undefined;
    let departmentRef = undefined;
    let ownerNameText = undefined;
    let shouldUnsetOwnerName = false;

    if (updates.hasOwnProperty("owner")) {
      const ownerEmailOrName = updates.owner;

      if (!ownerEmailOrName) {
        ownerRef = null;
        departmentRef = null;
        ownerNameText = null;
      } else {
        const employee = await Employee.findOne({ email: ownerEmailOrName });

        if (employee && employee.department) {
          const locationMismatch =
            String(employee.building) !== String(building) ||
            String(employee.floor) !== String(updates.floor || system.floor) ||
            String(employee.lab_no) !==
              String(updates.labNumber || system.labNumber);

          if (locationMismatch) {
            return res.status(400).json({
              message: `Owner's assigned location (Building: ${employee.building}, Floor: ${employee.floor}, Lab: ${employee.lab_no}) does not match the updated system location.`,
            });
          }

          ownerRef = employee._id;
          departmentRef = employee.department;
          shouldUnsetOwnerName = true;
        } else {
          ownerRef = null;
          departmentRef = null;
          ownerNameText = ownerEmailOrName;
        }
      }
    }

    const updatePayload = {
      ...updates,
      building,
      updatedBy: req.user.id,
    };

    if (updates.hasOwnProperty("owner")) {
      updatePayload.owner = ownerRef;
      updatePayload.department = departmentRef;

      if (!shouldUnsetOwnerName) {
        updatePayload.ownerName = ownerNameText;
      }
    }

    if (shouldUnsetOwnerName) {
      await InventorySystem.updateOne(
        { _id: id },
        { $unset: { ownerName: "" } }
      );
    }

    const updatedSystem = await InventorySystem.findByIdAndUpdate(
      id,
      updatePayload,
      {
        new: true,
      }
    )
      .populate("building", "name")
      .populate("department", "name")
      .populate("owner", "name email")
      .populate("addedBy", "name");

    await logAction({
      action: "UPDATE",
      performedBy: req.user.id,
      affectedSystem: updatedSystem._id,
      description: `Updated inventory system '${updatedSystem.tag}' at ${updatedSystem.floor}, lab ${updatedSystem.labNumber}.`,
    });

    res.status(200).json({
      success: true,
      message: "Inventory system updated successfully.",
      system: updatedSystem,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating inventory system",
      error: error.message,
    });
  }
};

export const bulkUpdateInventoryLocation = async (req, res) => {
  try {
    const { systemIds, buildingName, floor, labNumber } = req.body;
    const adminId = req.user.id;

    if (!systemIds || !Array.isArray(systemIds) || systemIds.length === 0) {
      return res.status(400).json({ message: "systemIds array is required." });
    }
    if (!buildingName || !floor || !labNumber) {
      return res
        .status(400)
        .json({ message: "New building, floor, and labNumber are required." });
    }

    // 1. Find building
    const building = await Building.findOne({ name: buildingName });
    if (!building) {
      return res
        .status(404)
        .json({ message: `Building "${buildingName}" not found.` });
    }

    // 2. Get admin and check role
    const admin = await DepartmentalAdmin.findById(adminId)
      .populate("department")
      .populate("locations.building");

    if (!admin) {
      return res.status(404).json({ message: "Departmental Admin not found." });
    }

    const isNetworkEngineer =
      admin.department.name.toLowerCase().trim() === "network engineer";

    // 3. Network Engineer Access Control
    if (isNetworkEngineer) {
      const hasAccess = admin.locations.some(
        (loc) =>
          String(loc.building._id) === String(building._id) &&
          String(loc.floor) === String(floor) &&
          loc.labs.includes(labNumber)
      );
      if (!hasAccess) {
        return res.status(403).json({
          message: "You are not authorized to update to this location.",
        });
      }
    }

    // 4. Loop through systems to update each one individually
    const updatedSystems = [];

    for (const systemId of systemIds) {
      const system = await InventorySystem.findById(systemId);
      if (!system) continue;

      let updateData = {
        building: building._id,
        floor,
        labNumber,
        updatedBy: req.user.id,
      };

      // Check if owner is assigned
      if (system.owner) {
        const employee = await Employee.findById(system.owner);

        if (
          !employee ||
          String(employee.building) !== String(building._id) ||
          String(employee.floor) !== String(floor) ||
          String(employee.lab_no) !== String(labNumber)
        ) {
          // Remove owner reference and ownerName + designation
          updateData.owner = null;
          updateData.ownerName = null;
          updateData.designation = null;
        }
      } else if (system.ownerName) {
        // If ownerName is set but system is being moved, remove it
        updateData.ownerName = null;
        updateData.designation = null;
      }

      const updated = await InventorySystem.findByIdAndUpdate(
        systemId,
        { $set: updateData },
        { new: true }
      );
      updatedSystems.push(updated);
    }

    await logAction({
      action: "BULK_UPDATE",
      performedBy: req.user.id,
      systemIds: updatedSystems.map((sys) => sys._id),
      description: `Bulk updated location to ${floor}, lab ${labNumber}, building ${buildingName} for ${updatedSystems.length} system(s).`,
    });

    res.status(200).json({
      success: true,
      message: `${updatedSystems.length} system(s) location updated successfully.`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to bulk update inventory locations",
      error: error.message,
    });
  }
};

export const deleteInventorySystem = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || (Array.isArray(ids) && ids.length === 0)) {
      return res
        .status(400)
        .json({ message: "Please provide one or more system IDs to delete." });
    }

    let deletedCount = 0;

    if (Array.isArray(ids)) {
      const result = await InventorySystem.deleteMany({ _id: { $in: ids } });
      deletedCount = result.deletedCount;
    } else {
      const result = await InventorySystem.findByIdAndDelete(ids);
      if (result) deletedCount = 1;
    }

    if (Array.isArray(ids)) {
      await logAction({
        action: "BULK_DELETE",
        performedBy: req.user.id,
        systemIds: ids,
        description: `Deleted ${ids.length} inventory system(s).`,
      });
    } else {
      await logAction({
        action: "DELETE",
        performedBy: req.user.id,
        affectedSystem: ids,
        description: `Deleted inventory system with ID ${ids}.`,
      });
    }

    res.status(200).json({
      success: true,
      message: `${deletedCount} inventory system(s) deleted successfully.`,
    });
  } catch (error) {
    console.error("Delete Inventory Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete inventory system(s)",
      error: error.message,
    });
  }
};
