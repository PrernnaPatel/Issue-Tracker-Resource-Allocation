import mongoose from "mongoose";

const otpAttemptSchema=mongoose.Schema({
    email:{
        type:String,
        required:true,
    },
    attempts:{
        type:Number,
        default:1
    },
    lastAttemptAt:{
        type:Date,
        default:Date.now,
    },
    lockedUntil:{
        type:Date,
        default:null,
    }
})

export default mongoose.model("OtpAttempt",otpAttemptSchema)