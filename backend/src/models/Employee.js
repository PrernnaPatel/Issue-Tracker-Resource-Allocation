import mongoose from "mongoose"

const employeeSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true,
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    contact_no:{
        type:Number,
        required:true,
    },
    department:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Department",
        required:true,
    },
    building:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Building",
        required:true,
    },
    floor:{
        type:Number,
        required:true,
    },
    lab_no:{
        type:String,
        required:true,
    },
    password:{
        type:String,
        required:true,
    },
    securityPin:{
        type:String,
        required:true,
    },
    profile_image:{
        type:String,
        default:""
    },
    profile_image_public_id:{
        type:String,
        default:""
    }
},{timestamps:true})

export default mongoose.model("Employee",employeeSchema)
