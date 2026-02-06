import multer from "multer";
import path from "path";
import fs from "fs";
import Ticket from "../models/Ticket.model.js";

// Configure disk storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "attachments");
  },
  filename: async function (req, file, cb) {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const cleanName = path
      .basename(file.originalname, ext)
      .replace(/\s+/g, "_");

    // Check if ticketId is present in URL
    const ticketId = req.params.ticketId || req.body.ticketId;

    if (ticketId) {
      try {
        const ticket = await Ticket.findById(ticketId).select("ticket_id");
        if (ticket && ticket.ticket_id) {
          const newFileName = `${ticket.ticket_id}_${timestamp}${ext}`;
          req.finalFileName = newFileName;
          return cb(null, newFileName);
        }
      } catch (err) {
        console.error("Error fetching ticket for filename:", err);
        return cb(new Error("Error getting ticket info for attachment."));
      }
    }

    // Default (for raiseTicket, will rename later in controller)
    const tempName = `${timestamp}_${cleanName}${ext}`;
    req.tempUploadedFile = tempName;
    cb(null, tempName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|pdf|docx/;
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  const extName = allowedExtensions.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimeType = allowedMimeTypes.includes(file.mimetype);

  if (extName && mimeType) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, DOCX, JPG, JPEG, and PNG files are allowed."));
  }
};

export const fileUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});
