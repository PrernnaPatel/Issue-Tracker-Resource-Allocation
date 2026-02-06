import mongoose from "mongoose";
import dotenv from "dotenv";
import Ticket from "../models/Ticket.model.js"; 
import connectDB from "../database/database.js";

dotenv.config();

const deleteAllTickets = async () => {
  connectDB();

  try {
    const result = await Ticket.deleteMany({});
    console.log(`${result.deletedCount} tickets deleted.`);
  } catch (err) {
    console.error("Error deleting tickets:", err);
  } finally {
    process.exit();
  }
};

deleteAllTickets();
