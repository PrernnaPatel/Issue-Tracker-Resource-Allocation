import mongoose from "mongoose";

const actionLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        "CREATE",
        "UPDATE",
        "DELETE",
        "BULK_UPDATE",
        "BULK_DELETE",
        "EXPORT",
        "LOGIN",
        "VIEW_TICKETS",
        "TICKET_COMMENT_ADDED",
      ],
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DepartmentalAdmin",
      required: true,
    },
    affectedSystem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventorySystem",
    },
    systemIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "InventorySystem",
      },
    ],
    description: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

export default mongoose.model("ActionLog", actionLogSchema);
