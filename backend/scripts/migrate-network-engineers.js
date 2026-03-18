import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import connectDB from "../src/database/database.js";
import DepartmentalAdmin from "../src/models/DepartmentalAdmin.model.js";
import NetworkEngineer from "../src/models/NetworkEngineer.model.js";
import Ticket from "../src/models/Ticket.model.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const run = async () => {
  try {
    await connectDB();

    const sourceEngineers = await DepartmentalAdmin.find({
      itDepartmentAdmin: { $ne: null },
    }).select("+password");

    if (sourceEngineers.length === 0) {
      console.log("No network engineers found for migration.");
      return;
    }

    const idMap = new Map();

    for (const engineer of sourceEngineers) {
      const existing = await NetworkEngineer.findOne({ email: engineer.email });

      if (existing) {
        idMap.set(String(engineer._id), String(existing._id));
        continue;
      }

      const created = await NetworkEngineer.create({
        name: engineer.name,
        email: engineer.email,
        password: engineer.password,
        isFirstLogin: engineer.isFirstLogin,
        itDepartmentAdmin: engineer.itDepartmentAdmin,
        locations: engineer.locations || [],
      });

      idMap.set(String(engineer._id), String(created._id));
    }

    if (idMap.size > 0) {
      const bulk = [];
      for (const [oldId, newId] of idMap.entries()) {
        bulk.push({
          updateMany: {
            filter: { assigned_to: oldId },
            update: { $set: { assigned_to: newId } },
          },
        });
      }
      if (bulk.length > 0) {
        await Ticket.bulkWrite(bulk);
      }
    }

    await DepartmentalAdmin.deleteMany({ _id: { $in: Array.from(idMap.keys()) } });

    console.log(`Migrated ${idMap.size} network engineers.`);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

run();
