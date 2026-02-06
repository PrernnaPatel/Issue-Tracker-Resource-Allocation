import ActionLog from "../models/ActionLog.model.js";

/**
 * Logs an action performed on an inventory system.
 *
 * @param {Object} params
 * @param {"CREATE"|"UPDATE"|"DELETE"|"BULK_UPDATE"|"BULK_DELETE"|"EXPORT"|"LOGIN"|"VIEW_TICKETS"|"TICKET_COMMENT_ADDED"} params.action - Action type
 * @param {string} params.performedBy - DepartmentalAdmin ID
 * @param {string} [params.affectedSystem] - A single inventory system ID (for single actions)
 * @param {string[]} [params.systemIds] - Array of system IDs (for bulk operations)
 * @param {string} [params.description] - Human-readable description of the action
 */
export const logAction = async ({
  action,
  performedBy,
  affectedSystem,
  systemIds,
  description,
}) => {
  try {
    await ActionLog.create({
      action,
      performedBy,
      affectedSystem,
      systemIds,
      description,
    });
  } catch (err) {
    console.error("Failed to log action:", err.message);
    // You may also send this error to a central error-monitoring service
  }
};
