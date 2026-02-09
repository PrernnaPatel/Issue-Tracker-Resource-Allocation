"use client"

import { Bell, User, Menu } from "lucide-react"
import { useDeptAuth } from "../context/DeptAuthContext"
import { useNotifications } from "../context/NotificationContext"
import { useNavigate } from "react-router-dom"
import { useRef, useEffect } from "react"

const DepartmentAdminHeader = ({ onMenuClick }) => {
  const { deptAdmin } = useDeptAuth()
  const {
    unreadCount,
    totalUnreadTickets,
    notifications,
    showNotificationPanel,
    toggleNotificationPanel,
    markAsRead,
    markAllAsRead,
    clearNotification,
    isPolling,
  } = useNotifications()
  const navigate = useNavigate()
  const notificationRef = useRef(null)

  // Log notification state changes
  useEffect(() => {
    // console.log("🔔 [DepartmentalAdminHeader] Notification state update:", {
    //   unreadCount,
    //   totalUnreadTickets,
    //   notificationsCount: notifications.length,
    //   isPolling,
    //   showNotificationPanel,
    // })
  }, [unreadCount, totalUnreadTickets, notifications.length, isPolling, showNotificationPanel])

  const handleProfileClick = () => {
    // console.log("👤 [DepartmentalAdminHeader] Profile clicked")
    navigate("/dept/profile")
  }

  const handleNotificationClick = () => {
    // console.log("🔔 [DepartmentalAdminHeader] Notification bell clicked")
    toggleNotificationPanel()
  }

  // const handleRefreshClick = async () => {
  //   console.log("🔄 [DepartmentalAdminHeader] Manual refresh clicked")
  //   await refreshUnreadTickets()
  // }

  // Close notification panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        if (showNotificationPanel) {
          // console.log("👆 [DepartmentalAdminHeader] Clicked outside notification panel, closing")
          toggleNotificationPanel()
        }
      }
    }

    if (showNotificationPanel) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showNotificationPanel, toggleNotificationPanel])

  // Calculate total badge count
  const totalBadgeCount = Math.max(unreadCount, totalUnreadTickets)

  // console.log("🎯 [DepartmentalAdminHeader] Badge calculation:", {
  //   unreadCount,
  //   totalUnreadTickets,
  //   totalBadgeCount,
  // })

  return (
    <header className="fixed top-0 right-0 lg:left-64 h-16 bg-white border-b border-gray-300 px-6 py-4 flex items-center justify-between z-40">
      {/* Left Section - Mobile Menu Button */}
      <button onClick={onMenuClick} className="lg:hidden p-2 rounded-md text-gray-500 hover:bg-gray-200">
        <Menu size={20} />
      </button>

      {/* Right Section */}
      <div className="flex items-center space-x-4 ml-auto">

        {/* Manual Refresh Button */}
        {/* <button
          onClick={handleRefreshClick}
          className="px-3 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
          disabled={isPolling}
        >
          {isPolling ? "Refreshing..." : "Refresh"}
        </button> */}

        {/* Notification Bell */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={handleNotificationClick}
            className={`relative p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors ${
              isPolling ? "animate-pulse" : ""
            }`}
            disabled={isPolling}
          >
            <Bell size={20} />
            {totalBadgeCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium animate-pulse">
                {totalBadgeCount > 99 ? "99+" : totalBadgeCount}
              </span>
            )}
          </button>

          {/* Notification Panel */}
          {showNotificationPanel && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Notifications {isPolling && <span className="text-xs text-blue-500">(Updating...)</span>}
                  </h3>
                  {totalBadgeCount > 0 && (
                    <button
                      onClick={() => {
                        // console.log("👁️‍🗨️ [DepartmentalAdminHeader] Mark all as read clicked")
                        markAllAsRead()
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                {totalUnreadTickets > 0 && (
                  <div className="mt-2 text-xs text-orange-600 font-medium">
                    {totalUnreadTickets} ticket{totalUnreadTickets > 1 ? "s" : ""} with updates
                  </div>
                )}
                <div className="mt-1 text-xs text-gray-400">
                  Debug: Notifications: {notifications.length}, Unread: {unreadCount}, Tickets: {totalUnreadTickets}
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <Bell size={24} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No notifications</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                          !notification.read ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
                        }`}
                        onClick={() => {
                          // console.log("👁️ [DepartmentalAdminHeader] Notification clicked:", notification.id)
                          markAsRead(notification.id)
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900">{notification.title}</h4>
                            <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                            <p className="text-xs text-gray-400 mt-2">
                              {new Date(notification.timestamp).toLocaleString()}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 flex-shrink-0"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {notifications.length > 0 && (
                <div className="p-3 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={() => {
                      // console.log("🗑️ [DepartmentalAdminHeader] Clear all notifications clicked")
                      notifications.forEach((n) => clearNotification(n.id))
                    }}
                    className="w-full text-xs text-red-600 hover:text-red-800 font-medium"
                  >
                    Clear all notifications
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile Section */}
        <div
          onClick={handleProfileClick}
          className="flex items-center space-x-3 cursor-pointer hover:bg-gray-200 p-2 rounded-lg transition-colors"
        >
          <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full flex items-center justify-center overflow-hidden">
            <User size={18} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-800">{deptAdmin?.name || "John Doe"}</span>
            <span className="text-xs text-gray-500 lg:hidden">{deptAdmin?.department || "IT Department"}</span>
          </div>
        </div>
      </div>
    </header>
  )
}

export default DepartmentAdminHeader
