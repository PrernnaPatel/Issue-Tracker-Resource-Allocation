import mongoose from "mongoose";

const ticketSchema = mongoose.Schema(
  {
    ticket_id: {
      type: String,
      unique: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    from_department: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "revoked", "resolved"],
      default: "pending",
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },
    raised_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    to_department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    attachment: {
      type: String,
      default: "",
    },
    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NetworkEngineer",
      default: null,
    },
    assigned_manually: {
      type: Boolean,
      default: false,
    },
    assigned_at: {
      type: Date,
      default: null,
    },
    comments: [
      {
        text: { type: String, required: true },
        by: {
          type: String,
          enum: ["employee", "departmental-admin"],
          required: true,
        },
        at: { type: Date, default: Date.now },
        attachment: String,
      },
    ],
    // Simplified view tracking - use only this field
    admin_views: [
      {
        admin_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "DepartmentalAdmin",
          required: true,
        },
        last_viewed_at: {
          type: Date,
          required: true,
          default: Date.now,
        },
      },
    ],
    // Track last activity for better unread detection
    last_activity_at: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Update last_activity_at when ticket is modified (but not for view updates)
ticketSchema.pre("save", function (next) {
  if (this.isModified() && !this.isNew) {
    // Ignore Mongoose timestamp updates when deciding activity
    const modifiedPaths = this.modifiedPaths().filter(
      (path) => path !== "updatedAt"
    );
    const isOnlyViewUpdate =
      modifiedPaths.length === 1 && modifiedPaths[0] === "admin_views";

    if (!isOnlyViewUpdate) {
      this.last_activity_at = new Date();
      console.log(
        "📅 [Ticket Schema] Updated last_activity_at:",
        this.last_activity_at
      );
    } else {
      console.log(
        "👁 [Ticket Schema] Skipping activity update for view-only change"
      );
    }
  }
  next();
});

export default mongoose.model("Ticket", ticketSchema);
