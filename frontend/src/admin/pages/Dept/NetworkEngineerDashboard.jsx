"use client"

import { useEffect, useState, useCallback } from "react"
import { Clock, Activity, CheckCircle2, XCircle, Ticket } from "lucide-react"
import { toast } from "react-toastify"
import { useDeptAuth } from "../../context/DeptAuthContext"
import { useDeptSocket } from "../../context/DeptSocketContext"
import {
  getDepartmentTickets,
  getLoggedInDepartmentalAdmin,
  updateTicketStatus,
} from "../../service/deptAuthService"
import { useNavigate } from "react-router-dom"

const statusStyles = {
  pending: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  resolved: "bg-emerald-100 text-emerald-700",
  revoked: "bg-red-100 text-red-700",
}

const priorityStyles = {
  low: "bg-slate-100 text-slate-700",
  normal: "bg-purple-100 text-purple-700",
  high: "bg-rose-100 text-rose-700",
  urgent: "bg-red-100 text-red-700",
}

export default function NetworkEngineerDashboard() {
  const { deptAdmin: contextDeptAdmin } = useDeptAuth()
  const { socket } = useDeptSocket()
  const [deptAdmin, setDeptAdmin] = useState(contextDeptAdmin)
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState([])
  const [activeTab, setActiveTab] = useState("pending")
  const [acceptingId, setAcceptingId] = useState(null)
  const navigate = useNavigate()

  const stats = {
    totalTickets: tickets.length,
    pendingTickets: tickets.filter((ticket) => ticket.status === "pending").length,
    inProgressTickets: tickets.filter((ticket) => ticket.status === "in_progress").length,
    resolvedTickets: tickets.filter((ticket) => ticket.status === "resolved").length,
    revokedTickets: tickets.filter((ticket) => ticket.status === "revoked").length,
  }

  useEffect(() => {
    setDeptAdmin(contextDeptAdmin)
  }, [contextDeptAdmin])

  useEffect(() => {
    async function fetchFullAdmin() {
      try {
        const result = await getLoggedInDepartmentalAdmin()
        if (result.success && result.data) {
          const adminData = result.data.admin || result.data
          setDeptAdmin(adminData)
        }
      } catch (error) {
        console.error("Error fetching admin data:", error)
      }
    }

    fetchFullAdmin()
  }, [])

  useEffect(() => {
    fetchTickets()
  }, [])

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true)
      const result = await getDepartmentTickets()
      if (result.success) {
        setTickets(result.tickets)
      } else {
        toast.error(result.message || "Failed to fetch tickets")
      }
    } catch (error) {
      console.error("Error fetching tickets:", error)
      toast.error(error.message || "Failed to fetch tickets")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!socket) return
    const handleNewTicket = () => {
      fetchTickets()
    }
    socket.on("new-ticket", handleNewTicket)
    socket.on("ticket-assigned", handleNewTicket)
    return () => {
      socket.off("new-ticket", handleNewTicket)
      socket.off("ticket-assigned", handleNewTicket)
    }
  }, [socket, fetchTickets])

  const pendingTickets = tickets.filter((ticket) => ticket.status === "pending")
  const myTickets = tickets.filter((ticket) => {
    const assignedId =
      typeof ticket.assigned_to === "object" ? ticket.assigned_to?._id : ticket.assigned_to
    return assignedId && deptAdmin?._id && String(assignedId) === String(deptAdmin._id)
  })

  const visibleTickets = activeTab === "pending" ? pendingTickets : myTickets

  const handleAcceptTicket = async (ticketId) => {
    try {
      setAcceptingId(ticketId)
      const result = await updateTicketStatus(ticketId, { status: "in_progress" })
      if (result.success) {
        toast.success("Ticket accepted successfully")
        fetchTickets()
      } else {
        toast.error(result.message || "Failed to accept ticket")
      }
    } catch (error) {
      toast.error(error.message || "Failed to accept ticket")
    } finally {
      setAcceptingId(null)
    }
  }

  const formatDate = (value) => {
    if (!value) return "N/A"
    return new Date(value).toLocaleString()
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Network Engineer Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage your pending and assigned tickets</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Total Tickets</p>
              <p className="text-2xl font-bold text-purple-800">{stats.totalTickets}</p>
            </div>
            <div className="p-2 bg-purple-500 rounded-lg">
              <Ticket className="text-white" size={18} />
            </div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Pending Tickets</p>
              <p className="text-2xl font-bold text-blue-800">{stats.pendingTickets}</p>
            </div>
            <div className="p-2 bg-blue-500 rounded-lg">
              <Clock className="text-white" size={18} />
            </div>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-600 font-medium">In Progress</p>
              <p className="text-2xl font-bold text-amber-800">{stats.inProgressTickets}</p>
            </div>
            <div className="p-2 bg-amber-500 rounded-lg">
              <Activity className="text-white" size={18} />
            </div>
          </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-emerald-600 font-medium">Resolved Tickets</p>
              <p className="text-2xl font-bold text-emerald-800">{stats.resolvedTickets}</p>
            </div>
            <div className="p-2 bg-emerald-500 rounded-lg">
              <CheckCircle2 className="text-white" size={18} />
            </div>
          </div>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">Revoked Tickets</p>
              <p className="text-2xl font-bold text-red-800">{stats.revokedTickets}</p>
            </div>
            <div className="p-2 bg-red-500 rounded-lg">
              <XCircle className="text-white" size={18} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 border-b border-gray-200 mb-6">
        {[
          { id: "pending", label: "Pending Requests", count: pendingTickets.length },
          { id: "my", label: "My Tickets", count: myTickets.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 pb-3 text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? "text-purple-600 border-b-2 border-purple-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            <span className="inline-flex items-center justify-center text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="h-8 w-8 rounded-full border-b-2 border-blue-600 animate-spin" />
        </div>
      ) : visibleTickets.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-gray-500">
          No tickets found.
        </div>
      ) : (
        <div className="space-y-4">
          {visibleTickets.map((ticket) => {
            const statusLabel = ticket.status?.replace("_", " ") || "pending"
            const priority = ticket.priority || "normal"
            const buildingName =
              typeof ticket.raised_by?.building === "object"
                ? ticket.raised_by?.building?.name
                : ticket.raised_by?.building
            const floorValue = ticket.raised_by?.floor
            const roomValue = ticket.raised_by?.lab_no || ticket.raised_by?.lab

            return (
              <div
                key={ticket._id}
                onClick={() => {
                  if (activeTab === "my") {
                    navigate(`/dept/my-tickets/${ticket._id}`, {
                      state: { ticket },
                    })
                  }
                }}
                className={`bg-white border border-gray-200 rounded-xl p-5 shadow-sm ${
                  activeTab === "my" ? "cursor-pointer hover:border-gray-300" : ""
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 font-semibold">
                      Ticket ID: {ticket.ticket_id || ticket._id}
                    </p>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {ticket.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                      <span
                        className={`px-2 py-1 rounded-full ${statusStyles[ticket.status] || "bg-gray-100 text-gray-600"}`}
                      >
                        {statusLabel}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full ${priorityStyles[priority] || "bg-gray-100 text-gray-600"}`}
                      >
                        {priority}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                      <div>
                        <span className="font-semibold text-gray-700">Raised by:</span>{" "}
                        {ticket.raised_by?.name || "N/A"}
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Department:</span>{" "}
                        {ticket.from_department || "N/A"}
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Created:</span>{" "}
                        {formatDate(ticket.createdAt)}
                      </div>
                      <div className="md:col-span-3 flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-gray-700">Building:</span>
                          <span>{buildingName || "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-gray-700">Floor:</span>
                          <span>{floorValue ?? "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-gray-700">Lab:</span>
                          <span>{roomValue ?? "N/A"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {activeTab === "pending" && ticket.status === "pending" && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        handleAcceptTicket(ticket._id)
                      }}
                      disabled={acceptingId === ticket._id}
                      className="self-start lg:self-center px-6 py-2 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 disabled:bg-gray-400"
                    >
                      {acceptingId === ticket._id ? "Accepting..." : "Accept Ticket"}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
