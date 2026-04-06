import TicketOption from "../models/TicketOption.model.js";
import Department from "../models/Department.model.js";

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const resolveDepartmentByName = async (departmentName) => {
  if (!departmentName) return null;
  return Department.findOne({
    name: new RegExp(`^${escapeRegex(departmentName.trim())}$`, "i"),
  });
};

export const getDeptTicketOptions = async (req, res) => {
  try {
    const { department: departmentName } = req.user;
    const department = await resolveDepartmentByName(departmentName);

    if (!department) {
      return res.status(404).json({ message: "Department not found." });
    }

    const options = await TicketOption.find({ department: department._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ options });
  } catch (error) {
    console.error("Error fetching ticket options:", error);
    return res.status(500).json({ message: "Failed to fetch ticket options." });
  }
};

export const createDeptTicketOption = async (req, res) => {
  try {
    const { title, description } = req.body;
    const { department: departmentName, id: adminId, userType } = req.user;

    if (userType === "network-engineer") {
      return res.status(403).json({ message: "Network engineers cannot manage ticket options." });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Ticket title is required." });
    }

    const department = await resolveDepartmentByName(departmentName);
    if (!department) {
      return res.status(404).json({ message: "Department not found." });
    }

    const existing = await TicketOption.findOne({
      department: department._id,
      title: new RegExp(`^${escapeRegex(title.trim())}$`, "i"),
    });

    if (existing) {
      return res.status(409).json({ message: "Ticket option already exists." });
    }

    const option = await TicketOption.create({
      department: department._id,
      title: title.trim(),
      description: (description || "").trim(),
      createdBy: adminId,
    });

    return res.status(201).json({ message: "Ticket option created.", option });
  } catch (error) {
    console.error("Error creating ticket option:", error);
    return res.status(500).json({ message: "Failed to create ticket option." });
  }
};

export const updateDeptTicketOption = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, isActive } = req.body;
    const { department: departmentName, userType } = req.user;

    if (userType === "network-engineer") {
      return res.status(403).json({ message: "Network engineers cannot manage ticket options." });
    }

    const department = await resolveDepartmentByName(departmentName);
    if (!department) {
      return res.status(404).json({ message: "Department not found." });
    }

    const option = await TicketOption.findOne({
      _id: id,
      department: department._id,
    });

    if (!option) {
      return res.status(404).json({ message: "Ticket option not found." });
    }

    if (title && title.trim()) {
      const existing = await TicketOption.findOne({
        _id: { $ne: option._id },
        department: department._id,
        title: new RegExp(`^${escapeRegex(title.trim())}$`, "i"),
      });

      if (existing) {
        return res.status(409).json({ message: "Ticket option already exists." });
      }

      option.title = title.trim();
    }

    if (description !== undefined) {
      option.description = (description || "").trim();
    }

    if (typeof isActive === "boolean") {
      option.isActive = isActive;
    }

    await option.save();

    return res.status(200).json({ message: "Ticket option updated.", option });
  } catch (error) {
    console.error("Error updating ticket option:", error);
    return res.status(500).json({ message: "Failed to update ticket option." });
  }
};

export const deleteDeptTicketOption = async (req, res) => {
  try {
    const { id } = req.params;
    const { department: departmentName, userType } = req.user;

    if (userType === "network-engineer") {
      return res.status(403).json({ message: "Network engineers cannot manage ticket options." });
    }

    const department = await resolveDepartmentByName(departmentName);
    if (!department) {
      return res.status(404).json({ message: "Department not found." });
    }

    const option = await TicketOption.findOneAndDelete({
      _id: id,
      department: department._id,
    });

    if (!option) {
      return res.status(404).json({ message: "Ticket option not found." });
    }

    return res.status(200).json({ message: "Ticket option deleted." });
  } catch (error) {
    console.error("Error deleting ticket option:", error);
    return res.status(500).json({ message: "Failed to delete ticket option." });
  }
};

export const getEmployeeTicketOptions = async (req, res) => {
  try {
    const departmentName = req.query.department;
    if (!departmentName) {
      return res.status(400).json({ message: "Department is required." });
    }

    const department = await resolveDepartmentByName(departmentName);
    if (!department) {
      return res.status(404).json({ message: "Department not found." });
    }

    const options = await TicketOption.find({
      department: department._id,
      isActive: true,
    })
      .sort({ title: 1 })
      .select("title description")
      .lean();

    return res.status(200).json({ options });
  } catch (error) {
    console.error("Error fetching employee ticket options:", error);
    return res.status(500).json({ message: "Failed to fetch ticket options." });
  }
};
