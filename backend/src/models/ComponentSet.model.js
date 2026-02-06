// models/ComponentSet.js
import mongoose from "mongoose";

const componentSetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // "Desktop Setup"
    systemType: { type: String, required: true }, // "Desktop", "Laptop", etc.
    components: [
      {
        componentType: { type: String, required: true },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    }, // Superadmin
  },
  { timestamps: true }
);

export default mongoose.model("ComponentSet", componentSetSchema);
