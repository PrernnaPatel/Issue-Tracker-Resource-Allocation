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
        "LOGIN_OTP_REQUEST",
        "LOGIN_SUCCESS",
        "FAILED_LOGIN",
        "OTP_LOCKOUT",
        "PASSWORD_CHANGED",
        "FETCH_PROFILE",
        "VIEW_TICKETS",
        "TICKET_STATUS_UPDATE",
        "TICKET_COMMENT_ADDED",
      ],
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DepartmentalAdmin",
      required: false,
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
