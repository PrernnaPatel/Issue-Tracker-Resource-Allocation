import Admin from "../models/Admin.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import moment from "moment";
import { Building } from "../models/Building.model.js";
import Department from "../models/Department.model.js";
import Employee from "../models/Employee.js";
import DepartmentalAdmin from "../models/DepartmentalAdmin.model.js";
import { sendCredentialsEmail } from "../utils/sendCredentials.js";
import ComponentSet from "../models/ComponentSet.model.js";
import crypto from "crypto";
import ActionLog from "../models/ActionLog.model.js";
import InventorySystem from "../models/InventorySystem.model.js";

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
    const { name, email, department, locations } = req.body;

    const departmentDoc = await Department.findOne({ name: department });
    if (!departmentDoc) {
      return res.status(400).json({ message: "Department not found." });
    }

    const existingAdmin = await DepartmentalAdmin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        message: "This departmental admin already exists.",
      });
    }

    let validatedLocations = [];

    if (department.toLowerCase() === "network engineer") {
      if (!locations || !Array.isArray(locations) || locations.length === 0) {
        return res.status(400).json({
          message:
            "At least one building-floor-lab mapping is required for Network Engineer.",
        });
      }

      for (const loc of locations) {
        const { building, floor, labs } = loc;

        if (
          !building ||
          floor === undefined ||
          !Array.isArray(labs) ||
          labs.length === 0
        ) {
          return res.status(400).json({
            message:
              "Each location must include building, floor, and at least one lab.",
          });
        }

        const buildingDoc = await Building.findOne({ name: building });
        if (!buildingDoc) {
          return res
            .status(404)
            .json({ message: `Building '${building}' not found.` });
        }

        const floorExists = buildingDoc.floors.some(
          (f) => f.floor === parseInt(floor)
        );
        if (!floorExists) {
          return res.status(400).json({
            message: `Floor ${floor} does not exist in building '${building}'.`,
          });
        }

        // Conflict Check
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
                return res.status(400).json({
                  message: `Labs [${conflictingLabs.join(
                    ", "
                  )}] on floor ${floor} in building '${building}' are already assigned to another engineer.`,
                });
              }
            }
          }
        }

        validatedLocations.push({
          building: buildingDoc._id,
          floor: parseInt(floor),
          labs,
        });
      }
    }

    const tempPassword = crypto.randomBytes(4).toString("hex");
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const admin = new DepartmentalAdmin({
      name,
      email,
      department: departmentDoc._id,
      password: hashedPassword,
      isFirstLogin: true,
      ...(department.toLowerCase() === "network engineer" && {
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
    const admins = await DepartmentalAdmin.find({})
      .populate("department", "name description")
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

export const getAvailableNetworkEngineerFloors = async (req, res) => {
  try {
    // 1. Get Network Engineer Department
    const networkEngineerDept = await Department.findOne({
      name: /network engineer/i,
    });
    if (!networkEngineerDept) {
      return res.status(404).json({
        message: "Network Engineer department not found.",
      });
    }

    // 2. Get existing engineers with location mappings
    const engineers = await DepartmentalAdmin.find({
      department: networkEngineerDept._id,
      locations: { $exists: true, $ne: [] },
    }).select("locations");

    // 3. Build assigned map: buildingId => { floor => Set(labs) }
    const assignedMap = new Map();
    for (const eng of engineers) {
      for (const loc of eng.locations) {
        const buildingId = loc.building.toString();
        const floor = loc.floor;
        const labs = loc.labs || [];

        if (!assignedMap.has(buildingId)) {
          assignedMap.set(buildingId, new Map());
        }
        const floorMap = assignedMap.get(buildingId);

        if (!floorMap.has(floor)) {
          floorMap.set(floor, new Set());
        }

        for (const lab of labs) {
          floorMap.get(floor).add(lab);
        }
      }
    }

    // 4. Fetch all buildings and floors
    const buildings = await Building.find();

    const result = [];

    for (const building of buildings) {
      const buildingId = building._id.toString();
      const floorAssignments = [];

      for (const floorObj of building.floors) {
        const floor = floorObj.floor;
        const allLabs = floorObj.labs || [];

        const assignedLabs =
          assignedMap.get(buildingId)?.get(floor) || new Set();

        const availableLabs = allLabs.filter((lab) => !assignedLabs.has(lab));

        if (availableLabs.length > 0) {
          floorAssignments.push({
            floor,
            availableLabs,
          });
        }
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

    const admin = await DepartmentalAdmin.findById(id).populate("department");
    if (!admin) {
      return res.status(404).json({ message: "Admin not found." });
    }

    if (
      !admin.department ||
      admin.department.name.toLowerCase() !== "network engineer"
    ) {
      return res.status(403).json({ message: "Not a network engineer admin." });
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
    admin.locations = locations.filter((loc) => loc.labs.length > 0);
    await admin.save();

    return res.status(200).json({
      message: "Locations updated successfully.",
      updatedLocations: admin.locations,
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
      filter.performedBy = performedBy;
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
        filter.createdAt.$lte = new Date(to);
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
