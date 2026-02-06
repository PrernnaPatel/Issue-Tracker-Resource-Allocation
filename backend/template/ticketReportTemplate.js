export const generateTicketReportHTML = ({
  totalIssues,
  resolvedIssues,
  pendingIssues,
  inProgressIssues,
  revokedIssues,
  breakdown,
  chartBase64,
  trendBase64,
  catBase64,
  performanceStats,
  allTickets,
  generatedOn,
  filtersApplied,
}) => {
  const issueRows = allTickets
    .map((t, i) => {
      const ticketId = t.ticket_id || "-";
      const raisedBy = t.raised_by?.name || "N/A";
      const department = t.to_department?.name || "N/A";
      const assignedTo = t.assigned_to?.name || "Unassigned";
      const created = t.createdAt
        ? new Date(t.createdAt).toLocaleString()
        : "N/A";
      const updated = t.updatedAt
        ? new Date(t.updatedAt).toLocaleString()
        : "N/A";
      const resolutionTime =
        t.status === "resolved"
          ? Math.floor(
              (new Date(t.updatedAt) - new Date(t.createdAt)) / (1000 * 60 * 60)
            ) + " hrs"
          : "-";

      const comments =
        t.comments && t.comments.length > 0
          ? `<ul>${t.comments
              .map(
                (c) => `
      <li>
        <strong>${c.by || "N/A"}:</strong>
        ${c.text || ""} 
        <em style="color:gray;">(${
          c.at ? new Date(c.at).toLocaleString() : "N/A"
        })</em>
      </li>`
              )
              .join("")}</ul>`
          : "<em>No comments</em>";

      return `
      <tbody class="ticket-group">
        <tr class="ticket-main-row">
          <td>${i + 1}</td>
          <td>${ticketId}</td>
          <td>${t.title || "Untitled"}</td>
          <td>${department}</td>
          <td>${t.status}</td>
          <td>${raisedBy}</td>
          <td>${assignedTo}</td>
          <td>${created}</td>
          <td>${updated}</td>
          <td>${resolutionTime}</td>
        </tr>
        <tr class="ticket-comments-row">
          <td colspan="10" style="text-align: left; background: #fafafa; padding: 10px;">
            <strong>Comments:</strong> ${comments}
          </td>
        </tr>
      </tbody>
    `;
    })
    .join("");

  const breakdownRows = breakdown
    .map(
      (b) => `
    <tr class="breakdown-row">
      <td>${b.name}</td>
      <td>${b.total}</td>
      <td>${b.resolved}</td>
      <td>${b.pending}</td>
      <td>${b.inProgress}</td>
      <td>${b.revoked}</td>
      <td>${b.avgResolution}</td>
    </tr>
  `
    )
    .join("");

  const fastestResolved = performanceStats.fastestResolved
    ? `${performanceStats.fastestResolved.title} (${performanceStats.fastestResolved.hours} hrs) by ${performanceStats.fastestResolved.department}`
    : "N/A";

  const longestUnresolved = performanceStats.longestUnresolved
    ? `${performanceStats.longestUnresolved.title} (${performanceStats.longestUnresolved.days} days) by ${performanceStats.longestUnresolved.raisedBy}`
    : "N/A";

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    @page {
      margin: 0.75in;
      size: A4;
    }

    body {
      font-family: Arial, sans-serif;
      padding: 0;
      margin: 0;
      color: #333;
      line-height: 1.4;
      orphans: 3;
      widows: 3;
    }

    h1 {
      text-align: center;
      color: #2e3c60;
      border-bottom: 2px solid #2e3c60;
      padding-bottom: 10px;
      margin-bottom: 25px;
      page-break-after: avoid;
    }

    .section-title {
      margin-top: 30px;
      margin-bottom: 15px;
      font-size: 18px;
      color: #2e3c60;
      border-left: 6px solid #2e3c60;
      padding-left: 10px;
      page-break-after: avoid;
      page-break-inside: avoid;
    }

    .section-content {
      page-break-inside: avoid;
      margin-bottom: 20px;
    }

    .summary-grid {
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
      margin-top: 10px;
      page-break-inside: avoid;
    }

    .summary-item {
      flex: 1 1 200px;
      background: #f8f9fb;
      padding: 12px 15px;
      border: 1px solid #ddd;
      border-radius: 5px;
      font-size: 15px;
    }

    .value.resolved { color: #4caf50; }
    .value.pending { color: #ff9800; }
    .value.in-progress { color: #2196f3; }
    .value.revoked { color: #f44336; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      font-size: 13px;
      page-break-inside: auto;
    }

    thead {
      display: table-header-group;
      page-break-inside: avoid;
      page-break-after: avoid;
    }

    tbody {
      page-break-inside: auto;
    }

    .ticket-group {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .ticket-main-row {
      page-break-inside: avoid;
      page-break-after: avoid;
    }

    .ticket-comments-row {
      page-break-before: avoid;
      page-break-inside: avoid;
    }

    .breakdown-row {
      page-break-inside: avoid;
    }

    th, td {
      border: 1px solid #444;
      padding: 8px;
      text-align: center;
      vertical-align: top;
    }

    th {
      background-color: #e8eaf6;
      color: #2e3c60;
      font-weight: bold;
    }

    .chart-container {
      page-break-inside: avoid;
      text-align: center;
      margin: 15px 0;
    }

    img {
      max-width: 100%;
      height: auto;
      page-break-inside: avoid;
    }

    .performance-section {
      page-break-inside: avoid;
    }

    .issue-details-section {
      page-break-before: auto;
    }

    ul {
      margin: 5px 0 0 20px;
      padding: 0;
    }

    li {
      margin-bottom: 6px;
      text-align: left;
      line-height: 1.3;
    }

    .footer {
      text-align: right;
      margin-top: 40px;
      font-size: 12px;
      color: #888;
      border-top: 1px solid #ddd;
      padding-top: 10px;
      page-break-inside: avoid;
    }

    .no-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .new-page {
      page-break-before: always;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .summary-grid {
        display: block;
      }

      .summary-item {
        margin-bottom: 10px;
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <h1>Admin Ticket Report</h1>

  <div class="section-content">
    <h2 class="section-title">1. Filters Applied</h2>
    <p>${filtersApplied}</p>
  </div>

  <div class="section-content">
    <h2 class="section-title">2. Summary Overview</h2>
    <div class="summary-grid">
      <div class="summary-item"><strong>Total:</strong> ${totalIssues}</div>
      <div class="summary-item"><strong>Resolved:</strong> <span class="value resolved">${resolvedIssues}</span></div>
      <div class="summary-item"><strong>Pending:</strong> <span class="value pending">${pendingIssues}</span></div>
      <div class="summary-item"><strong>In Progress:</strong> <span class="value in-progress">${inProgressIssues}</span></div>
      <div class="summary-item"><strong>Revoked:</strong> <span class="value revoked">${revokedIssues}</span></div>
    </div>
  </div>

  <div class="section-content">
    <h2 class="section-title">3. Ticket Status Distribution</h2>
    <div class="chart-container">
      <img src="data:image/png;base64,${chartBase64}" width="400" />
    </div>
  </div>

  <div class="section-content">
    <h2 class="section-title">4. Department-wise Breakdown</h2>
    <table class="no-break">
      <thead>
        <tr>
          <th>Department</th>
          <th>Total</th>
          <th>Resolved</th>
          <th>Pending</th>
          <th>In Progress</th>
          <th>Revoked</th>
          <th>Avg Resolution</th>
        </tr>
      </thead>
      <tbody>${breakdownRows}</tbody>
    </table>
  </div>

  <div class="section-content performance-section">
    <h2 class="section-title">5. Performance Metrics</h2>
    <table class="no-break">
      <thead>
        <tr>
          <th style="width: 30%;">Metric</th>
          <th style="width: 70%;">Details</th>
        </tr>
      </thead>
      <tbody>
        <tr class="breakdown-row">
          <td><strong>Fastest Resolved Ticket</strong></td>
          <td style="text-align: left;">${fastestResolved}</td>
        </tr>
        <tr class="breakdown-row">
          <td><strong>Longest Unresolved Ticket</strong></td>
          <td style="text-align: left;">${longestUnresolved}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="issue-details-section">
    <h2 class="section-title">6. Issue Details with Comments</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 5%;">#</th>
          <th style="width: 10%;">Ticket ID</th>
          <th style="width: 20%;">Title</th>
          <th style="width: 10%;">Department</th>
          <th style="width: 10%;">Status</th>
          <th style="width: 10%;">Raised By</th>
          <th style="width: 10%;">Assigned To</th>
          <th style="width: 10%;">Created</th>
          <th style="width: 10%;">Updated</th>
          <th style="width: 10%;">Resolution Time</th>
        </tr>
      </thead>
      ${issueRows}
    </table>
  </div>

  <div class="footer">
    Report generated on: ${generatedOn}
  </div>
</body>
</html>
  `;
};
