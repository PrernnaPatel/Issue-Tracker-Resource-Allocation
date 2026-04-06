import { useDeptAuth } from "../../context/DeptAuthContext"
import DepartmentDashboard from "./Dashboard"
import NetworkEngineerDashboard from "./NetworkEngineerDashboard"

const isNetworkEngineerDept = (departmentName = "") =>
  /^network engineer$/i.test(departmentName.trim())

export default function DashboardRoute() {
  const { deptAdmin, loading } = useDeptAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 rounded-full border-b-2 border-blue-600 animate-spin" />
      </div>
    )
  }

  const departmentName =
    typeof deptAdmin?.department === "object"
      ? deptAdmin?.department?.name
      : deptAdmin?.department || ""

  if (isNetworkEngineerDept(departmentName)) {
    return <NetworkEngineerDashboard />
  }

  return <DepartmentDashboard />
}
