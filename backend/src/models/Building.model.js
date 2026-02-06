import mongoose from "mongoose";

const LabSchema = new mongoose.Schema({
  floor: Number,
  labs: [String],
});

const BuildingSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  floors: [LabSchema],
});

export const Building=mongoose.model("Building",BuildingSchema)
