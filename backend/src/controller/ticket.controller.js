import Ticket from "../models/Ticket.model.js";
import Department from "../models/Department.model.js";
import Employee from "../models/Employee.js";
import DepartmentalAdmin from "../models/DepartmentalAdmin.model.js";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import { logAction } from "../utils/logAction.js";
import Counter from "../models/Counter.model.js";

//Raise Ticket
export const raiseTicket = async (req, res) => {
  const { title, description, to_department, priority } = req.body;
  const { id: employeeId, department: fromDepartment } = req.user;
  const attachmentPath = req.file ? req.file.filename : "";

  if (!title || !description || !to_department) {
    return res.status(400).json({
      message: "Title, description and department are required fields.",
    });
  }

  try {
    const io = req.app.get("io");

    const employee = await Employee.findById(employeeId).populate("building");
    if (!employee || !employee.building || employee.floor === undefined) {
      return res.status(400).json({
        message: "Employee's building and floor information is incomplete.",
      });
    }

    const toDept = await Department.findOne({ name: to_department });
    if (!toDept) {
      return res
        .status(400)
        .json({ message: "Target department does not exist." });
    }

    if (toDept.canResolve === "false") {
      return res.status(403).json({
        message: `The ${toDept.name} department is not allowed to receive tickets.`,
      });
    }

    const targetDepartmentName = to_department.toLowerCase().trim();
    const isNetworkEngineerTarget = targetDepartmentName === "network engineer";
    const isITTarget = /^it(\s+department)?$/i.test(to_department);

    const networkEngineerDept = await Department.findOne({ name: /network engineer/i });

    let notificationRoom = "";

    if (isNetworkEngineerTarget || isITTarget) {
      if (!networkEngineerDept) {
        return res.status(400).json({
          message: "Network Engineer department is not configured.",
        });
      }

      const engineerExists = await DepartmentalAdmin.findOne({
        department: networkEngineerDept._id,
        locations: {
          $elemMatch: {
            building: employee.building._id,
            floor: employee.floor,
          },
        },
      });

      if (!engineerExists) {
        return res.status(400).json({
          message: `No Network Engineer is assigned to ${employee.building.name}, Floor ${employee.floor}.`,
        });
      }

      notificationRoom = `network-${employee.building._id}-${employee.floor}`;
    } else {
      notificationRoom = `department-${to_department.toLowerCase()}`;
    }

    //Generate the next ticket number
    const counter = await Counter.findOneAndUpdate(
      { name: "ticket" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const ticket_id = `TK-${counter.seq}`;

    //Create the ticket
    const new_ticket = new Ticket({
      ticket_id,
      title,
      description,
      from_department: fromDepartment,
      status: "pending",
      priority: priority || "normal",
      raised_by: employeeId,
      to_department: toDept._id,
      attachment: "",
    });

    await new_ticket.save();

    if (req.tempUploadedFile) {
      const oldPath = path.join("attachments", req.tempUploadedFile);
      const timestamp = req.tempUploadedFile.split("_")[0];
      const ext = path.extname(req.tempUploadedFile);
      const newFileName = `${ticket_id}_${timestamp}${ext}`;
      const newPath = path.join("attachments", newFileName);

      try {
        fs.renameSync(oldPath, newPath);

        // Update attachment field in DB
        new_ticket.attachment = newFileName;
        await new_ticket.save();
      } catch (renameErr) {
        console.error("Failed to rename attachment:", renameErr);
      }
    }

    await logAction({
      action: "CREATE",
      performedBy: employeeId,
      description: `Ticket raised: "${title}" to ${to_department}`,
    });

    if (io) {
      const payload = {
        message: `New ticket raised in ${to_department}`,
        ticketId: new_ticket._id,
        title: new_ticket.title,
        priority: new_ticket.priority,
        from: employee.name || "Unknown",
        raisedAt: new Date().toLocaleString(),
      };
      if (isNetworkEngineerTarget) {
        io.to(`network-${employee.building._id}-${employee.floor}`).emit(
          "new-ticket",
          payload
        );
        io.to(`department-network engineer`).emit("new-ticket", payload);
      } else if (isITTarget) {
        io.to(`department-${to_department.toLowerCase()}`).emit("new-ticket", payload);
        io.to(notificationRoom).emit("new-ticket", payload);
      } else {
        io.to(`department-${to_department.toLowerCase()}`).emit(
          "new-ticket",
          payload
        );
      }
    }

    return res.status(201).json({
      message: "Ticket raised successfully",
      ticket: new_ticket,
    });
  } catch (e) {
    console.error("Error raising the ticket:", e);
    return res.status(500).json({
      message: "Failed to raise the ticket",
      error: e.message,
    });
  }
};

//Get my Tickets - Employee
export const getMyTickets = async (req, res) => {
  const { id: employeeId } = req.user;

  try {
    const tickets = await Ticket.find({ raised_by: employeeId })
      .populate("to_department", "name")
      .populate("assigned_to", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Tickets fetched successfully",
      tickets,
    });
  } catch (e) {
    console.error("Error while fetching tickets:", e);
    return res.status(500).json({
      message: "Failed to fetch tickets",
      error: e.message,
    });
  }
};

//Update my Tickets - Employee
export const updateMyTicket = async (req, res) => {
  const { id: employeeId } = req.user;
  const { ticketId } = req.params;
  const { title, description, to_department, deleteAttachment } = req.body;
  const newFile = req.file;

  try {
    const ticket = await Ticket.findOne({
      _id: ticketId,
      raised_by: employeeId,
    }).populate([
      { path: "to_department", select: "name" },
      { path: "assigned_to", select: "department" },
    ]);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    if (ticket.status !== "pending") {
      return res.status(400).json({
        message: "Only tickets with status 'pending' can be updated.",
      });
    }

    // Update title and description
    if (title) ticket.title = title;
    if (description) ticket.description = description;

    // Update department if changed
    if (to_department) {
      const dept = await Department.findOne({ name: to_department });
      if (!dept) {
        return res
          .status(400)
          .json({ message: "Target department does not exist." });
      }

      if (dept.canResolve === "false") {
        return res.status(403).json({
          message: `The ${dept.name} department is not allowed to receive tickets.`,
        });
      }

      // Special check for Network Engineer
      if (to_department.toLowerCase() === "network engineer") {
        const employee = await Employee.findById(employeeId).populate(
          "building"
        );
        if (!employee || !employee.building || employee.floor === undefined) {
          return res.status(400).json({
            message: "Your building and floor information is incomplete.",
          });
        }

        const assignedEngineer = await DepartmentalAdmin.findOne({
          department: dept._id,
          locations: {
            $elemMatch: {
              building: employee.building._id,
              floor: employee.floor,
            },
          },
        });

        if (!assignedEngineer) {
          return res.status(400).json({
            message: `No Network Engineer is assigned to ${employee.building.name}, Floor ${employee.floor}.`,
          });
        }
      }

      ticket.to_department = dept._id;
    }

    // Handle attachment changes
    if (deleteAttachment === "true" || newFile) {
      if (ticket.attachment) {
        const oldPath = path.join("attachments", ticket.attachment);
        fs.unlink(oldPath, (err) => {
          if (err) {
            console.warn("Failed to delete old attachment:", err.message);
          }
        });
        ticket.attachment = "";
      }
    }

    if (newFile) {
      ticket.attachment = newFile.filename;
    }

    await ticket.save();

    await logAction({
      action: "UPDATE",
      performedBy: employeeId,
      description: `Ticket updated: "${ticket.title}" (Ticket ID: ${ticket.ticket_id})`,
    });

    // Notify departmental admin via Socket.IO
    const io = req.app.get("io");
    const deptName = ticket.to_department?.name?.toLowerCase();

    if (ticket.assigned_to) {
      if (deptName === "network engineer") {
        const employee = await Employee.findById(employeeId).populate(
          "building"
        );
        const room = `network-${employee.building._id}-${employee.floor}`;
        io.to(room).emit("ticket-updated", {
          ticketId: ticket._id,
          title: ticket.title,
          message: `Ticket "${ticket.title}" has been updated by the employee.`,
        });
      } else if (/^it(\s+department)?$/i.test(deptName || "")) {
        const employee = await Employee.findById(employeeId).populate(
          "building"
        );
        const networkRoom = `network-${employee.building._id}-${employee.floor}`;
        const departmentRoom = `department-${deptName}`;

        io.to(networkRoom).emit("ticket-updated", {
          ticketId: ticket._id,
          title: ticket.title,
          message: `Ticket "${ticket.title}" has been updated by the employee.`,
        });

        io.to(departmentRoom).emit("ticket-updated", {
          ticketId: ticket._id,
          title: ticket.title,
          message: `Ticket "${ticket.title}" has been updated by the employee.`,
        });
      } else {
        const room = `department-${deptName}`;
        io.to(room).emit("ticket-updated", {
          ticketId: ticket._id,
          title: ticket.title,
          message: `Ticket "${ticket.title}" has been updated by the employee.`,
        });
      }
    }

    return res
      .status(200)
      .json({ message: "Ticket updated successfully", ticket });
  } catch (e) {
    console.error("Error updating the ticket:", e);
    return res.status(500).json({
      message: "Failed to update ticket.",
      error: e.message,
    });
  }
};

//Get All tickets - Admin
export const getAllTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find()
      .populate(
        "raised_by",
        "name email department contact_no building floor lab_no"
      )
      .populate("to_department", "name")
      .populate("assigned_to", "name")
      .sort({ createdAt: -1 });

    return res
      .status(200)
      .json({ message: "All tickets fetched successfully", tickets });
  } catch (e) {
    console.error("Error fetching all tickets:", e);
    return res
      .status(500)
      .json({ message: "Failed to fetch all the tickets.", error: e.message });
  }
};

//Filter My tickets - Employee
export const filterMyTickets = async (req, res) => {
  const { id: employeeId } = req.user;
  const { status, to_department, startDate, endDate } = req.query;
  console.log(req.query);
  try {
    const filter = {
      raised_by: employeeId,
    };

    if (status) {
      filter.status = status;
    }

    if (to_department) {
      const dept = await Department.findOne({ name: to_department });
      if (!dept) {
        return res.status(404).json({ message: "Department not found." });
      }
      filter.to_department = dept._id;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    const { ticket_id } = req.query;
    if (ticket_id) {
      filter.ticket_id = ticket_id;
    }

    const tickets = await Ticket.find(filter)
      .populate("to_department", "name")
      .sort({ createdAt: -1 });

    return res
      .status(200)
      .json({ message: "Filtered tickets fetched successfully", tickets });
  } catch (e) {
    console.error("Filter error:", e);
    return res
      .status(500)
      .json({ message: "Failed to fetch filtered tickets", error: e.message });
  }
};

//Revoke ticket by employee
export const revokeTicket = async (req, res) => {
  const { ticketId } = req.params;
  const { commentText } = req.body;
  const employeeId = req.user.id;

  if (!commentText || commentText.trim() === "") {
    return res
      .status(400)
      .json({ message: "Comment is required to revoke a ticket." });
  }

  try {
    const ticket = await Ticket.findOne({
      _id: ticketId,
      raised_by: employeeId,
    }).populate([
      { path: "assigned_to", select: "email department" },
      { path: "to_department", select: "name" },
    ]);

    if (!ticket) {
      return res
        .status(404)
        .json({ message: "Ticket not found or not authorized." });
    }

    if (["resolved", "revoked"].includes(ticket.status)) {
      return res
        .status(400)
        .json({ message: `Ticket is already ${ticket.status}.` });
    }

    // Add the employee comment before revoking
    const comment = {
      text: commentText.trim(),
      by: "employee",
      at: new Date(),
    };
    ticket.comments.push(comment);

    ticket.status = "revoked";
    ticket.updatedAt = new Date();
    await ticket.save();

    await logAction({
      action: "UPDATE",
      performedBy: employeeId,
      description: `Ticket "${ticket.title}" (Ticket ID: ${ticket.ticket_id}) was revoked by employee.`,
    });

    // ===== Socket Notification =====
    const io = req.app.get("io");
    if (ticket.assigned_to) {
      const deptName = ticket.to_department?.name?.toLowerCase();

      if (deptName === "network engineer") {
        const employee = await Employee.findById(employeeId).populate(
          "building"
        );
        const room = `network-${employee.building._id}-${employee.floor}`;
        io.to(room).emit("ticket-revoked", {
          ticketId: ticket._id,
          title: ticket.title,
          message: `Ticket titled "${ticket.title}" has been revoked by the employee.`,
        });
      } else if (/^it(\s+department)?$/i.test(deptName || "")) {
        const employee = await Employee.findById(employeeId).populate(
          "building"
        );
        const networkRoom = `network-${employee.building._id}-${employee.floor}`;
        const departmentRoom = `department-${deptName}`;

        io.to(networkRoom).emit("ticket-revoked", {
          ticketId: ticket._id,
          title: ticket.title,
          message: `Ticket titled "${ticket.title}" has been revoked by the employee.`,
        });

        io.to(departmentRoom).emit("ticket-revoked", {
          ticketId: ticket._id,
          title: ticket.title,
          message: `Ticket titled "${ticket.title}" has been revoked by the employee.`,
        });
      } else if (deptName) {
        const room = `department-${deptName}`;
        io.to(room).emit("ticket-revoked", {
          ticketId: ticket._id,
          title: ticket.title,
          message: `Ticket titled "${ticket.title}" has been revoked by the employee.`,
        });
      }
    }

    return res.status(200).json({
      message: "Ticket revoked successfully",
      ticket,
    });
  } catch (error) {
    console.error("Error revoking ticket:", error);
    return res.status(500).json({
      message: "Failed to revoke ticket",
      error: error.message,
    });
  }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
//Fetch attachment
export const getAttachment = (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "../../attachments", filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "Attachment not found." });
  }

  res.sendFile(filePath);
};

export const commentOnMyTicket = async (req, res) => {
  const { ticketId } = req.params;
  const { commentText } = req.body;
  const employeeId = req.user.id;
  const attachmentPath = req.file ? req.file.filename : "";

  try {
    const ticket = await Ticket.findOne({
      _id: ticketId,
      raised_by: employeeId,
    }).populate("to_department", "_id name");

    if (!ticket) {
      return res
        .status(403)
        .json({ message: "Ticket not found or access denied." });
    }

    if (ticket.status === "revoked") {
      return res
        .status(403)
        .json({ message: "Cannot comment on a revoked ticket." });
    }

    if (!commentText?.trim() && !attachmentPath) {
      return res
        .status(400)
        .json({ message: "Comment text or attachment is required." });
    }

    const newComment = {
      text: commentText?.trim() || "",
      by: "employee",
      at: new Date(),
      attachment: attachmentPath || undefined,
    };

    ticket.comments.push(newComment);
    await ticket.save();

    await logAction({
      action: "UPDATE",
      performedBy: employeeId,
      description: `Comment added on Ticket "${ticket.title}" (Ticket ID: ${ticket.ticket_id}) by employee.`,
    });

    // Notify the assigned departmental admin
    const io = req.app.get("io");

    if (ticket.to_department && ticket.to_department._id) {
      const departmentName = ticket.to_department.name.toLowerCase();
      const departmentRoom = `department-${departmentName}`;

      io.to(departmentRoom).emit("new-comment", {
        ticketId: ticket.ticket_id || ticket._id,
        comment: newComment,
        title: ticket.title,
        employeeName: req.user.name || "Unknown Employee",
      });

      if (/^it(\s+department)?$/i.test(departmentName)) {
        const employee = await Employee.findById(employeeId).populate("building");
        if (employee?.building && employee.floor !== undefined) {
          const networkRoom = `network-${employee.building._id}-${employee.floor}`;
          io.to(networkRoom).emit("new-comment", {
            ticketId: ticket.ticket_id || ticket._id,
            comment: newComment,
            title: ticket.title,
            employeeName: req.user.name || "Unknown Employee",
          });
        }
      }

      console.log(`Notification sent to: ${departmentRoom}`);
    }

    return res.status(200).json({
      message: "Comment added successfully",
      comments: ticket.comments,
    });
  } catch (error) {
    console.error("Error commenting on ticket:", error);
    return res
      .status(500)
      .json({ message: "Failed to add comment", error: error.message });
  }
};

export const markTicketAsViewed = async (req, res) => {
  const { ticketId } = req.params;
  const adminId = req.user.id;

  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    // Log existing views before modification
    const existingView = ticket.admin_views?.find(
      (view) => view.admin_id.toString() === adminId.toString()
    );

    // Remove existing view record for this admin
    const beforeCount = ticket.admin_views?.length || 0;
    ticket.admin_views =
      ticket.admin_views?.filter(
        (view) => view.admin_id.toString() !== adminId.toString()
      ) || [];
    const afterRemoveCount = ticket.admin_views.length;

    // Add new view record
    const newViewRecord = {
      admin_id: adminId,
      last_viewed_at: new Date(),
    };

    ticket.admin_views.push(newViewRecord);

    await ticket.save();

    await logAction({
      action: "UPDATE",
      performedBy: adminId,
      description: `Ticket "${ticket.title}" (Ticket ID: ${ticket.ticket_id}) marked as viewed by admin.`,
    });

    return res.status(200).json({
      message: "Marked as viewed.",
      last_viewed_at: newViewRecord.last_viewed_at,
    });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getUnreadTicketUpdates = async (req, res) => {
  const startTime = Date.now();
  const { id: adminId, department: deptName } = req.user;

  try {
    const isNetworkEngineer = deptName?.toLowerCase() === "network engineer";
    const scopedDepartment = isNetworkEngineer
      ? await Department.findOne({ name: /^it(\s+department)?$/i })
      : await Department.findOne({ name: deptName });

    if (!scopedDepartment) {
      return res.status(404).json({ message: "Department not found" });
    }

    let locationEmployeeIds = null;

    if (isNetworkEngineer) {
      const engineer = await DepartmentalAdmin.findById(adminId);
      if (!engineer || !Array.isArray(engineer.locations) || engineer.locations.length === 0) {
        return res.status(400).json({ message: "Network Engineer locations not assigned." });
      }

      const locationFilters = engineer.locations.map((loc) => ({
        building: loc.building,
        floor: loc.floor,
        lab_no: { $in: loc.labs },
      }));

      const matchingEmployees = await Employee.find({ $or: locationFilters }).select("_id");
      locationEmployeeIds = matchingEmployees.map((emp) => emp._id);
    }

    // Get tickets assigned to this admin or department
    const ticketQuery = {
      $or: [
        { assigned_to: adminId },
        {
          to_department: scopedDepartment._id,
          ...(isNetworkEngineer && { raised_by: { $in: locationEmployeeIds } }),
          status: { $in: ["pending", "in_progress"] },
        },
      ],
    };

    const tickets = await Ticket.find(ticketQuery).populate(
      "raised_by",
      "name email"
    );

    const unreadData = [];

    for (const ticket of tickets) {
      // Find admin's last view
      const adminView = ticket.admin_views?.find(
        (view) => view.admin_id.toString() === adminId.toString()
      );
      const lastViewedAt = adminView ? adminView.last_viewed_at : null;

      let unreadCount = 0;
      let hasUnreadActivity = false;

      // Count unread comments from employees
      if (ticket.comments && ticket.comments.length > 0) {
        for (const comment of ticket.comments) {
          const commentTime = new Date(comment.at);
          const isFromEmployee = comment.by === "employee";
          const isAfterLastView =
            !lastViewedAt || commentTime > new Date(lastViewedAt);

          if (isFromEmployee && isAfterLastView) {
            unreadCount++;
          }
        }
      }

      // Check if ticket was updated after last view (with small buffer for timing issues)
      const activityBuffer = 1000; // 1 second buffer
      if (
        lastViewedAt &&
        ticket.last_activity_at >
          new Date(new Date(lastViewedAt).getTime() + activityBuffer)
      ) {
        hasUnreadActivity = true;
      } else if (lastViewedAt) {
      }

      // Include ticket if never viewed, has unread comments, or has unread activity
      const shouldInclude =
        !lastViewedAt || unreadCount > 0 || hasUnreadActivity;

      if (shouldInclude) {
        const unreadTicket = {
          ticketId: ticket._id,
          ticketRef: ticket.ticket_id || "",
          title: ticket.title,
          unreadCount: unreadCount,
          hasUnreadActivity: hasUnreadActivity,
          lastActivityAt: ticket.last_activity_at,
          lastViewedAt: lastViewedAt,
          status: ticket.status,
          priority: ticket.priority,
          raisedBy: ticket.raised_by?.name || "Unknown",
        };

        unreadData.push(unreadTicket);
      }
    }

    const processingTime = Date.now() - startTime;

    return res.status(200).json({
      updatedTickets: unreadData,
      totalUpdatedTickets: unreadData.length,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};
