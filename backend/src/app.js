import express from "express";
import cors from "cors";
import employeeroutes from "./routes/employee.routes.js";
import adminroutes from "./routes/admin.routes.js"
import deptAdminroutes from "./routes/departmentalAdmin.routes.js"
import authroutes from "./routes/auth.routes.js";
import bodyParser from "body-parser";

const app = express();
/* app.use(cors({
  origin:"http://localhost:5173",
  credentials:true
})); */

const allowedOrigins = [
  "http://localhost:5173", // Employee frontend
  "http://localhost:5174", // Admin frontend 
  "http://localhost:5175",
  "http://localhost:5176", // Admin frontend 
  "http://localhost:5177",
  "http://localhost:5178",
  "http://localhost:4173",
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));


app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/api/employees", employeeroutes); // base route for employees
app.use("/api/admin", adminroutes); // base route for admin
app.use("/api/dept-admin", deptAdminroutes); // base route for departmental admin
app.use("/api/auth", authroutes);

export default app;
