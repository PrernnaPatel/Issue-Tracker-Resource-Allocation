"use client"

import { useEffect, useState, useCallback } from "react"
import { Clock, Activity, CheckCircle2, XCircle, Ticket } from "lucide-react"
import { toast } from "react-toastify"
import { useDeptAuth } from "../../context/DeptAuthContext"
import { useDeptSocket } from "../../context/DeptSocketContext"
import {
  getDepartmentTickets,
  getLoggedInDepartmentalAdmin,
} from "../../service/deptAuthService"

const statusStyles = {
  pending: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  resolved: "bg-emerald-100 text-emerald-700",
  revoked: "bg-red-100 text-red-700",
}

export default function DepartmentDashboard() {
  const { deptAdmin: contextDeptAdmin } = useDeptAuth()
  const { socket } = useDeptSocket()
  const [deptAdmin, setDeptAdmin] = useState(contextDeptAdmin)
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState([])
  const [activeTab, setActiveTab] = useState("recent")

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
    return () => {
      socket.off("new-ticket", handleNewTicket)
    }
  }, [socket, fetchTickets])

  const formatDate = (value) => {
    if (!value) return "N/A"
    return new Date(value).toLocaleString()
  }

  const recentTickets = [...tickets].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  )

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {deptAdmin?.name || "Departmental Admin"}
        </h1>
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
        <button
          onClick={() => setActiveTab("recent")}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold transition-colors ${
            activeTab === "recent"
              ? "text-purple-600 border-b-2 border-purple-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Ticket size={16} />
          Recent Tickets
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="h-8 w-8 rounded-full border-b-2 border-blue-600 animate-spin" />
        </div>
      ) : recentTickets.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-gray-500">
          No tickets found.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ticket ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Created At</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Raised By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentTickets.map((ticket) => (
                <tr key={ticket._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{ticket.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{ticket.ticket_id || ticket._id}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${statusStyles[ticket.status] || "bg-gray-100 text-gray-600"}`}
                    >
                      {ticket.status === "in_progress"
                        ? "In Progress"
                        : ticket.status?.charAt(0).toUpperCase() + ticket.status?.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{formatDate(ticket.createdAt)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{ticket.raised_by?.name || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
