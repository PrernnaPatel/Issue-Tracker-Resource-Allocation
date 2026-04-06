import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import DashboardLayout from "../layout/DashboardLayout";

const Logout = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = () => {
    setIsLoading(true);
    logout();
    navigate("/login");
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <>
      {/* Dashboard in background */}
      <div className="fixed inset-0 filter blur-sm brightness-50">
        <DashboardLayout />
      </div>

      {/* Logout Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="relative bg-white rounded-xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Confirm Logout
            </h3>
            <p className="text-gray-500 mb-6">
              Are you sure you want to log out? You will need to log in again to
              access your account.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleLogout}
              disabled={isLoading}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-purple-600 text-white font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-purple-400"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Logging out...
                </span>
              ) : (
                "Yes, Log out"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Logout;