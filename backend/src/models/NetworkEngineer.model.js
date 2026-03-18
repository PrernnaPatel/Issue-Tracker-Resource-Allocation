import mongoose from "mongoose";

const networkEngineerSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    itDepartmentAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DepartmentalAdmin",
      required: true,
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

export default mongoose.model("NetworkEngineer", networkEngineerSchema);
