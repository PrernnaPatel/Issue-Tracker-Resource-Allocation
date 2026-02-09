import { createContext, useContext, useEffect, useRef } from "react";
import io from "socket.io-client";
import { useDeptAuth } from "./DeptAuthContext";
import { useNotifications } from "./NotificationContext";
import notificationSound from "../utils/notificationSound";
import { toast } from "react-toastify";

const DeptSocketContext = createContext();

export const DeptSocketProvider = ({ children }) => {
  const { deptAdmin } = useDeptAuth();
  const { addNotification, refreshUnreadTickets } = useNotifications();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!deptAdmin || !deptAdmin.department) return;

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5001", {
      transports: ["polling", "websocket"],
      withCredentials: true,
      timeout: 20000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      // Join rooms logic (same as in DepartmentDashboard)
      const roomsToJoin = [];
      if (typeof deptAdmin.department === "object" && deptAdmin.department._id) {
        roomsToJoin.push(deptAdmin.department._id.toString());
      }
      const departmentName = typeof deptAdmin.department === "object" ? deptAdmin.department.name : deptAdmin.department;
      if (departmentName) {
        roomsToJoin.push(`department-${departmentName.toLowerCase()}`);
      }
      // Debug log for locations
      if (deptAdmin.isNetworkEngineer && deptAdmin.locations?.length > 0) {
        deptAdmin.locations.forEach((location) => {
          const buildingId = typeof location.building === "object" ? location.building._id : location.building;
          if (buildingId && location.floor !== undefined) {
            roomsToJoin.push(`network-${buildingId}-${location.floor}`);
          }
        });
      }
      roomsToJoin.forEach((room) => {
        socket.emit("join-room", room);
      });
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    // Notification handlers
    socket.on("new-ticket", (data) => {
      console.log("[SOCKET] Received new-ticket event:", data);
      notificationSound.play();
      toast.info(
        `New ticket: ${data.title}`,
        {
          autoClose: 5000,
          position: "top-right",
        }
      );
      addNotification({
        type: "new-ticket",
        title: "New Ticket Raised",
        message: `New ticket: ${data.title}`,
        ticketId: data.ticketId,
        priority: data.priority,
        from: data.from,
        raisedAt: data.raisedAt,
      });
      // Refresh unread tickets count
      refreshUnreadTickets();
    });
    socket.on("new-comment", (data) => {
      console.log("[SOCKET] Received new-comment event:", data);
      notificationSound.play();
      toast.info(
        data.employeeName
          ? `New comment from ${data.employeeName} on: ${data.title}`
          : `New comment on: ${data.title}`,
        {
          autoClose: 5000,
          position: "top-right",
        }
      );
      addNotification({
        type: "new-comment",
        title: "New Comment",
        message: `New comment from ${data.employeeName || "Employee"} on: ${data.title}`,
        ticketId: data.ticketId,
      });
      // Refresh unread tickets count
      refreshUnreadTickets();
    });

    // Handle ticket revoked event
    socket.on("ticket-revoked", (data) => {
      console.log("[SOCKET] Received ticket-revoked event:", data);
      notificationSound.play();
      toast.info(
        `Ticket revoked: ${data.title}`,
        {
          autoClose: 5000,
          position: "top-right",
        }
      );
      addNotification({
        type: "ticket-revoked",
        title: "Ticket Revoked",
        message: data.message || `Ticket titled "${data.title}" has been revoked by the employee.`,
        ticketId: data.ticketId,
      });
      // Refresh unread tickets count
      refreshUnreadTickets();
    });

    // Handle status update event
    socket.on("status-update", (data) => {
      console.log("[SOCKET] Received status-update event:", data);
      notificationSound.play();
      toast.info(
        `Ticket status updated: ${data.title} - ${data.status}`,
        {
          autoClose: 5000,
          position: "top-right",
        }
      );
      addNotification({
        type: "status-update",
        title: "Status Updated",
        message: `Ticket "${data.title}" status changed to "${data.status}"`,
        ticketId: data.ticketId,
        status: data.status,
      });
    });

    // Handle ticket updated event
    socket.on("ticket-updated", (data) => {
      console.log("[SOCKET] Received ticket-updated event:", data);
      notificationSound.play();
      toast.info(
        `Ticket updated: ${data.title}`,
        {
          autoClose: 5000,
          position: "top-right",
        }
      );
      addNotification({
        type: "ticket-updated",
        title: "Ticket Updated",
        message: `Ticket "${data.title}" has been updated`,
        ticketId: data.ticketId,
      });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [deptAdmin]);

  return (
    <DeptSocketContext.Provider value={{ socket: socketRef.current }}>
      {children}
    </DeptSocketContext.Provider>
  );
};

export const useDeptSocket = () => useContext(DeptSocketContext); 
