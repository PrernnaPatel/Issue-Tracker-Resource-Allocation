import Employee from "../models/Employee.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendOtp, forgotPassOtp } from "../utils/sendOtp.js";
import OTP from "../models/Otp.model.js";
import moment from "moment-timezone";
import OtpAttempt from "../models/OtpAttempt.model.js";
import cloudinary from "../utils/cloudinary.js";
import fs from "fs";
import Ticket from "../models/Ticket.model.js";
import { Building } from "../models/Building.model.js";
import Department from "../models/Department.model.js";
import { logAction } from "../utils/logAction.js";

const otpDeliveryMode = (process.env.OTP_DELIVERY || "email").toLowerCase();
const shouldPrintOtp = otpDeliveryMode === "console" || otpDeliveryMode === "both";

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MIN = 15;

//OTP Rate and Limit
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

  await attempt.save();
  if (attempt.lockedUntil && now < attempt.lockedUntil) {
    throw new Error(`Too many attempts.Try again after ${attempt.lockedUntil}`);
  }
};

//Register Employee
export const registerEmployee = async (req, res) => {
  try {
    const {
      name,
      email,
      contact_no,
      department,
      building,
      floor,
      lab_no,
      password,
    } = req.body;
    //console.log(req.body);
    //Check if employee already exists
    const existing = await Employee.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Employee already registered" });
    }

    //Department check
    const dept = await Department.findOne({ name: department });
    if (!dept) {
      return res.status(400).json({ message: "No department found" });
    }

    //Building Check
    const buildingDoc = await Building.findOne({ name: building });
    console.log(buildingDoc);
    if (!buildingDoc) {
      return res.status(400).json({ message: "Building not Found" });
    }

    const floorData = buildingDoc.floors.find(
      (f) => f.floor === parseInt(floor)
    );
    if (!floorData) {
      return res
        .status(400)
        .json({ message: "Invalid floor for the selected building." });
    }
    if (!floorData.labs.includes(lab_no)) {
      return res
        .status(400)
        .json({ message: "Invalid lab no for the selected floor." });
    }

    //Hash the Password
    const hashedPassword = await bcrypt.hash(password, 10);
    //Create new Employee in the database
    const newEmployee = await Employee.create({
      name: name,
      email: email,
      contact_no: contact_no,
      department: dept._id,
      building: buildingDoc._id,
      floor: floor,
      lab_no: lab_no,
      password: hashedPassword,
    });

    await logAction({
      action: "CREATE",
      performedBy: req.user?.id || null, // or system admin if available from context
      description: `New employee registered: ${name} (${email}), Dept: ${department}, Location: ${building} Floor: ${floor}, Lab: ${lab_no}`,
    });

    res
      .status(201)
      .json({ message: "Registered successfully", employee: newEmployee });
  } catch (e) {
    res.status(500).json({ message: "Registration Failed", error: e.message });
  }
};

//Login check and request OTP
export const loginRequestOtp = async (req, res) => {
  const { email, password } = req.body;

  try {
    const employee = await Employee.findOne({ email });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, employee.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid Credentials" });
    }

    const nowIST = moment().tz("Asia/Kolkata");
    //console.log(nowIST)
    const todayDateIST = nowIST.format("YYYY-MM-DD");
    //console.log(todayDateIST)

    const existingOtp = await OTP.findOne({ email, role: "employee" });

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
        await OTP.deleteOne({ email, role: "employee" });
      }
    }

    // Generate and save new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.create({
      email,
      otp,
      role: "employee",
      createdAt: nowIST.toDate(),
    });

    // Send OTP via email
    await sendOtp(email, otp);

    await logAction({
      action: "LOGIN",
      performedBy: employee._id,
      description: `Employee ${employee.name} (${employee.email}) logged in.`,
    });

    return res.status(200).json({
      message: "OTP sent to your email",
    });
  } catch (e) {
    console.error("OTP request error:", e);
    return res.status(500).json({
      message: "Login OTP request failed",
      error: e.message,
    });
  }
};

//Verify OTP, Login, Token generate
export const verifyOtpAndLogin = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const startOfDay = moment().startOf("day").toDate();
    const endOfDay = moment().endOf("day").toDate();

    const record = await OTP.findOne({
      email,
      role: "employee",
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    //Attempt checks
    await checkOtpRateLimit(email);

    if (!record || record.otp !== otp) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const employee = await Employee.findOne({ email });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const now = moment().tz("Asia/Kolkata");
    const midnight = moment().tz("Asia/Kolkata").endOf("day");
    const secondsUntilMidnight = midnight.diff(now, "seconds");
    //const secondsUntilMidnight = 120;
    const deptName = await Department.findById(employee.department);
    const token = jwt.sign(
      {
        id: employee._id,
        department: deptName.name,
        email: employee.email,
        name: employee.name,
        role: "employee",
      },
      process.env.JWT_SECRET,
      { expiresIn: secondsUntilMidnight }
    );

    //Delete the failed attempts from otpAttempt
    await OtpAttempt.deleteOne({ email });

    return res.status(200).json({
      message: "Login Successfull",
      token,
      employee: {
        name: employee.name,
        email: employee.email,
        department: deptName.name,
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

//Forgot Password OTP request
export const requestPasswordWithOtp = async (req, res) => {
  const { email } = req.body;

  const emp = await Employee.findOne({ email });
  if (!emp) {
    return res.status(400).json({ message: "User not found." });
  }

  await OTP.deleteMany({ email });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await OTP.create({ email, otp });

  await forgotPassOtp(email, otp);

  return res.status(200).json({
    message: "OTP to reset your password sent to your registered email.",
  });
};

//verify forgot password otp and reset password
export const resetPasswordWithOtp = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const employee = await Employee.findOne({ email });
    if (!employee) {
      return res
        .status(404)
        .json({ message: "If this email is registered, an OTP will be sent." });
    }

    await checkOtpRateLimit(email); // check and log attempts first

    const otpRecord = await OTP.findOne({ email });

    if (!otpRecord) {
      return res.status(400).json({ message: "OTP not found or expired." });
    }

    const now = new Date();
    const otpAgeInMinutes = (now - otpRecord.createdAt) / (1000 * 60);

    if (otpAgeInMinutes > 10) {
      await OTP.deleteOne({ email });
      return res
        .status(400)
        .json({ message: "OTP has expired. Please request a new one." });
    }

    if (otpRecord.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await Employee.findOneAndUpdate({ email }, { password: hashedPassword });

    //Cleanup after success
    await OTP.deleteOne({ email });
    await OtpAttempt.deleteOne({ email }); // clear failed attempts

    await logAction({
      action: "UPDATE",
      performedBy: employee._id,
      description: `Password reset via OTP for ${employee.email}`,
    });

    return res
      .status(200)
      .json({ message: "Password reset successful. Please login again." });
  } catch (error) {
    return res.status(402).json({ message: error.message });
  }
};

//Change Password
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const { id: employeeId } = req.user;

  try {
    const employee = await Employee.findById(employeeId);
    console.log(employee);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      employee.password
    );
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Old Password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    employee.password = hashedPassword;
    await employee.save();

    await logAction({
      action: "UPDATE",
      performedBy: employee._id,
      description: `Password changed for ${employee.email}`,
    });

    return res.status(200).json({ message: "Password changed successfully." });
  } catch (e) {
    console.error("Change password error:", e);
    return res.status(500).json({
      message: "Failed to change password",
      error: e.message,
    });
  }
};

//Fetch Profile
export const getMyProfile = async (req, res) => {
  const { id: employeeId } = req.user;

  try {
    const employee = await Employee.findOne({ _id: employeeId })
      .populate("building")
      .populate("department");

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Extract only building name
    const responseData = {
      _id: employee._id,
      name: employee.name,
      email: employee.email,
      contact_no: employee.contact_no,
      department: {
        _id: employee.department._id,
        name: employee.department.name,
      },
      building: {
        _id: employee.building._id,
        name: employee.building.name,
      },
      floor: employee.floor,
      lab_no: employee.lab_no,
      profile_image: employee.profile_image,
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
    };

    return res.status(200).json({
      message: "Profile fetched successfully",
      employee: responseData,
    });
  } catch (e) {
    console.error("Error while fetching profile.", e);
    return res
      .status(500)
      .json({ message: "Failed to fetch profile.", error: e.message });
  }
};

//Update My Profile
export const updateMyProfile = async (req, res) => {
  const { id: employeeId } = req.user;
  const { name, contact_no, building, floor, lab_no } = req.body;

  try {
    const employee = await Employee.findById(employeeId);

    if (!employee) {
      return res.status(404).json({ message: "Employee not found." });
    }

    let buildingDoc;
    if (name) employee.name = name;
    if (contact_no) employee.contact_no = contact_no;

    //Find building ID - If building to be updated, check floor and lab_no as well
    if (building) {
      buildingDoc = await Building.findOne({ name: building });
      if (!buildingDoc) {
        return res.status(400).json({ message: "Building does not exists." });
      }

      //Validate Floor
      const floorData = buildingDoc.floors.find(
        (f) => f.floor === Number(floor)
      );
      if (!floorData)
        return res
          .status(400)
          .json({ message: "Invalid floor for the selected building." });
      //Validate Lab No.
      if (!floorData.labs.includes(lab_no))
        return res
          .status(400)
          .json({ message: "Invalid lab number for the selected floor." });

      employee.building = buildingDoc._id;
      employee.floor = Number(floor);
      employee.lab_no = lab_no;
    }

    //If only floor/lab are to be updated
    else if (floor !== undefined || lab_no !== undefined) {
      const currentBuilding = await Building.findById(employee.building);
      if (!currentBuilding) {
        return res
          .status(400)
          .json({ message: "Associated building not found." });
      }

      const floorData = currentBuilding.floors.find(
        (f) => f.floor === Number(floor ?? employee.floor)
      );
      if (!floorData) {
        return res
          .status(400)
          .json({ message: "Invalid floor for the current building." });
      }

      if (lab_no !== undefined && !floorData.labs.includes(lab_no)) {
        return res
          .status(400)
          .json({ message: "Invalid lab number for the selected floor." });
      }

      if (floor !== undefined) employee.floor = Number(floor);
      if (lab_no !== undefined) employee.lab_no = lab_no;
    }

    if (req.file) {
      //Delete old image from cloudinary
      if (employee.profile_image_public_id) {
        await cloudinary.uploader.destroy(employee.profile_image_public_id);
      }

      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "employee_profiles",
      });
      employee.profile_image = result.secure_url;
      employee.profile_image_public_id = result.public_id;

      fs.unlinkSync(req.file.path);
    }

    await employee.save();

    await logAction({
      action: "UPDATE",
      performedBy: employee._id,
      description: `Employee ${employee.email} updated their profile.`,
    });

    const buildingName = await Building.findById(employee.building);
    const DepartmentName = await Department.findById(employee.department);
    return res.status(200).json({
      message: "Profile updated successfully",
      employee: {
        name: employee.name,
        email: employee.email,
        department: DepartmentName.name,
        contact_no: employee.contact_no,
        building: buildingName.name,
        floor: employee.floor,
        lab_no: employee.lab_no,
        profile_image: employee.profile_image,
      },
    });
  } catch (e) {
    console.error("Error updating profile:", e);
    return res.status(500).json({
      message: "Failed to update profile",
      error: e.message,
    });
  }
};

//Get All Employees - Admin
export const getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find()
      .select("-password")
      .populate("building", "name")
      .populate("department", "name");

    res.status(200).json({
      message: "Employees fetched successfully",
      employees,
    });
  } catch (e) {
    console.error("Error fetching employees:", error);
    res
      .status(500)
      .json({ message: "Error fetching employees", error: error.message });
  }
};

//Get an employee's details and ticket
export const getEmployeeDetails = async (req, res) => {
  const id = req.params.empId;

  try {
    const employee = await Employee.findById(id)
      .select("-password")
      .populate("building", "name")
      .populate("department", "name");
    if (!employee) {
      return res.status(404).json({ message: "Employee not found." });
    }

    const tickets = await Ticket.find({ raised_by: id })
      .sort({ createdAt: -1 })
      .populate("to_department", "name");
    res.status(200).json({
      message: "Employee details fetched successfully.",
      employee,
      tickets,
    });
  } catch (e) {
    console.error("Error fetching employee details : ", e);
    return res
      .status(500)
      .json({ message: "Failed to fetch employee details", error: e.message });
  }
};

//Send All buildings to the employee user or admin
export const sendBuilding = async (req, res) => {
  try {
    const buildings = await Building.find();
    return res.status(200).json({ buildings });
  } catch (e) {
    console.error("Error fetching Buildings:", error);
    return res.status(500).json({ message: "Failed to fetch building" });
  }
};
