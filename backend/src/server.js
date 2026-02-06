import dotenv from "dotenv"
import http from "http"
import { Server } from "socket.io"
import connectDB from "./database/database.js"
import app from "./app.js"

// Load environment variables
dotenv.config()

// Connect to MongoDB
connectDB()

// Create HTTP server
const server = http.createServer(app)

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173", // Employee frontend
      "http://localhost:5174", // Admin frontend
      "http://localhost:5175", // Admin frontend
      "http://localhost:5176",
    ],
    credentials: true,
    methods: ["GET", "POST"],
  },
})

// Attach io to app so controllers can use it
app.set("io", io)

// Handle socket connections
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id)

  // Handle join event (original format)
  socket.on("join", ({ role, department, buildingId, floor }) => {
    console.log("Join event received:", { role, department, buildingId, floor })

    if (role === "departmental-admin" && department) {
      // Regular dept admin - join by department name
      const roomName = `department-${department.toLowerCase()}`
      socket.join(roomName)
      console.log(`Socket ${socket.id} joined room: ${roomName}`)
    }

    if (
      role === "departmental-admin" &&
      department.toLowerCase() === "network engineer" &&
      buildingId &&
      floor !== undefined
    ) {
      // Network engineer room: building + floor
      const networkRoom = `network-${buildingId}-${floor}`
      socket.join(networkRoom)
      console.log(`Socket ${socket.id} joined network room: ${networkRoom}`)
    }
  })

  // Handle join-room event (new format for department ID)
  socket.on("join-room", (roomId) => {
    console.log(`Socket ${socket.id} attempting to join room: ${roomId}`)
    socket.join(roomId)
    console.log(`Socket ${socket.id} successfully joined room: ${roomId}`)

    // Send confirmation back to client
    socket.emit("room-joined", { roomId, success: true })
  })

  // Echo test for debugging
  socket.on("test-echo", (msg) => {
    console.log("Echo received from frontend:", msg)
    socket.emit("test-echo", "hello from backend")
  })

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id)
  })
})

// Start the server
const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})
