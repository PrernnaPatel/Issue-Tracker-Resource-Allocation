"use client"

import { createContext, useContext, useState, useEffect, useRef } from "react"
import { getUnreadTicketUpdates, markAllTicketUpdatesAsViewed } from "../service/deptAuthService"
import notificationSound from "../utils/notificationSound"

const NotificationContext = createContext()

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotificationPanel, setShowNotificationPanel] = useState(false)
  const [unreadTickets, setUnreadTickets] = useState([])
  const [totalUnreadTickets, setTotalUnreadTickets] = useState(0)
  const [isPolling, setIsPolling] = useState(false)
  const [lastFetchTime, setLastFetchTime] = useState(null)

  // Track previous unread ticket IDs to detect new ones
  const previousUnreadIds = useRef(new Set())
  const pollIntervalRef = useRef(null)

  // Load notifications from localStorage on mount
  useEffect(() => {
    const savedNotifications = localStorage.getItem("adminNotifications")
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications)
        setNotifications(parsed)
        setUnreadCount(parsed.filter((n) => !n.read).length)
      } catch {
        localStorage.removeItem("adminNotifications")
      }
    }
  }, [])

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem("adminNotifications", JSON.stringify(notifications))
    }
  }, [notifications])

  // Fetch unread ticket updates
  const fetchUnreadUpdates = async (playSound = false) => {
    if (isPolling) {
      return
    }

    try {
      setIsPolling(true)
      const result = await getUnreadTicketUpdates()

      if (result.success) {
        const newUnreadTickets = result.updatedTickets || []
        const newTotalUnread = newUnreadTickets.length
        const currentUnreadIds = new Set(newUnreadTickets.map((t) => t.ticketId))

        // Check for new unread tickets
        if (playSound && lastFetchTime) {
          const hasNewUnread = [...currentUnreadIds].some((id) => !previousUnreadIds.current.has(id))

          if (hasNewUnread && newTotalUnread > 0) {
            notificationSound.play()
          }
        }

        // Update state
        setUnreadTickets(newUnreadTickets)
        setTotalUnreadTickets(newTotalUnread)
        previousUnreadIds.current = currentUnreadIds
        setLastFetchTime(Date.now())
      } else {
        console.error("❌ [NotificationProvider] API call failed:", result.message)
      }
    } catch (error) {
      console.error("💥 [NotificationProvider] Error fetching unread updates:", {
        error: error.message,
        stack: error.stack,
      })
    } finally {
      setIsPolling(false)
    }
  }

  // Initial fetch and periodic polling
  useEffect(() => {
    // Initial fetch
    fetchUnreadUpdates(false) // Don't play sound on initial load

    // Clear any existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }

    // Set up new interval
    pollIntervalRef.current = setInterval(() => {
      fetchUnreadUpdates(true) // Play sound for subsequent fetches
    }, 30000) // Poll every 30 seconds

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now() + Math.random(), // Ensure unique ID
      ...notification,
      read: false,
      timestamp: new Date().toISOString(),
    }

    setNotifications((prev) => [newNotification, ...prev.slice(0, 49)]) // Keep only last 50
    setUnreadCount((prev) => {
      const newCount = prev + 1
      return newCount
    })

    // Play sound for new notifications
    notificationSound.play()
  }

  const markAsRead = (notificationId) => {
    setNotifications((prev) => {
      const updated = prev.map((notif) => (notif.id === notificationId ? { ...notif, read: true } : notif))
      return updated
    })

    setUnreadCount((prev) => {
      const newCount = Math.max(0, prev - 1)
      return newCount
    })
  }

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })))
    setUnreadCount(0)
    setUnreadTickets([])
    setTotalUnreadTickets(0)
    previousUnreadIds.current = new Set()

    const result = await markAllTicketUpdatesAsViewed()
    if (!result.success) {
      console.error("❌ [NotificationProvider] Failed to mark all as read:", result.message)
      await fetchUnreadUpdates(false)
      return
    }

    await fetchUnreadUpdates(false)
  }

  const clearNotification = (notificationId) => {
    setNotifications((prev) => {
      const notification = prev.find((notif) => notif.id === notificationId)
      const filtered = prev.filter((notif) => notif.id !== notificationId)

      if (notification && !notification.read) {
        setUnreadCount((prev) => {
          const newCount = Math.max(0, prev - 1)
          return newCount
        })
      }

      return filtered
    })
  }

  const toggleNotificationPanel = () => {
    const newState = !showNotificationPanel
    setShowNotificationPanel(newState)
  }

  const refreshUnreadTickets = async () => {
    await fetchUnreadUpdates(false) // Manual refresh, no sound
  }

  // Optimistic update for better UX
  const removeTicketFromUnread = (ticketId) => {
    setUnreadTickets((prev) => {
      const filtered = prev.filter((t) => t.ticketId !== ticketId)
      return filtered
    })

    setTotalUnreadTickets((prev) => {
      const newCount = Math.max(0, prev - 1)
      return newCount
    })

    previousUnreadIds.current.delete(ticketId)
  }

  const value = {
    notifications,
    unreadCount,
    showNotificationPanel,
    unreadTickets,
    totalUnreadTickets,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    toggleNotificationPanel,
    setShowNotificationPanel,
    refreshUnreadTickets,
    removeTicketFromUnread,
    isPolling,
  }

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export default NotificationContext
