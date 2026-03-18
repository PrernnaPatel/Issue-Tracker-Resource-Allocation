import Admin from "../models/Admin.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import moment from "moment";
import { Building } from "../models/Building.model.js";
import Department from "../models/Department.model.js";
import Employee from "../models/Employee.js";
import DepartmentalAdmin from "../models/DepartmentalAdmin.model.js";
import NetworkEngineer from "../models/NetworkEngineer.model.js";
import { sendCredentialsEmail } from "../utils/sendCredentials.js";
import ComponentSet from "../models/ComponentSet.model.js";
import crypto from "crypto";
import ActionLog from "../models/ActionLog.model.js";
import InventorySystem from "../models/InventorySystem.model.js";

const normalizeName = (value = "") =>
  value.trim().replace(/\s+/g, " ").toLowerCase();

const isNetworkEngineerDepartment = (name = "") =>
  /^network engineer$/i.test(name.trim());

//Admin Login
export const adminLogin = async (req, res) => {
  const { email, password } = req.body;
  //console.log(req.body);
  try {
    //Find Admin
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: "Admin not found" });
    }

    //Match Password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const now = moment().tz("Asia/Kolkata");
    const midnight = moment().tz("Asia/Kolkata").endOf("day");
    const secondsUntilMidnight = midnight.diff(now, "seconds");

    //Create token
    const token = jwt.sign(
      {
        id: admin._id,
        mail: admin.email,
        role: "superadmin",
      },
      process.env.JWT_SECRET,
      { expiresIn: secondsUntilMidnight }
    );

    res.status(200).json({
      message: "Login Successful",
      token,
      admin: {
        name: admin.name,
        email: admin.email,
      },
    });
  } catch (e) {
    console.log("Admin login error:", e);
    res.status(500).json({ message: "Server error", error: e.message });
  }
};

//Add Building
export const addBuilding = async (req, res) => {
  try {
    const { name, floors } = req.body;

    // Validate input
    if (!name || !Array.isArray(floors) || floors.length === 0) {
      return res
        .status(400)
        .json({ message: "Building name and floors are required." });
    }

    // Check for duplicate floor numbers
    const floorNumbers = floors.map((f) => f.floor);
    const uniqueFloors = new Set(floorNumbers);
    if (uniqueFloors.size !== floors.length) {
      return res
        .status(400)
        .json({ message: "Duplicate floor numbers found." });
    }

    // Ensure labs are arrays of strings
    for (const f of floors) {
      if (
        !Array.isArray(f.labs) ||
        !f.labs.every((lab) => typeof lab === "string")
      ) {
        return res.status(400).json({
          message: "Each floor must contain a valid list of lab names.",
        });
      }
    }

    // Check for existing building
    const existing = await Building.findOne({ name });
    if (existing) {
      return res
        .status(400)
        .json({ message: "A building with this name already exists." });
    }

    // Save building
    const newBuilding = new Building({ name, floors });
    await newBuilding.save();

    res.status(201).json({
      message: "Building added successfully",
      building: newBuilding,
    });
  } catch (e) {
    console.error("Error adding building:", e);
    res.status(500).json({
      message: "Failed to add building",
      error: e.message,
    });
  }
};

export const updateBuilding = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, floors } = req.body;

    const building = await Building.findById(id);
    if (!building) {
      return res.status(404).json({ message: "Building not found." });
    }

    // Update name if provided
    if (name) {
      const existingWithSameName = await Building.findOne({
        name,
        _id: { $ne: id },
      });

      if (existingWithSameName) {
        return res.status(400).json({
          message: "Another building with this name already exists.",
        });
      }

      building.name = name;
    }

    // Update floors if provided
    if (floors) {
      if (!Array.isArray(floors) || floors.length === 0) {
        return res
          .status(400)
          .json({ message: "Floors must be a non-empty array." });
      }

      const floorNumbers = floors.map((f) => f.floor);
      const uniqueFloors = new Set(floorNumbers);
      if (uniqueFloors.size !== floors.length) {
        return res
          .status(400)
          .json({ message: "Duplicate floor numbers found." });
      }

      for (const f of floors) {
        if (
          !Array.isArray(f.labs) ||
          !f.labs.every((lab) => typeof lab === "string")
        ) {
          return res.status(400).json({
            message: "Each floor must contain a valid list of lab names.",
          });
        }
      }

      building.floors = floors;
    }

    await building.save();
    res.status(200).json({
      message: "Building updated successfully",
      building,
    });
  } catch (e) {
    console.error("Error updating building:", e);
    res.status(500).json({
      message: "Failed to update building",
      error: e.message,
    });
  }
};

//Create Departmental Admin
export const createDepartmentalAdmin = async (req, res) => {
  try {
    const { name, email, department, locations, itDepartmentAdminId } = req.body;

    const normalizedDepartment = normalizeName(department || "");
    const isNetworkEngineerRequest = normalizedDepartment === "network engineer";
    let departmentDoc = null;

    if (!isNetworkEngineerRequest) {
      const allDepartments = await Department.find({}).select("name");
      departmentDoc = allDepartments.find(
        (dept) => normalizeName(dept.name) === normalizedDepartment
      );
      if (!departmentDoc) {
        return res.status(400).json({
          message: "Department not found.",
          requestedDepartment: department,
          availableDepartments: allDepartments.map((dept) => dept.name),
        });
      }
    }

    const existingAdmin = await DepartmentalAdmin.findOne({ email });
    const existingEngineer = await NetworkEngineer.findOne({ email });
    if (existingAdmin || existingEngineer) {
      return res.status(400).json({
        message: "This user already exists.",
      });
    }

    let validatedLocations = [];
    let linkedITAdminId = null;

    const validateLocations = async ({ enforceConflictCheck = false } = {}) => {
      if (!locations || !Array.isArray(locations) || locations.length === 0) {
        return [];
      }

      const parsedLocations = [];
      for (const loc of locations) {
        const { building, floor, labs } = loc;

        if (
          !building ||
          floor === undefined ||
          !Array.isArray(labs) ||
          labs.length === 0
        ) {
          return { error: "Each location must include building, floor, and at least one lab." };
        }

        const buildingDoc = await Building.findOne({ name: building });
        if (!buildingDoc) {
          return { error: `Building '${building}' not found.` };
        }

        const floorExists = buildingDoc.floors.some(
          (f) => f.floor === parseInt(floor)
        );
        if (!floorExists) {
          return { error: `Floor ${floor} does not exist in building '${building}'.` };
        }

        if (enforceConflictCheck) {
          const existingAdmins = await DepartmentalAdmin.find({
            department: departmentDoc._id,
            "locations.building": buildingDoc._id,
            "locations.floor": floor,
          });

          for (const admin of existingAdmins) {
            for (const existingLoc of admin.locations || []) {
              if (
                existingLoc.building.toString() === buildingDoc._id.toString() &&
                existingLoc.floor === parseInt(floor)
              ) {
                const conflictingLabs = existingLoc.labs.filter((lab) =>
                  labs.includes(lab)
                );
                if (conflictingLabs.length > 0) {
                  return {
                    error: `Labs [${conflictingLabs.join(
                      ", "
                    )}] on floor ${floor} in building '${building}' are already assigned to another engineer.`,
                  };
                }
              }
            }
          }
        }

        parsedLocations.push({
          building: buildingDoc._id,
          floor: parseInt(floor),
          labs,
        });
      }

      return { data: parsedLocations };
    };

    if (isNetworkEngineerRequest) {
      if (!itDepartmentAdminId) {
        return res.status(400).json({
          message: "IT Departmental Admin is required for Network Engineer.",
        });
      }

      const itAdmin = await DepartmentalAdmin.findById(itDepartmentAdminId).populate("department");
      if (!itAdmin || !itAdmin.department) {
        return res.status(400).json({ message: "Selected IT Departmental Admin is invalid." });
      }

      const isITAdmin = /^it(\s+department)?$/i.test(itAdmin.department.name);
      if (!isITAdmin) {
        return res.status(400).json({
          message: "Selected admin is not from IT department.",
        });
      }

      linkedITAdminId = itAdmin._id;

      if (!locations || !Array.isArray(locations) || locations.length === 0) {
        return res.status(400).json({
          message:
            "At least one building-floor-lab mapping is required for Network Engineer.",
        });
      }
      const validation = await validateLocations({ enforceConflictCheck: false });
      if (validation.error) {
        return res.status(400).json({ message: validation.error });
      }
      validatedLocations = validation.data || [];
    } else if (Array.isArray(locations) && locations.length > 0) {
      const validation = await validateLocations({ enforceConflictCheck: false });
      if (validation.error) {
        return res.status(400).json({ message: validation.error });
      }
      validatedLocations = validation.data || [];
    }

    const tempPassword = crypto.randomBytes(4).toString("hex");
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    if (isNetworkEngineerRequest) {
      const engineer = new NetworkEngineer({
        name,
        email,
        password: hashedPassword,
        isFirstLogin: true,
        itDepartmentAdmin: linkedITAdminId,
        ...(validatedLocations.length > 0 && {
          locations: validatedLocations,
        }),
      });

      await engineer.save();

      await sendCredentialsEmail({
        name,
        email,
        tempPassword,
        departmentName: "Network Engineer",
      });

      return res.status(200).json({
        message: "Network Engineer created and credentials sent via email.",
        admin: {
          name: engineer.name,
          email: engineer.email,
          department: "Network Engineer",
          ...(engineer.locations?.length && {
            locations: validatedLocations.map((loc) => ({
              building: loc.building.toString(),
              floor: loc.floor,
              labs: loc.labs,
            })),
          }),
        },
      });
    }

    const admin = new DepartmentalAdmin({
      name,
      email,
      department: departmentDoc._id,
      password: hashedPassword,
      isFirstLogin: true,
      ...(validatedLocations.length > 0 && {
        locations: validatedLocations,
      }),
    });

    await admin.save();

    await sendCredentialsEmail({
      name,
      email,
      tempPassword,
      departmentName: departmentDoc.name,
    });

    return res.status(200).json({
      message: "Departmental admin created and credentials sent via email.",
      admin: {
        name: admin.name,
        email: admin.email,
        department: departmentDoc.name,
        ...(admin.locations?.length && {
          locations: validatedLocations.map((loc) => ({
            building: loc.building.toString(),
            floor: loc.floor,
            labs: loc.labs,
          })),
        }),
      },
    });
  } catch (e) {
    console.error("Error creating departmental admin:", e);
    return res.status(500).json({
      message: "Internal Server Error",
      error: e.message,
    });
  }
};

//Fetch all department
export const getAllDepartmentalAdmin = async (req, res) => {
  try {
    const admins = await DepartmentalAdmin.find({ itDepartmentAdmin: null })
      .populate("department", "name description")
      .populate("itDepartmentAdmin", "name email")
      .populate("locations.building", "name") // populate building inside locations
      .select("-password");

    res.status(200).json({
      message: "Departmental admins fetched successfully.",
      admin: admins,
    });
  } catch (e) {
    res.status(500).json({
      message: "Error fetching departmental admins",
      error: e.message,
    });
  }
};

export const getAllNetworkEngineers = async (req, res) => {
  try {
    const engineers = await NetworkEngineer.find({})
      .populate("itDepartmentAdmin", "name email")
      .populate("locations.building", "name")
      .select("-password");

    res.status(200).json({
      message: "Network engineers fetched successfully.",
      engineers,
    });
  } catch (e) {
    res.status(500).json({
      message: "Error fetching network engineers",
      error: e.message,
    });
  }
};

export const deleteNetworkEngineer = async (req, res) => {
  try {
    const { id } = req.params;
    const engineer = await NetworkEngineer.findById(id);
    if (!engineer) {
      return res.status(404).json({ message: "Network engineer not found." });
    }

    await NetworkEngineer.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Network engineer deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting network engineer:", error);
    return res.status(500).json({
      message: "Failed to delete network engineer.",
      error: error.message,
    });
  }
};

export const getDepartmentLocations = async (req, res) => {
  try {
    const { departmentId } = req.params;
    if (!departmentId) {
      return res.status(400).json({ message: "Department ID is required." });
    }

    const employees = await Employee.find({ department: departmentId })
      .populate("building", "name")
      .select("building floor lab_no");

    const departmentalAdmins = await DepartmentalAdmin.find({
      department: departmentId,
      locations: { $exists: true, $ne: [] },
    })
      .populate("locations.building", "name")
      .select("locations");

    const buildingMap = new Map();
    const addMappedLocation = (building, floor, lab) => {
      if (!building?._id) return;
      const buildingId = String(building._id);
      const buildingName = building.name || "Unknown Building";
      if (!buildingMap.has(buildingId)) {
        buildingMap.set(buildingId, { buildingId, buildingName, floors: new Map() });
      }

      const floorNumber = Number(floor);
      const buildingEntry = buildingMap.get(buildingId);
      if (!buildingEntry.floors.has(floorNumber)) {
        buildingEntry.floors.set(floorNumber, new Set());
      }

      if (lab) {
        buildingEntry.floors.get(floorNumber).add(lab);
      }
    };

    employees.forEach((employee) => {
      addMappedLocation(employee.building, employee.floor, employee.lab_no);
    });

    departmentalAdmins.forEach((admin) => {
      (admin.locations || []).forEach((loc) => {
        const building = loc.building;
        (loc.labs || []).forEach((lab) => {
          addMappedLocation(building, loc.floor, lab);
        });
      });
    });

    const availableAssignments = Array.from(buildingMap.values())
      .map((buildingEntry) => ({
        buildingId: buildingEntry.buildingId,
        buildingName: buildingEntry.buildingName,
        availableFloors: Array.from(buildingEntry.floors.entries())
          .map(([floor, labsSet]) => ({
            floor,
            availableLabs: Array.from(labsSet).sort(),
          }))
          .sort((a, b) => a.floor - b.floor),
      }))
      .sort((a, b) => a.buildingName.localeCompare(b.buildingName));

    return res.status(200).json({ availableAssignments });
  } catch (error) {
    console.error("Error fetching department locations:", error);
    return res.status(500).json({
      message: "Failed to fetch department locations.",
      error: error.message,
    });
  }
};

export const updateDepartmentalAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, department, locations } = req.body;

    const admin = await DepartmentalAdmin.findById(id).populate("department", "name");
    if (!admin) {
      return res.status(404).json({ message: "Departmental admin not found." });
    }

    if (isNetworkEngineerDepartment(admin.department?.name || "")) {
      return res.status(403).json({
        message: "Network engineer edits are managed from the Network Engineers module.",
      });
    }

    if (typeof name === "string" && name.trim()) {
      admin.name = name.trim();
    }

    if (typeof email === "string" && email.trim()) {
      const normalizedEmail = email.trim().toLowerCase();
      const existingAdmin = await DepartmentalAdmin.findOne({
        email: normalizedEmail,
        _id: { $ne: admin._id },
      });
      if (existingAdmin) {
        return res.status(400).json({ message: "Email already in use." });
      }
      admin.email = normalizedEmail;
    }

    if (typeof department === "string" && department.trim()) {
      const normalizedDepartment = normalizeName(department);
      const allDepartments = await Department.find({}).select("name");
      const departmentDoc = allDepartments.find(
        (dept) => normalizeName(dept.name) === normalizedDepartment
      );

      if (!departmentDoc) {
        return res.status(400).json({ message: "Department not found." });
      }

      if (isNetworkEngineerDepartment(departmentDoc.name)) {
        return res.status(400).json({
          message: "Use Network Engineers page for Network Engineer entries.",
        });
      }

      admin.department = departmentDoc._id;
    }

    if (Array.isArray(locations)) {
      const normalizedLocations = locations
        .filter(
          (loc) =>
            loc &&
            loc.building &&
            loc.floor !== undefined &&
            Array.isArray(loc.labs) &&
            loc.labs.length > 0
        )
        .map((loc) => ({
          building: loc.building,
          floor: Number(loc.floor),
          labs: loc.labs,
        }));

      if (normalizedLocations.length === 0) {
        return res.status(400).json({
          message: "At least one building-floor-lab mapping is required.",
        });
      }

      admin.locations = normalizedLocations;
    }

    await admin.save();

    const updatedAdmin = await DepartmentalAdmin.findById(admin._id)
      .populate("department", "name description")
      .populate("itDepartmentAdmin", "name email")
      .populate("locations.building", "name")
      .select("-password");

    return res.status(200).json({
      message: "Departmental admin updated successfully.",
      admin: updatedAdmin,
    });
  } catch (error) {
    console.error("Error updating departmental admin:", error);
    return res.status(500).json({
      message: "Failed to update departmental admin.",
      error: error.message,
    });
  }
};

export const deleteDepartmentalAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await DepartmentalAdmin.findById(id).populate("department", "name");
    if (!admin) {
      return res.status(404).json({ message: "Departmental admin not found." });
    }

    const isITDepartmentAdmin = /^it(\s+department)?$/i.test(admin.department?.name || "");
    if (isITDepartmentAdmin) {
      const linkedEngineers = await NetworkEngineer.exists({
        itDepartmentAdmin: admin._id,
      });
      if (linkedEngineers) {
        return res.status(400).json({
          message:
            "This IT departmental admin is linked to network engineers. Reassign/delete them first.",
        });
      }
    }

    await DepartmentalAdmin.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Departmental admin deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting departmental admin:", error);
    return res.status(500).json({
      message: "Failed to delete departmental admin.",
      error: error.message,
    });
  }
};

export const getAvailableNetworkEngineerFloors = async (req, res) => {
  try {
    // 1. Fetch all buildings and floors
    const buildings = await Building.find();

    const result = [];

    for (const building of buildings) {
      const buildingId = building._id.toString();
      const floorAssignments = [];

      for (const floorObj of building.floors) {
        const floor = floorObj.floor;
        const allLabs = floorObj.labs || [];
        floorAssignments.push({
          floor,
          availableLabs: allLabs,
        });
      }

      if (floorAssignments.length > 0) {
        result.push({
          buildingId: building._id,
          buildingName: building.name,
          availableFloors: floorAssignments,
        });
      }
    }

    return res.status(200).json({ availableAssignments: result });
  } catch (error) {
    console.error("Error fetching available engineer floors:", error);
    return res.status(500).json({
      message: "Failed to fetch available floors",
      error: error.message,
    });
  }
};

export const deleteBuilding = async (req, res) => {
  try {
    const { buildId: id } = req.params;

    // Check if building exists
    const building = await Building.findById(id);
    if (!building) {
      return res.status(404).json({ message: "Building not found." });
    }

    // Optional: Check if any employee is assigned to this building
    const employeesUsing = await Employee.exists({ building: id });
    if (employeesUsing) {
      return res.status(400).json({
        message: "Cannot delete building. Some employees are assigned to it.",
      });
    }

    // Optional: Check if any departmental admin (e.g., network engineer) is assigned to this building
    const adminsUsing = await DepartmentalAdmin.exists({ building: id });
    if (adminsUsing) {
      return res.status(400).json({
        message:
          "Cannot delete building. A departmental admin is assigned to it.",
      });
    }

    // Delete building
    await Building.findByIdAndDelete(id);

    return res.status(200).json({ message: "Building deleted successfully." });
  } catch (e) {
    console.error("Error deleting building:", e);
    return res
      .status(500)
      .json({ message: "Failed to delete building", error: e.message });
  }
};

export const updateNetworkEngineerLocations = async (req, res) => {
  try {
    const { id } = req.params;
    const { locations } = req.body;

    const engineer = await NetworkEngineer.findById(id);
    if (!engineer) {
      return res.status(404).json({ message: "Admin not found." });
    }

    if (!Array.isArray(locations) || locations.length === 0) {
      return res
        .status(400)
        .json({ message: "Locations must be a non-empty array." });
    }

    // Validate each location
    for (const loc of locations) {
      if (
        !loc.building ||
        !(await Building.findById(loc.building)) ||
        typeof loc.floor !== "number" ||
        !Array.isArray(loc.labs) ||
        loc.labs.some((lab) => typeof lab !== "string")
      ) {
        return res.status(400).json({
          message: "Each location must have valid building, floor, and labs.",
        });
      }
    }

    // Replace with filtered locations (ignore empty lab entries)
    engineer.locations = locations.filter((loc) => loc.labs.length > 0);
    await engineer.save();

    return res.status(200).json({
      message: "Locations updated successfully.",
      updatedLocations: engineer.locations,
    });
  } catch (e) {
    console.error("Error updating locations:", e);
    res.status(500).json({
      message: "Failed to update locations.",
      error: e.message,
    });
  }
};

export const addComponentSet = async (req, res) => {
  try {
    const { name, systemType, components } = req.body;
    // Validate
    if (
      !name ||
      !systemType ||
      !Array.isArray(components) ||
      components.length === 0
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Create
    const newSet = await ComponentSet.create({
      name,
      systemType,
      components,
      createdBy: req.user.id, // superadmin ID from token
    });

    res.status(201).json({ success: true, set: newSet });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error creating component set",
        error: error.message,
      });
  }
};

export const getAllComponentSets = async (req, res) => {
  try {
    const sets = await ComponentSet.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, sets });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error fetching component sets",
        error: error.message,
      });
  }
};

export const editComponentSet = async (req, res) => {
  try {
    const { id } = req.params; // ComponentSet ID
    const { name, systemType, components } = req.body;
    const adminId = req.user.id; // from superadmin auth middleware

    // Basic validation
    if (
      !name ||
      !systemType ||
      !Array.isArray(components) ||
      components.length === 0
    ) {
      return res.status(400).json({
        message: "All fields (name, systemType, components[]) are required.",
      });
    }

    const set = await ComponentSet.findById(id);
    if (!set) {
      return res.status(404).json({ message: "Component set not found." });
    }

    // Update fields
    set.name = name;
    set.systemType = systemType;
    set.components = components;
    set.createdBy = adminId; // optional: update creator

    await set.save();

    res.status(200).json({
      success: true,
      message: "Component set updated successfully.",
      componentSet: set,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating component set",
      error: error.message,
    });
  }
};

export const deleteComponentSet = async (req, res) => {
  try {
    const setId = req.params.id;
    await ComponentSet.findByIdAndDelete(setId);
    res.status(200).json({ success: true, message: "Component set deleted" });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error deleting component set",
        error: error.message,
      });
  }
};

export const getLogs = async (req, res) => {
  try {
    const {
      action,           // "CREATE", "UPDATE", etc.
      performedBy,      // Admin ID
      affectedSystem,   // InventorySystem ID
      from,             // Start date
      to,               // End date
    } = req.query;

    const filter = {};

    if (action) {
      filter.action = action;
    }

    if (performedBy) {
      const searchValue = String(performedBy).trim();
      const matchedAdmins = await DepartmentalAdmin.find({
        $or: [
          { email: { $regex: searchValue, $options: "i" } },
          { name: { $regex: searchValue, $options: "i" } },
        ],
      }).select("_id");

      if (matchedAdmins.length > 0) {
        filter.performedBy = { $in: matchedAdmins.map((admin) => admin._id) };
      } else {
        // Fallback: allow direct ObjectId filtering if a valid id string is provided
        const directMatch = await DepartmentalAdmin.findById(searchValue).select("_id");
        filter.performedBy = directMatch ? directMatch._id : { $in: [] };
      }
    }

    if (affectedSystem) {
      filter.affectedSystem = affectedSystem;
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) {
        filter.createdAt.$gte = new Date(from);
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
    }

    const logs = await ActionLog.find(filter)
      .populate("performedBy", "name email")
      .populate("affectedSystem", "tag systemName")
      .populate("systemIds", "tag systemName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      logs,
    });
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch logs",
      error: error.message,
    });
  }
};
