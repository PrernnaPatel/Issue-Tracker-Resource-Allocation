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
import NetworkEngineer from "../models/NetworkEngineer.model.js";
import InventorySystem from "../models/InventorySystem.model.js";
import { Building } from "../models/Building.model.js";
import { updateBuilding } from "./admin.controller.js";
import { logAction } from "../utils/logAction.js";

const otpDeliveryMode = (process.env.OTP_DELIVERY || "email").toLowerCase();
const shouldPrintOtp = otpDeliveryMode === "console" || otpDeliveryMode === "both";

const NETWORK_ENGINEER_DEPARTMENT_NAME = "network engineer";
const IT_DEPARTMENT_REGEX = /^it(\s+department)?$/i;

const isNetworkEngineerDepartment = (departmentName = "") =>
  departmentName.toLowerCase().trim() === NETWORK_ENGINEER_DEPARTMENT_NAME;

const isITDepartment = (departmentName = "") =>
  IT_DEPARTMENT_REGEX.test(departmentName.trim());

const getTicketScopeDepartment = async (departmentName) => {
  if (isNetworkEngineerDepartment(departmentName)) {
    const [itDepartment, networkDepartment] = await Promise.all([
      Department.findOne({ name: IT_DEPARTMENT_REGEX }),
      Department.findOne({
        name: new RegExp(`^${NETWORK_ENGINEER_DEPARTMENT_NAME}$`, "i"),
      }),
    ]);

    const departments = [itDepartment, networkDepartment].filter(Boolean);
    return {
      primary: itDepartment || networkDepartment || null,
      all: departments,
    };
  }

  const department = await Department.findOne({ name: departmentName });
  return {
    primary: department,
    all: department ? [department] : [],
  };
};

export const deptAdminLoginRequestOtp = async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await DepartmentalAdmin.findOne({ email });
    const engineer = admin ? null : await NetworkEngineer.findOne({ email });
    const account = admin || engineer;
    const isNetworkEngineer = Boolean(engineer);

    if (!account) {
      return res.status(404).json({ message: "Departmental admin not found." });
    }

    const isPasswordValid = await bcrypt.compare(password, account.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid Credentials." });
    }
    await logAction({
      action: "FAILED_LOGIN",
      performedBy: account?._id || null,
      description: `Failed login attempt with email "${email}" (invalid password).`,
    });
    const nowIST = moment().tz("Asia/Kolkata");
    const todayDateIST = nowIST.format("YYYY-MM-DD");

    //If first time login
    if (account.isFirstLogin) {
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
        if (shouldPrintOtp) {
          console.log(`[OTP:LOGIN] email=${email} otp=${existingOtp.otp}`);
        }

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
      performedBy: account._id,
      description: `OTP login requested by ${isNetworkEngineer ? "network engineer" : "departmental admin"} (${email}).`,
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

    // 3. Fetch admin / engineer and check existence
    const admin = await DepartmentalAdmin.findOne({ email }).populate("department");
    const engineer = admin
      ? null
      : await NetworkEngineer.findOne({ email })
          .populate({
            path: "itDepartmentAdmin",
            select: "name email department",
            populate: { path: "department", select: "name" },
          })
          .populate("locations.building", "name code");
    const account = admin || engineer;
    const isNetworkEngineer = Boolean(engineer);

    if (!account) {
      return res.status(404).json({ message: "Departmental admin not found" });
    }

    // 4. If it's first login, check OTP expiry (5 min)
    if (account.isFirstLogin) {
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
        id: account._id,
        department: isNetworkEngineer
          ? "Network Engineer"
          : admin?.department?.name || "",
        email: account.email,
        role: "departmental-admin",
        userType: isNetworkEngineer ? "network-engineer" : "departmental-admin",
        isFirstLogin: account.isFirstLogin,
      },
      process.env.JWT_SECRET,
      { expiresIn: secondsUntilMidnight }
    );

    // 6. Clear failed OTP attempts after successful login
    await OtpAttempt.deleteOne({ email });

    await logAction({
      action: "LOGIN_SUCCESS",
      performedBy: account._id,
      description: `${isNetworkEngineer ? "Network Engineer" : "Departmental Admin"} (${account.email}) logged in successfully via OTP.`,
    });

    // 7. Respond with token and user details
    return res.status(200).json({
      message: "OTP verified, login successful",
      token,
      admin: {
        _id: account._id,
        name: account.name,
        email: account.email,
        department: isNetworkEngineer
          ? { name: "Network Engineer" }
          : admin?.department,
        itDepartmentAdmin: isNetworkEngineer ? engineer?.itDepartmentAdmin : undefined,
        locations: isNetworkEngineer ? engineer?.locations : undefined,
        isFirstLogin: account.isFirstLogin,
        isNetworkEngineer,
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
    const engineer = admin ? null : await NetworkEngineer.findOne({ email });
    const account = admin || engineer;
    const isNetworkEngineer = Boolean(engineer);
    if (!account || !account.isFirstLogin) {
      return res.status(404).json({ message: "Departmental Admin not found." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    account.password = hashedPassword;
    account.isFirstLogin = false;
    await account.save();

    await logAction({
      action: "PASSWORD_CHANGED",
      performedBy: account._id,
      description: `${isNetworkEngineer ? "Network Engineer" : "Departmental Admin"} (${account.email}) changed password after first login.`,
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
    const userType = req.user?.userType;
    let admin = null;
    let isNetworkEngineer = false;

    if (userType === "network-engineer") {
      admin = await NetworkEngineer.findById(adminId)
        .populate({
          path: "itDepartmentAdmin",
          select: "name email department",
          populate: { path: "department", select: "name" },
        })
        .populate("locations.building", "name code")
        .select("-password");
      isNetworkEngineer = true;
    } else {
      admin = await DepartmentalAdmin.findById(adminId)
        .populate("department", "name description")
        .populate({
          path: "itDepartmentAdmin",
          select: "name email department",
          populate: { path: "department", select: "name" },
        })
        .populate("locations.building", "name code")
        .select("-password");
    }

    if (!admin) {
      // Fallback: try the other collection if token did not include userType
      admin = await NetworkEngineer.findById(adminId)
        .populate({
          path: "itDepartmentAdmin",
          select: "name email department",
          populate: { path: "department", select: "name" },
        })
        .populate("locations.building", "name code")
        .select("-password");
      isNetworkEngineer = Boolean(admin);
    }

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const response = {
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      department: isNetworkEngineer ? { name: "Network Engineer" } : admin.department,
      itDepartmentAdmin: admin.itDepartmentAdmin,
      isNetworkEngineer,
      locations: (admin.locations || []).map((loc) => ({
        building: loc.building,
        floor: loc.floor,
        labs: loc.labs,
      })),
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

export const getNetworkEngineersForDeptAdmin = async (req, res) => {
  try {
    const { id: adminId } = req.user;

    const currentAdmin = await DepartmentalAdmin.findById(adminId).populate(
      "department",
      "name"
    );
    if (!currentAdmin || !currentAdmin.department) {
      return res.status(404).json({ message: "Departmental admin not found." });
    }

    const isITAdmin = /^it(\s+department)?$/i.test(
      currentAdmin.department.name || ""
    );

    if (!isITAdmin) {
      return res.status(403).json({
        message: "Only IT departmental admins can view network engineers.",
      });
    }

    const engineers = await NetworkEngineer.find({
      itDepartmentAdmin: adminId,
    })
      .populate("itDepartmentAdmin", "name email")
      .populate("locations.building", "name")
      .select("-password")
      .sort({ createdAt: -1 });

    return res.status(200).json({ engineers });
  } catch (error) {
    console.error("Error fetching network engineers for dept admin:", error);
    return res.status(500).json({
      message: "Failed to fetch network engineers.",
      error: error.message,
    });
  }
};

export const changePasswordWithCurrent = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const adminId = req.user?.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      message: "Current password and new password are required.",
    });
  }

  try {
    const admin = await DepartmentalAdmin.findById(adminId);
    const engineer = admin ? null : await NetworkEngineer.findById(adminId);
    const account = admin || engineer;
    const isNetworkEngineer = Boolean(engineer);
    if (!account) {
      return res.status(404).json({ message: "Departmental Admin not found." });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, account.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    account.password = hashedPassword;
    account.isFirstLogin = false;
    await account.save();

    await logAction({
      action: "PASSWORD_CHANGED",
      performedBy: account._id,
      description: `${isNetworkEngineer ? "Network Engineer" : "Departmental Admin"} (${account.email}) changed password.`,
    });

    return res.status(200).json({
      message: "Password updated successfully.",
    });
  } catch (e) {
    return res.status(500).json({
      message: "Failed to change password",
      error: e.message,
    });
  }
};

//Fetch the tickets for each department
export const getDepartmentTickets = async (req, res) => {
  try {
    const { department: departmentName, role, id } = req.user;
    const debug = req.query?.debug === "1";
    const scopedDepartment = await getTicketScopeDepartment(departmentName);
    const scopedDepartments = scopedDepartment?.all || [];
    const scopedDepartmentIds = scopedDepartments.map((dept) => dept._id);
    const primaryDepartment = scopedDepartment?.primary || null;
    if (!primaryDepartment) {
      return res.status(404).json({ message: "Department not found." });
    }

    const toDepartmentFilter =
      scopedDepartmentIds.length > 1
        ? { $in: scopedDepartmentIds }
        : primaryDepartment._id;

    let query = { to_department: toDepartmentFilter };
    let debugInfo = {
      departmentName,
      scopedDepartmentId: primaryDepartment._id,
      scopedDepartmentIds,
      role,
    };

    if (role === "departmental-admin") {
      const isNetworkEngineer =
        departmentName.toLowerCase() === "network engineer";
      const adminRecord = isNetworkEngineer
        ? await NetworkEngineer.findById(id)
        : await DepartmentalAdmin.findById(id);

      if (!adminRecord) {
        return res.status(404).json({ message: "Departmental admin not found." });
      }

      const isITAdmin =
        !isNetworkEngineer && isITDepartment(adminRecord.department?.name || "");

      const hasLocations =
        Array.isArray(adminRecord.locations) &&
        adminRecord.locations.length > 0;

      debugInfo = {
        ...debugInfo,
        isNetworkEngineer,
        isITAdmin,
        hasLocations,
        adminLocations: adminRecord.locations || [],
      };

      if (isNetworkEngineer || isITAdmin) {
        if (!hasLocations) {
          return res.status(200).json(debug ? { tickets: [], debugInfo } : { tickets: [] });
        }

        // Build OR conditions for all assigned locations
        const locationFilters = await Promise.all(
          adminRecord.locations.map(async (loc) => {
            let buildingId = null;
            if (typeof loc.building === "object" && loc.building?._id) {
              buildingId = loc.building._id;
            } else if (typeof loc.building === "string") {
              const trimmed = loc.building.trim();
              if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
                buildingId = trimmed;
              } else if (trimmed) {
                const buildingDoc = await Building.findOne({
                  name: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
                }).select("_id");
                buildingId = buildingDoc?._id || null;
              }
            } else {
              buildingId = loc.building;
            }

            const labs = Array.isArray(loc.labs) ? loc.labs : [];
            const normalizedLabs = labs.flatMap((lab) => {
              const asString = String(lab);
              const asNumber = Number(lab);
              return Number.isNaN(asNumber) ? [asString] : [asString, asNumber];
            });

            return buildingId
              ? {
                  building: buildingId,
                  floor: loc.floor,
                  lab_no: { $in: normalizedLabs },
                }
              : null;
          })
        );

        // Find employees who match any assigned location
        const cleanedFilters = locationFilters.filter(Boolean);
        debugInfo = {
          ...debugInfo,
          locationFilters,
          cleanedFiltersCount: cleanedFilters.length,
        };
        if (cleanedFilters.length === 0) {
          return res.status(200).json(debug ? { tickets: [], debugInfo } : { tickets: [] });
        }
        const matchingEmployees = await Employee.find({
          $or: cleanedFilters,
        }).select("_id");

        const employeeIds = matchingEmployees.map((emp) => emp._id);
        debugInfo = {
          ...debugInfo,
          matchingEmployeesCount: matchingEmployees.length,
          employeeIds,
        };

        query = {
          to_department: toDepartmentFilter,
          $or: [
            { raised_by: { $in: employeeIds } },
            ...(isNetworkEngineer ? [{ assigned_to: id }] : []),
          ],
        };
        debugInfo = { ...debugInfo, query };
      }
    }
    const tickets = await Ticket.find(query)
      .populate({
        path: "raised_by",
        select: "name email building floor lab lab_no",
        populate: { path: "building", select: "name" },
      })
      .populate("assigned_to", "name email")
      .populate("to_department", "name");

    await logAction({
      action: "VIEW_TICKETS",
      performedBy: req.user.id,
      description: `Fetched tickets for department ${primaryDepartment.name} (${departmentName} view).`,
    });

    return res.status(200).json(debug ? { tickets, debugInfo } : { tickets });
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
  const { status, comment, priority } = req.body;
  const { department: adminDeptName, role, id: adminId } = req.user;
  const attachmentPath = req.file ? req.file.filename : "";

  if (role !== "departmental-admin") {
    return res.status(403).json({ message: "Unauthorized access." });
  }

  try {
    const userType = req.user?.userType;
    const adminRecord = userType === "network-engineer"
      ? await NetworkEngineer.findById(adminId)
      : await DepartmentalAdmin.findById(adminId).populate("department");
    if (!adminRecord) {
      return res.status(404).json({ message: "Departmental admin not found." });
    }

    const adminDepartmentName =
      userType === "network-engineer"
        ? "Network Engineer"
        : adminRecord.department?.name;
    const hasNetworkAssignments =
      Array.isArray(adminRecord.locations) && adminRecord.locations.length > 0;
    const isNetworkEngineerActor =
      isNetworkEngineerDepartment(adminDepartmentName) || hasNetworkAssignments;

    const isITAdmin = isITDepartment(adminDepartmentName);
    const allowWatchOnlyUpdates = isITAdmin && !isNetworkEngineerActor;
    if (allowWatchOnlyUpdates && status) {
      return res.status(403).json({
        message:
          "IT departmental admins cannot update ticket status. Network engineers handle status updates.",
      });
    }

    const scopedDepartment = await getTicketScopeDepartment(adminDeptName);
    const scopedDepartments = scopedDepartment?.all || [];
    const scopedDepartmentIds = scopedDepartments.map((dept) => dept._id);
    const primaryDepartment = scopedDepartment?.primary || null;
    if (!primaryDepartment) {
      return res.status(404).json({ message: "Department not found." });
    }

    const ticket = await Ticket.findById(ticketId).populate(
      "to_department raised_by"
    );

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    const inScope = scopedDepartmentIds.some(
      (deptId) => String(deptId) === String(ticket.to_department?._id)
    );
    if (!inScope) {
      return res.status(403).json({
        message: `This ticket does not belong to your allowed department scope (${primaryDepartment.name}).`,
      });
    }

    if (isNetworkEngineerActor) {
      const raisedBy = ticket.raised_by;
      const hasLocationAccess =
        raisedBy &&
        adminRecord.locations.some((loc) => {
          const sameBuilding =
            String(loc.building) === String(raisedBy.building);
          const sameFloor = Number(loc.floor) === Number(raisedBy.floor);
          const sameLab = (loc.labs || []).includes(raisedBy.lab_no);
          return sameBuilding && sameFloor && sameLab;
        });

      if (!hasLocationAccess) {
        return res.status(403).json({
          message:
            "You are not authorized to update this ticket because it is outside your assigned locations.",
        });
      }
    }

    const currentStatus = ticket.status;
    const allowedPriorities = ["low", "normal", "high", "urgent"];

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
    let priorityChanged = false;

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

    if (priority) {
      if (!allowedPriorities.includes(priority)) {
        return res.status(400).json({ message: "Invalid priority value." });
      }
      if (ticket.priority !== priority) {
        ticket.priority = priority;
        priorityChanged = true;
      }
    }

    let newComment = null;

    if (comment?.trim() || attachmentPath) {
      if (!allowWatchOnlyUpdates && ticket.assigned_to?.toString() !== adminId) {
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

    if (priorityChanged) {
      logs.push(
        logAction({
          action: "TICKET_PRIORITY_UPDATE",
          performedBy: adminId,
          description: `Updated priority of ticket '${ticket.title}' to '${priority}'.`,
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

export const assignTicketToEngineer = async (req, res) => {
  const { ticketId } = req.params;
  const { engineerId } = req.body;
  const { department: adminDeptName, role, id: adminId } = req.user;

  if (role !== "departmental-admin") {
    return res.status(403).json({ message: "Unauthorized access." });
  }

  if (!engineerId) {
    return res.status(400).json({ message: "Engineer ID is required." });
  }

  try {
    const adminRecord = await DepartmentalAdmin.findById(adminId).populate(
      "department",
      "name"
    );
    if (!adminRecord || !adminRecord.department) {
      return res.status(404).json({ message: "Departmental admin not found." });
    }

    if (!isITDepartment(adminRecord.department.name)) {
      return res.status(403).json({
        message: "Only IT departmental admins can assign network engineers.",
      });
    }

    const scopedDepartment = await getTicketScopeDepartment(adminDeptName);
    const scopedDepartments = scopedDepartment?.all || [];
    const scopedDepartmentIds = scopedDepartments.map((dept) => dept._id);
    const primaryDepartment = scopedDepartment?.primary || null;
    if (!primaryDepartment) {
      return res.status(404).json({ message: "Department not found." });
    }

    const engineer = await NetworkEngineer.findOne({
      _id: engineerId,
      itDepartmentAdmin: adminId,
    });

    if (!engineer) {
      return res.status(404).json({
        message: "Selected network engineer is not available for this admin.",
      });
    }

    const ticket = await Ticket.findById(ticketId)
      .populate({
        path: "raised_by",
        select: "name email building floor lab_no",
        populate: { path: "building", select: "name" },
      })
      .populate("to_department", "name")
      .populate("assigned_to", "name email");

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    const inScope = scopedDepartmentIds.some(
      (deptId) => String(deptId) === String(ticket.to_department?._id)
    );
    if (!inScope) {
      return res.status(403).json({
        message: `This ticket does not belong to your allowed department scope (${primaryDepartment.name}).`,
      });
    }

    if (ticket.status === "resolved" || ticket.status === "revoked") {
      return res.status(400).json({
        message: "Cannot assign a resolved or revoked ticket.",
      });
    }

    ticket.assigned_to = engineer._id;
    ticket.assigned_manually = true;
    ticket.assigned_at = new Date();
    if (ticket.status !== "in_progress") {
      ticket.status = "in_progress";
    }
    await ticket.save();

    await logAction({
      action: "TICKET_ASSIGNED_MANUALLY",
      performedBy: adminId,
      description: `Assigned ticket '${ticket.title}' to ${engineer.name} and set status to in_progress.`,
      ticketId: ticket._id,
    });

    const io = req.app.get("io");
    if (io && ticket.raised_by?.building && ticket.raised_by?.floor !== undefined) {
      const networkRoom = `network-${ticket.raised_by.building._id}-${ticket.raised_by.floor}`;
      io.to(networkRoom).emit("ticket-assigned", {
        ticketId: ticket._id,
        title: ticket.title,
        assignedTo: engineer._id,
      });
    }

    const updatedTicket = await Ticket.findById(ticketId)
      .populate({
        path: "raised_by",
        select: "name email building floor lab_no",
        populate: { path: "building", select: "name" },
      })
      .populate("assigned_to", "name email")
      .populate("to_department", "name");

    return res.status(200).json({
      message: "Ticket assigned successfully.",
      ticket: updatedTicket,
    });
  } catch (error) {
    console.error("Error assigning ticket:", error);
    return res.status(500).json({
      message: "Failed to assign ticket.",
      error: error.message,
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
    const userType = req.user?.userType;
    const admin = userType === "network-engineer"
      ? await NetworkEngineer.findById(adminId).populate("locations.building")
      : await DepartmentalAdmin.findById(adminId)
          .populate("department")
          .populate("locations.building");

    if (!admin) {
      return res.status(404).json({ message: "Departmental Admin not found." });
    }

    const isNetworkEngineer =
      userType === "network-engineer" ||
      admin.department?.name?.toLowerCase().trim() === "network engineer";

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
