import PDFDocument from "pdfkit";
import Ticket from "../models/Ticket.model.js";
import Employee from "../models/Employee.js";
import Department from "../models/Department.model.js";
import moment from "moment";
import ExcelJS from "exceljs";
import puppeteer from "puppeteer";
import { generateTicketReportHTML } from "../../template/ticketReportTemplate.js";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import DepartmentalAdmin from "../models/DepartmentalAdmin.model.js";
import InventorySystem from "../models/InventorySystem.model.js";
import { Building } from "../models/Building.model.js";
import { logAction } from "../utils/logAction.js";

//Default export Report
export const exportTicketReport = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      status = "all",
      includeComments = "false",
    } = req.query;

    const ticketQuery = {};
    let filtersApplied = [];

    if (startDate || endDate) {
      ticketQuery.createdAt = {};
      if (startDate) {
        ticketQuery.createdAt.$gte = new Date(startDate);
        filtersApplied.push(`Start Date: ${moment(startDate).format("LL")}`);
      }
      if (endDate) {
        ticketQuery.createdAt.$lte = new Date(endDate);
        filtersApplied.push(`End Date: ${moment(endDate).format("LL")}`);
      }
    }

    if (status !== "all") {
      const statusArray = status.split(",");
      ticketQuery.status = { $in: statusArray };
      filtersApplied.push(`Status: ${statusArray.join(", ")}`);
    }

    filtersApplied.push(
      `Comments Included: ${includeComments === "true" ? "Yes" : "No"}`
    );

    const tickets = await Ticket.find(ticketQuery).populate([
      { path: "raised_by", select: "name email building floor lab_no" },
      { path: "to_department", select: "name" },
      { path: "assigned_to", select: "name email" },
    ]);

    const departments = await Department.find();

    const totalIssues = tickets.length;
    const resolvedIssues = tickets.filter(
      (t) => t.status === "resolved"
    ).length;
    const pendingIssues = tickets.filter((t) => t.status === "pending").length;
    const inProgressIssues = tickets.filter(
      (t) => t.status === "in_progress"
    ).length;
    const revokedIssues = tickets.filter((t) => t.status === "revoked").length;

    const breakdown = departments.map((dept) => {
      const deptTickets = tickets.filter(
        (t) => t.to_department?.name === dept.name
      );
      const resolved = deptTickets.filter(
        (t) => t.status === "resolved"
      ).length;
      const pending = deptTickets.filter((t) => t.status === "pending").length;
      const inProgress = deptTickets.filter(
        (t) => t.status === "in_progress"
      ).length;
      const revoked = deptTickets.filter((t) => t.status === "revoked").length;
      const resolutionTimes = deptTickets
        .filter((t) => t.status === "resolved")
        .map((t) => moment(t.updatedAt).diff(t.createdAt, "days"));
      const avgResolution = resolutionTimes.length
        ? (
            resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
          ).toFixed(1) + " days"
        : "N/A";
      return {
        name: dept.name,
        total: deptTickets.length,
        resolved,
        pending,
        inProgress,
        revoked,
        avgResolution,
      };
    });

    // PIE CHART
    const pieCanvas = new ChartJSNodeCanvas({ width: 400, height: 400 });
    const pieBuffer = await pieCanvas.renderToBuffer({
      type: "pie",
      data: {
        labels: ["Resolved", "Pending", "In Progress", "Revoked"],
        datasets: [
          {
            data: [
              resolvedIssues,
              pendingIssues,
              inProgressIssues,
              revokedIssues,
            ],
            backgroundColor: ["#4caf50", "#ff9800", "#2196f3", "#9e9e9e"],
          },
        ],
      },
      options: { plugins: { legend: { position: "bottom" } } },
    });
    const chartBase64 = pieBuffer.toString("base64");

    const monthlyStats = {};
    const categoryCounts = {};
    const performanceStats = { longestUnresolved: null, fastestResolved: null };

    for (let ticket of tickets) {
      const month = moment(ticket.createdAt).format("MMM YYYY");
      if (!monthlyStats[month])
        monthlyStats[month] = { raised: 0, resolved: 0 };
      monthlyStats[month].raised++;
      if (ticket.status === "resolved") monthlyStats[month].resolved++;

      ticket.title
        .toLowerCase()
        .split(/\W+/)
        .forEach((word) => {
          if (
            ["network", "system", "leave", "portal", "bug", "access"].includes(
              word
            )
          ) {
            categoryCounts[word] = (categoryCounts[word] || 0) + 1;
          }
        });

      if (ticket.status !== "resolved") {
        const daysOpen = moment().diff(ticket.createdAt, "days");
        if (
          !performanceStats.longestUnresolved ||
          daysOpen > performanceStats.longestUnresolved.days
        ) {
          performanceStats.longestUnresolved = {
            title: ticket.title,
            days: daysOpen,
            raisedBy: ticket.raised_by?.name || "N/A",
          };
        }
      }

      if (ticket.status === "resolved") {
        const hoursToResolve = moment(ticket.updatedAt).diff(
          ticket.createdAt,
          "hours"
        );
        if (
          !performanceStats.fastestResolved ||
          hoursToResolve < performanceStats.fastestResolved.hours
        ) {
          performanceStats.fastestResolved = {
            title: ticket.title,
            hours: hoursToResolve,
            department: ticket.to_department?.name || "N/A",
          };
        }
      }
    }

    const trendCanvas = new ChartJSNodeCanvas({ width: 600, height: 300 });
    const trendBuffer = await trendCanvas.renderToBuffer({
      type: "line",
      data: {
        labels: Object.keys(monthlyStats),
        datasets: [
          {
            label: "Raised",
            data: Object.values(monthlyStats).map((m) => m.raised),
            borderColor: "#f39c12",
            fill: false,
          },
          {
            label: "Resolved",
            data: Object.values(monthlyStats).map((m) => m.resolved),
            borderColor: "#2ecc71",
            fill: false,
          },
        ],
      },
    });
    const trendBase64 = trendBuffer.toString("base64");

    const catCanvas = new ChartJSNodeCanvas({ width: 500, height: 300 });
    const catBuffer = await catCanvas.renderToBuffer({
      type: "bar",
      data: {
        labels: Object.keys(categoryCounts),
        datasets: [
          {
            label: "Issue Count",
            data: Object.values(categoryCounts),
            backgroundColor: "#3e95cd",
          },
        ],
      },
    });
    const catBase64 = catBuffer.toString("base64");

    // === Final HTML Generation ===
    const html = generateTicketReportHTML({
      totalIssues,
      resolvedIssues,
      pendingIssues,
      inProgressIssues,
      revokedIssues,
      breakdown,
      generatedOn: moment().format("LLL"),
      chartBase64,
      trendBase64,
      catBase64,
      performanceStats,
      allTickets:
        includeComments === "true"
          ? tickets
          : tickets.map((t) => ({
              ...t.toObject(),
              comments: [],
              ticket_id: t.ticket_id, // ⬅ ensure ticket_id is passed
            })),
      filtersApplied: filtersApplied.length
        ? filtersApplied.join(", ")
        : "None (Full report)",
    });

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Admin_report.pdf"
    );
    res.send(pdfBuffer);
  } catch (e) {
    console.error("Report generation failed:", e);
    res
      .status(500)
      .json({ message: "Failed to generate report", error: e.message });
  }
};

export const exportTicketReportExcel = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      status = "all",
      departments = "all",
      includeComments = "false",
    } = req.query;

    const ticketQuery = {};

    if (startDate || endDate) {
      ticketQuery.createdAt = {};
      if (startDate) ticketQuery.createdAt.$gte = new Date(startDate);
      if (endDate) ticketQuery.createdAt.$lte = new Date(endDate);
    }

    if (status !== "all") {
      const statusArray = status.split(",");
      ticketQuery.status = { $in: statusArray };
    }

    let deptList = [];
    if (departments !== "all") {
      const departmentArray = departments.split(",");
      const foundDepts = await Department.find({ name: { $in: departmentArray } });
      deptList = foundDepts.map((d) => d._id);
      ticketQuery.to_department = { $in: deptList };
    }

    const tickets = await Ticket.find(ticketQuery)
      .populate("raised_by to_department")
      .lean();

    const allDepartments = await Department.find();

    const totalIssues = tickets.length;
    const resolvedIssues = tickets.filter((t) => t.status === "resolved").length;
    const pendingIssues = tickets.filter((t) => ["pending", "in_progress"].includes(t.status)).length;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Ticket Report");

    worksheet.mergeCells("A1:F1");
    worksheet.getCell("A1").value = "Admin Ticket Report";
    worksheet.getCell("A1").font = { size: 16, bold: true };
    worksheet.getCell("A1").alignment = { horizontal: "center" };

    worksheet.addRow([]);
    worksheet.addRow(["Summary Overview"]);
    worksheet.addRow(["Total Issues Raised", totalIssues]);
    worksheet.addRow(["Total Issues Resolved", resolvedIssues]);
    worksheet.addRow(["Total Issues Pending", pendingIssues]);
    worksheet.addRow([]);

    worksheet.addRow(["Department", "Total", "Resolved", "Pending", "Avg Resolution"]);
    const headerRow = worksheet.getRow(7);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    const selectedDepartments =
      departments === "all"
        ? allDepartments
        : allDepartments.filter((d) => departments.split(",").includes(d.name));

    for (const dept of selectedDepartments) {
      const deptTickets = tickets.filter((t) => t.to_department?.name === dept.name);
      const resolved = deptTickets.filter((t) => t.status === "resolved").length;
      const pending = deptTickets.filter((t) => ["pending", "in_progress"].includes(t.status)).length;
      const resolutionTimes = deptTickets
        .filter((t) => t.status === "resolved")
        .map((t) => moment(t.updatedAt).diff(t.createdAt, "days"));
      const avgResolution = resolutionTimes.length
        ? (resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length).toFixed(1) + " days"
        : "N/A";
      worksheet.addRow([dept.name, deptTickets.length, resolved, pending, avgResolution]);
    }

    worksheet.addRow([]);
    worksheet.addRow(["All Ticket Details"]);
    const ticketHeader = [
      "Ticket ID",
      "Title",
      "Status",
      "Department",
      "Raised By",
      "Created At",
      "Updated At",
      "Resolution Time",
    ];
    if (includeComments === "true") ticketHeader.push("Comments");

    worksheet.addRow(ticketHeader).eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCE6F1" } };
    });

    for (const t of tickets) {
      const created = t.createdAt ? moment(t.createdAt).format("LLL") : "N/A";
      const updated = t.updatedAt ? moment(t.updatedAt).format("LLL") : "N/A";
      const resolutionTime =
        t.status === "resolved"
          ? Math.floor((new Date(t.updatedAt) - new Date(t.createdAt)) / (1000 * 60 * 60)) + " hrs"
          : "-";
      const row = [
        t.ticket_id || "-",
        t.title,
        t.status,
        t.to_department?.name || "N/A",
        t.raised_by?.name || "N/A",
        created,
        updated,
        resolutionTime,
      ];
      if (includeComments === "true") {
        const comments =
          (t.comments || [])
            .map((c) => `(${c.by || "N/A"} - ${moment(c.at).format("LLL") || "N/A"}) ${c.text}`)
            .join("\n") || "No comments";
        row.push(comments);
      }
      worksheet.addRow(row);
    }

    worksheet.addRow([]);
    worksheet.addRow([`Report generated on: ${moment().format("LLL")}`]);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=Admin_Report.xlsx");

    await workbook.xlsx.write(res);

    await logAction({
      action: "EXPORT",
      performedBy: req.user.id,
      description: "Exported ticket Excel report (Superadmin)",
    });

    res.end();
  } catch (e) {
    console.error("Excel report generation failed:", e);
    res.status(500).json({
      message: "Failed to generate Excel report",
      error: e.message,
    });
  }
};

export const exportDepartmentalReport = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      status = "all",
      includeComments = "false",
    } = req.query;

    const { id: adminId } = req.user;

    const admin = await DepartmentalAdmin.findById(adminId).populate("department");
    if (!admin) return res.status(403).json({ message: "Unauthorized" });

    const departmentName = admin.department?.name;
    if (!departmentName)
      return res.status(400).json({ message: "Department not found." });

    const ticketQuery = {};
    let filtersApplied = [`Department: ${departmentName}`];

    const isNetworkEngineer = departmentName.toLowerCase() === "network engineer";
    const scopedDepartment = isNetworkEngineer
      ? await Department.findOne({ name: /^it(\s+department)?$/i })
      : await Department.findOne({ name: departmentName });

    if (!scopedDepartment) {
      return res.status(400).json({ message: "Department not found." });
    }

    ticketQuery.to_department = scopedDepartment._id;

    if (isNetworkEngineer) {
      const assignedLocations = admin.locations.map((loc) => ({
        building: loc.building.toString(),
        floor: loc.floor,
        lab_no: { $in: loc.labs || [] },
      }));

      const allEmployeeIds = await Employee.find({
        $or: assignedLocations,
      }).distinct("_id");

      ticketQuery.raised_by = { $in: allEmployeeIds };
    }

    if (startDate || endDate) {
      ticketQuery.createdAt = {};
      if (startDate) {
        ticketQuery.createdAt.$gte = new Date(startDate);
        filtersApplied.push(`Start Date: ${moment(startDate).format("LL")}`);
      }
      if (endDate) {
        ticketQuery.createdAt.$lte = new Date(endDate);
        filtersApplied.push(`End Date: ${moment(endDate).format("LL")}`);
      }
    }

    if (status !== "all") {
      const statusArray = status.split(",");
      ticketQuery.status = { $in: statusArray };
      filtersApplied.push(`Status: ${statusArray.join(", ")}`);
    }

    if (includeComments === "true") {
      filtersApplied.push("Comments Included: Yes");
    } else {
      filtersApplied.push("Comments Included: No");
    }

    const tickets = await Ticket.find(ticketQuery).populate([
      { path: "raised_by", select: "name email building floor lab_no" },
      { path: "to_department", select: "name" },
      { path: "assigned_to", select: "name email" },
    ]);

    const totalIssues = tickets.length;
    const resolvedIssues = tickets.filter((t) => t.status === "resolved").length;
    const pendingIssues = tickets.filter((t) => t.status === "pending").length;
    const inProgressIssues = tickets.filter((t) => t.status === "in_progress").length;
    const revokedIssues = tickets.filter((t) => t.status === "revoked").length;

    const resolutionTimes = tickets
      .filter((t) => t.status === "resolved")
      .map((t) => moment(t.updatedAt).diff(t.createdAt, "days"));
    const avgResolution = resolutionTimes.length
      ? (
          resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
        ).toFixed(1) + " days"
      : "N/A";

    const pieCanvas = new ChartJSNodeCanvas({ width: 400, height: 400 });
    const pieBuffer = await pieCanvas.renderToBuffer({
      type: "pie",
      data: {
        labels: ["Resolved", "Pending", "In Progress", "Revoked"],
        datasets: [
          {
            data: [
              resolvedIssues,
              pendingIssues,
              inProgressIssues,
              revokedIssues,
            ],
            backgroundColor: ["#4caf50", "#ff9800", "#2196f3", "#9e9e9e"],
          },
        ],
      },
      options: { plugins: { legend: { position: "bottom" } } },
    });
    const chartBase64 = pieBuffer.toString("base64");

    const monthlyStats = {},
      categoryCounts = {};
    const performanceStats = { longestUnresolved: null, fastestResolved: null };

    for (let ticket of tickets) {
      const month = moment(ticket.createdAt).format("MMM YYYY");
      if (!monthlyStats[month]) monthlyStats[month] = { raised: 0, resolved: 0 };
      monthlyStats[month].raised++;
      if (ticket.status === "resolved") monthlyStats[month].resolved++;

      ticket.title
        .toLowerCase()
        .split(/\W+/)
        .forEach((word) => {
          if (["network", "system", "leave", "portal", "bug", "access"].includes(word)) {
            categoryCounts[word] = (categoryCounts[word] || 0) + 1;
          }
        });

      if (ticket.status !== "resolved") {
        const daysOpen = moment().diff(ticket.createdAt, "days");
        if (!performanceStats.longestUnresolved || daysOpen > performanceStats.longestUnresolved.days) {
          performanceStats.longestUnresolved = {
            title: ticket.title,
            days: daysOpen,
            raisedBy: ticket.raised_by?.name || "N/A",
          };
        }
      }

      if (ticket.status === "resolved") {
        const hoursToResolve = moment(ticket.updatedAt).diff(ticket.createdAt, "hours");
        if (!performanceStats.fastestResolved || hoursToResolve < performanceStats.fastestResolved.hours) {
          performanceStats.fastestResolved = {
            title: ticket.title,
            hours: hoursToResolve,
            department: ticket.to_department?.name || "N/A",
          };
        }
      }
    }

    const trendCanvas = new ChartJSNodeCanvas({ width: 600, height: 300 });
    const trendBuffer = await trendCanvas.renderToBuffer({
      type: "line",
      data: {
        labels: Object.keys(monthlyStats),
        datasets: [
          {
            label: "Raised",
            data: Object.values(monthlyStats).map((m) => m.raised),
            borderColor: "#f39c12",
            fill: false,
          },
          {
            label: "Resolved",
            data: Object.values(monthlyStats).map((m) => m.resolved),
            borderColor: "#2ecc71",
            fill: false,
          },
        ],
      },
    });
    const trendBase64 = trendBuffer.toString("base64");

    const catCanvas = new ChartJSNodeCanvas({ width: 500, height: 300 });
    const catBuffer = await catCanvas.renderToBuffer({
      type: "bar",
      data: {
        labels: Object.keys(categoryCounts),
        datasets: [
          {
            label: "Issue Count",
            data: Object.values(categoryCounts),
            backgroundColor: "#3e95cd",
          },
        ],
      },
    });
    const catBase64 = catBuffer.toString("base64");

    const html = generateTicketReportHTML({
      totalIssues,
      resolvedIssues,
      pendingIssues,
      inProgressIssues,
      revokedIssues,
      breakdown: [
        {
          name: departmentName,
          total: tickets.length,
          resolved: resolvedIssues,
          pending: pendingIssues,
          inProgress: inProgressIssues,
          revoked: revokedIssues,
          avgResolution,
        },
      ],
      generatedOn: moment().format("LLL"),
      chartBase64,
      trendBase64,
      catBase64,
      performanceStats,
      allTickets:
        includeComments === "true"
          ? tickets
          : tickets.map((t) => ({ ...t.toObject(), comments: [], ticket_id: t.ticket_id })),
      filtersApplied: filtersApplied.length ? filtersApplied.join(", ") : "None (Full report)",
    });

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${departmentName}_Report.pdf`
    );

    await logAction({
      action: "EXPORT",
      performedBy: req.user.id,
      description: "Exported departmental ticket PDF report",
    });

    res.send(pdfBuffer);
  } catch (e) {
    console.error("Departmental PDF export failed:", e);
    res.status(500).json({
      message: "Failed to generate departmental report",
      error: e.message,
    });
  }
};

export const exportDeptAdminTicketReportExcel = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      status = "all",
      includeComments = "false",
    } = req.query;
    const { id: adminId } = req.user;

    const deptAdmin = await DepartmentalAdmin.findById(adminId).populate("department");
    if (!deptAdmin || !deptAdmin.department) {
      return res.status(403).json({ message: "Access denied. No department linked." });
    }

    const isNetworkEngineer =
      deptAdmin.department.name.toLowerCase() === "network engineer";

    const scopedDepartment = isNetworkEngineer
      ? await Department.findOne({ name: /^it(\s+department)?$/i })
      : await Department.findById(deptAdmin.department._id);

    if (!scopedDepartment) {
      return res.status(400).json({ message: "Department not found." });
    }

    const ticketQuery = { to_department: scopedDepartment._id };
    if (startDate || endDate) {
      ticketQuery.createdAt = {};
      if (startDate) ticketQuery.createdAt.$gte = new Date(startDate);
      if (endDate) ticketQuery.createdAt.$lte = new Date(endDate);
    }
    if (status !== "all") {
      ticketQuery.status = { $in: status.split(",") };
    }

    let allTickets = await Ticket.find(ticketQuery)
      .populate(["raised_by", "to_department", "assigned_to"])
      .lean();

    for (const t of allTickets) {
      if (t.raised_by && t.raised_by.building) {
        if (typeof t.raised_by.building === "object" && t.raised_by.building.name) {
          t.raised_by.buildingName = t.raised_by.building.name;
        } else {
          t.raised_by.buildingName = t.raised_by.building;
        }
      }
    }

    if (isNetworkEngineer) {
      const allowed = deptAdmin.locations || [];
      allTickets = allTickets.filter((ticket) => {
        const raised = ticket.raised_by;
        if (!raised || !raised.building || raised.floor === undefined || !raised.lab_no) return false;
        const buildingId =
          typeof raised.building === "object" && raised.building._id
            ? raised.building._id.toString()
            : raised.building.toString();
        return allowed.some(
          (loc) =>
            buildingId === loc.building.toString() &&
            raised.floor === loc.floor &&
            (loc.labs || []).includes(raised.lab_no)
        );
      });
    }

    const totalIssues = allTickets.length;
    const resolvedIssues = allTickets.filter((t) => t.status === "resolved").length;
    const pendingIssues = allTickets.filter((t) => ["pending", "in_progress"].includes(t.status)).length;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Dept Ticket Report");

    worksheet.mergeCells("A1:H1");
    worksheet.getCell("A1").value = `Ticket Report - ${deptAdmin.department.name}`;
    worksheet.getCell("A1").font = { size: 16, bold: true };
    worksheet.getCell("A1").alignment = { horizontal: "center" };

    worksheet.addRow([]);
    worksheet.addRow(["Summary Overview"]);
    worksheet.addRow(["Total Issues Raised", totalIssues]);
    worksheet.addRow(["Total Issues Resolved", resolvedIssues]);
    worksheet.addRow(["Total Issues Pending", pendingIssues]);
    worksheet.addRow([]);

    worksheet.addRow(["All Ticket Details"]);
    const header = [
      "Ticket ID",
      "Title",
      "Status",
      "Raised By",
      "Created At",
      "Updated At",
      "Resolution Time",
      "Assigned To",
    ];
    if (includeComments === "true") header.push("Comments");

    worksheet.addRow(header).eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFDCE6F1" },
      };
    });

    for (const t of allTickets) {
      const created = moment(t.createdAt).format("LLL");
      const updated = moment(t.updatedAt).format("LLL");
      const resolutionTime =
        t.status === "resolved"
          ? Math.floor((new Date(t.updatedAt) - new Date(t.createdAt)) / (1000 * 60 * 60)) + " hrs"
          : "-";

      const row = [
        t.ticket_id || "-",
        t.title,
        t.status,
        t.raised_by?.name || "N/A",
        created,
        updated,
        resolutionTime,
        t.assigned_to?.name || "Unassigned",
      ];

      if (includeComments === "true") {
        const comments =
          (t.comments || [])
            .map(
              (c) =>
                `(${c.by || "N/A"} - ${moment(c.at).format("LLL") || "N/A"}) ${c.text}`
            )
            .join("\n") || "No comments";
        row.push(comments);
      }

      worksheet.addRow(row);
    }

    worksheet.addRow([]);
    worksheet.addRow([`Report generated on: ${moment().format("LLL")}`]);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${deptAdmin.department.name}_Report.xlsx`
    );
    await workbook.xlsx.write(res);

    await logAction({
      action: "EXPORT",
      performedBy: req.user.id,
      description: "Exported departmental ticket Excel report",
    });

    res.end();
  } catch (e) {
    console.error("Departmental Excel report failed:", e);
    res.status(500).json({
      message: "Failed to generate department report",
      error: e.message,
    });
  }
};

export const exportInventoryExcel = async (req, res) => {
  try {
    const { building, floor, labNumber, systemType } = req.query;
    const adminId = req.user.id;

    const admin = await DepartmentalAdmin.findById(adminId)
      .populate("department")
      .populate("locations.building");

    if (!admin) {
      return res.status(404).json({ message: "Departmental Admin not found" });
    }

    const isNetworkEngineer =
      admin.department.name.toLowerCase().trim() === "network engineer";

    const buildingNames = building ? building.split(",") : [];
    const floors = floor ? floor.split(",") : [];
    const labNumbers = labNumber ? labNumber.split(",") : [];
    const systemTypes = systemType ? systemType.split(",") : [];

    const filter = {};
    let buildingDocs = [];

    if (buildingNames.length > 0) {
      buildingDocs = await Building.find({ name: { $in: buildingNames } });
      if (buildingDocs.length === 0) {
        return res
          .status(400)
          .json({ message: "No matching buildings found." });
      }
      filter.building = { $in: buildingDocs.map((b) => b._id) };
    }

    if (floors.length > 0) filter.floor = { $in: floors };
    if (labNumbers.length > 0) filter.labNumber = { $in: labNumbers };
    if (systemTypes.length > 0) filter.systemType = { $in: systemTypes };

    if (isNetworkEngineer) {
      if (buildingNames.length || floors.length || labNumbers.length) {
        const allowed = admin.locations.some((loc) =>
          buildingDocs.some((b) => {
            const buildingMatch =
              !buildingNames.length ||
              String(loc.building._id) === String(b._id);
            const floorMatch =
              !floors.length || floors.includes(String(loc.floor));
            const labMatch =
              !labNumbers.length ||
              labNumbers.some((lab) => loc.labs.includes(lab));
            return buildingMatch && floorMatch && labMatch;
          })
        );
        if (!allowed) {
          return res.status(403).json({
            message:
              "You are not authorized to access the selected location(s).",
          });
        }
      } else {
        const orConditions = admin.locations.flatMap((loc) =>
          loc.labs.map((lab) => ({
            building: loc.building._id,
            floor: String(loc.floor),
            labNumber: lab,
          }))
        );
        filter.$or = orConditions;
      }
    }

    const systems = await InventorySystem.find(filter)
      .populate("building", "name")
      .populate("department", "name")
      .populate("owner", "name email")
      .populate("addedBy", "name email");

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Inventory Report");

    sheet.mergeCells("A1:R1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = "INVENTORY SYSTEM REPORT";
    titleCell.font = { size: 28, bold: true, color: { argb: "FF00008B" } };
    titleCell.alignment = { horizontal: "left" };

    const adminInfo = `Downloaded by: ${admin.name} (${admin.email}) - Department: ${admin.department.name}`;
    sheet.mergeCells("A2:R2");
    const adminCell = sheet.getCell("A2");
    adminCell.value = adminInfo;
    adminCell.font = { size: 14, italic: true };
    adminCell.alignment = { horizontal: "left" };

    const filterInfo = `Filters Applied: ${
      buildingNames.length
        ? "Buildings: " + buildingNames.join(", ")
        : "All Buildings"
    }${floors.length ? " | Floors: " + floors.join(", ") : ""}${
      labNumbers.length ? " | Labs: " + labNumbers.join(", ") : ""
    }${systemTypes.length ? " | System Types: " + systemTypes.join(", ") : ""}`;

    sheet.mergeCells("A3:R3");
    const filterCell = sheet.getCell("A3");
    filterCell.value = filterInfo;
    filterCell.font = { size: 14, italic: true };
    filterCell.alignment = { horizontal: "left" };

    sheet.addRow([]);

    const headers = [
      "S. No.",
      "Tag No.",
      "Model No.",
      "System Name",
      "Manufacturer",
      "IP Address",
      "Owner Name",
      "Designation",
      "USB Status",
      "MAC Address",
      "System Type",
      "Desktop Policy",
      "Updated Antivirus",
      "Remark",
    ];
    sheet.addRow(headers);

    const headerRow = sheet.getRow(sheet.lastRow.number);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "4F81BD" },
      };
      cell.alignment = {
        horizontal: "center",
        vertical: "center",
        wrapText: true,
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    systems.forEach((sys, index) => {
      const mainRow = [
        index + 1,
        sys.tag,
        sys.modelNo || "-",
        sys.systemName,
        sys.manufacturer || "-",
        sys.ipAddress || "N/A",
        sys.owner ? `${sys.owner.name}` : sys.ownerName || "Unassigned",
        sys.designation || "-",
        sys.usbStatus || "N/A",
        sys.macAddress || "N/A",
        sys.systemType || "-",
        sys.desktopPolicy || "-",
        sys.hasAntivirus || "-",
        sys.remark || "-",
      ];

      sheet.addRow(mainRow);
      const mainRowRef = sheet.getRow(sheet.lastRow.number);
      mainRowRef.height = 20;
      mainRowRef.eachCell((cell) => {
        cell.alignment = {
          wrapText: true,
          vertical: "middle",
          horizontal: "center",
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.font = { bold: true };
      });

      if (sys.components.length > 0) {
        sys.components.forEach((c) => {
          sheet.addRow([
            "", // S.No.
            c.tag || "-", // Tag
            c.modelNumber || "-", // Model No.
            c.componentType || "-", // System Name ← Component Type
            c.manufacturer || "-", // Manufacturer
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "", // Remaining columns
          ]);
          const row = sheet.getRow(sheet.lastRow.number);
          row.eachCell((cell, col) => {
            if (col >= 2 && col <= 5) {
              cell.alignment = { horizontal: "center", wrapText: true };
              cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" },
              };
            }
          });
        });
      }

      // Add blank row after each system block
      sheet.addRow([]);
      sheet.getRow(sheet.lastRow.number).height = 30;
    });

    sheet.columns.forEach((column) => {
      let maxLength = 10;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const len = cell.value ? cell.value.toString().length : 0;
        if (len > maxLength) maxLength = len;
      });
      column.width = Math.min(Math.max(maxLength + 2, 10), 40);
    });

    sheet.getColumn(1).width = 8;
    sheet.getColumn(6).width = 20;
    sheet.getColumn(7).width = 15;
    sheet.getColumn(8).width = 20;
    sheet.getColumn(9).width = 15;
    sheet.getColumn(10).width = 22;
    sheet.getColumn(11).width = 22;
    sheet.getColumn(12).width = 10;
    sheet.getColumn(13).width = 10;
    sheet.getColumn(14).width = 10;
    sheet.getColumn(18).width = 22;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=inventory_${Date.now()}.xlsx`
    );
    await workbook.xlsx.write(res);
    await logAction({
      action: "EXPORT",
      performedBy: req.user.id,
      description: `Exported inventory Excel report with filters - Buildings: ${
        building || "All"
      }, Floors: ${floor || "All"}, Labs: ${labNumber || "All"}, Types: ${
        systemType || "All"
      }`,
    });
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to generate inventory report",
      error: error.message,
    });
  }
};
