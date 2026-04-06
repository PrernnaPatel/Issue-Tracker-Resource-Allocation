import express from "express";
import { resolveUserByEmail } from "../controller/auth.controller.js";

const router = express.Router();

router.get("/resolve-user", resolveUserByEmail);

export default router;
