import multer from "multer"
import cloudinary from "../utils/cloudinary.js"
import fs from "fs"

const storage=multer.diskStorage({})
const upload=multer({storage})

export default upload