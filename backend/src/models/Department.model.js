import mongoose from "mongoose";

const departmentSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true,
        unique:true,
        trim:true,
    },
    description:{
        type:String,
    },
    canResolve: {
    type: Boolean,
    default: false, // false means can only raise issues
  },
})

export default mongoose.model("Department",departmentSchema)