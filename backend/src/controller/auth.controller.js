import Admin from "../models/Admin.model.js";
import Employee from "../models/Employee.js";
import DepartmentalAdmin from "../models/DepartmentalAdmin.model.js";
import NetworkEngineer from "../models/NetworkEngineer.model.js";

const buildAccountResponse = (accountType) => {
  if (accountType === "superadmin") {
    return {
      accountType,
      portal: "admin",
      loginFlow: "password",
    };
  }

  if (accountType === "employee") {
    return {
      accountType,
      portal: "user",
      loginFlow: "otp",
    };
  }

  return {
    accountType,
    portal: "dept",
    loginFlow: "otp",
  };
};

export const resolveUserByEmail = async (req, res) => {
  const email = req.query.email?.trim().toLowerCase();

  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  try {
    const [admin, employee, deptAdmin, networkEngineer] = await Promise.all([
      Admin.findOne({ email }).select("_id email"),
      Employee.findOne({ email }).select("_id email"),
      DepartmentalAdmin.findOne({ email }).select("_id email"),
      NetworkEngineer.findOne({ email }).select("_id email"),
    ]);

    const matches = [
      admin && { accountType: "superadmin" },
      employee && { accountType: "employee" },
      deptAdmin && { accountType: "departmental-admin" },
      networkEngineer && { accountType: "network-engineer" },
    ].filter(Boolean);

    if (matches.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    if (matches.length > 1) {
      return res.status(409).json({
        message: "Email is linked to multiple accounts. Please contact support.",
      });
    }

    return res.status(200).json(buildAccountResponse(matches[0].accountType));
  } catch (error) {
    return res.status(500).json({
      message: "Failed to resolve user.",
      error: error.message,
    });
  }
};
