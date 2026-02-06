import mongoose from "mongoose";

const componentSchema = new mongoose.Schema(
  {
    componentType: { type: String, required: true },
    tag: { type: String, required: true },
    modelNumber: String,
    manufacturer: String,
  },
  { _id: false }
);

const inventorySystemSchema = new mongoose.Schema(
  {
    tag: { type: String, required: true, unique: true },
    systemName: { type: String, required: true },
    systemType: { type: String, required: true },
    modelNo: { type: String },
    manufacturer: { type: String },
    designation: { type: String },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: false,
    },
    building: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Building",
      required: true,
    },
    floor: { type: String, required: true },
    labNumber: { type: String, required: true },
    ipAddress: String,
    macAddress: String,
    usbStatus: { type: String, enum: ["Enabled", "Disabled"] },
    hasAntivirus: { type: String, enum: ["Yes", "No"] },
    desktopPolicy: { type: String, enum: ["Yes", "No"] },
    remark: String,
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: false,
    },
    ownerName: { type: String, required: false },
    components: [componentSchema], // flat embedded array
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DepartmentalAdmin",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DepartmentalAdmin",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("InventorySystem", inventorySystemSchema);
