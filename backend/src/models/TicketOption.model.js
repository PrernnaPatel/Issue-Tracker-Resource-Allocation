import mongoose from "mongoose";

const ticketOptionSchema = new mongoose.Schema(
  {
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DepartmentalAdmin",
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("TicketOption", ticketOptionSchema);
