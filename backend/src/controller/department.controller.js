import Department from "../models/Department.model.js";
import Ticket from "../models/Ticket.model.js";
import { logAction } from "../utils/logAction.js";

//Add Department by Admin
export const addDepartment = async (req, res) => {
  const { name, description, canResolve } = req.body;

  if (!name) {
    return res
      .status(400)
      .json({ message: "Department name can not be blank" });
  }

  try {
    const existingDept = await Department.findOne({ name });
    //console.log(existingDept)
    if (existingDept) {
      return res.status(400).json({ message: "Department already exists" });
    }

    const department = new Department({ name, description, canResolve });
    await department.save();

    await logAction({
      action: "CREATE",
      performedBy: req.user.id,
      description: `Created department "${name}".`,
    });

    return res
      .status(201)
      .json({ message: "Department added Succesfully", department });
  } catch (e) {
    console.log("Add Department Error:", e);
    return res.status(500).json({
      message: "Failed to add Department",
      error: e.message,
    });
  }
};

//Send all Department to Employee/Admin
export const sendDepartment = async (req, res) => {
  try {
    const depts = await Department.find()
      .select("_id name canResolve")
      .sort({ name: 1 });
    return res.status(200).json({ depts });
  } catch (e) {
    console.error("Error fetching departments:", error);
    return res.status(500).json({ message: "Failed to fetch departments" });
  }
};

//Update Department
export const updateDepartment = async (req, res) => {
  const { deptId } = req.params;
  const { name, description, canResolve } = req.body;

  try {
    const dept = await Department.findById(deptId);
    if (!dept) {
      return res.status(404).json({ message: "Department not found." });
    }

    if (name) dept.name = name;
    if (description) dept.description = description;
    if (canResolve) dept.canResolve = canResolve;

    await dept.save();

    await logAction({
      action: "UPDATE",
      performedBy: req.user.id,
      description: `Updated department "${dept.name}" (ID: ${deptId}).`,
    });

    return res
      .status(200)
      .json({ message: "Department details updated successfully", dept });
  } catch (e) {
    console.error("Error updating department details : ", e);
    return res.status(500).json({
      message: "Failed to update Department details",
      error: e.message,
    });
  }
};

//Delete Department by Admin
export const deleteDepartment = async (req, res) => {
  const departmentId = req.params.deptId;

  try {
    const dept = await Department.findById(departmentId);
    if (!dept) {
      return res.status(404).json({ message: "Department not found" });
    }

    const ticketCount = await Ticket.countDocuments({
      to_department: departmentId,
    });
    if (ticketCount > 0) {
      return res.status(400).json({
        message: "Cannot delete department with linked tickets",
        ticketCount,
      });
    }
    await dept.deleteOne();

    await logAction({
      action: "DELETE",
      performedBy: req.user.id,
      description: `Deleted department "${dept.name}" (ID: ${departmentId}).`,
    });

    return res.status(200).json({ message: "Department deleted successfully" });
  } catch (e) {
    console.error("Failed to delete department", e);
    return res
      .status(500)
      .json({ message: "Error deleting department", error: e.message });
  }
};
