import mongoose, { mongo } from "mongoose";

const departmentalAdminSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    itDepartmentAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DepartmentalAdmin",
      default: null,
    },
    password: {
      type: String,
    },
    isFirstLogin: {
      type: Boolean,
      required: true,
    },
    locations: [
      {
        building: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Building",
          required: true,
        },
        floor: {
          type: Number,
          required: true,
        },
        labs: [
          {
            type: String,
            required: true,
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("DepartmentalAdmin", departmentalAdminSchema);
