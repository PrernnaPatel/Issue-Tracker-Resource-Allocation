import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"
import mongoose from "mongoose"
import connectDB from "../src/database/database.js"
import Ticket from "../src/models/Ticket.model.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: path.resolve(__dirname, "../.env") })

const run = async () => {
  try {
    await connectDB()

    const filter = {
      assigned_to: { $ne: null },
      status: { $ne: "pending" },
      $or: [{ assigned_manually: { $exists: false } }, { assigned_manually: false }],
    }

    const result = await Ticket.updateMany(filter, [
      {
        $set: {
          assigned_manually: true,
          assigned_at: { $ifNull: ["$assigned_at", "$updatedAt"] },
        },
      },
    ])

    console.log(
      `Backfill complete. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`
    )
  } catch (error) {
    console.error("Backfill failed:", error)
    process.exitCode = 1
  } finally {
    await mongoose.connection.close()
  }
}

run()
