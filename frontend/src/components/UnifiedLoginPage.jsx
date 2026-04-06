import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, Lock, Mail } from "lucide-react";
import { toast } from "react-toastify";
import AuthShell from "./AuthShell";
import { resolveUserByEmail } from "../services/unifiedAuthService";
import { adminLogin } from "../admin/service/adminAuthService";
import {
  changeDeptAdminPassword,
  deptAdminLoginRequest,
  getDeptAdminData,
  getDeptAdminToken,
  setDeptAdminData,
  setDeptAdminToken,
} from "../admin/service/deptAuthService";
import { loginUser } from "../user/services/authService";
import { useAuth } from "../user/context/AuthContext";

const INITIAL_LOGIN = { email: "", password: "", securityPin: "" };
const INITIAL_CREDENTIALS = {
  newPassword: "",
  confirmPassword: "",
  newSecurityPin: "",
  confirmSecurityPin: "",
};

const fieldClassName = (hasError) =>
  `w-full rounded-[20px] border bg-white py-4 pl-12 pr-4 text-base text-slate-900 outline-none transition ${
    hasError
      ? "border-red-400 focus:border-red-500"
      : "border-slate-200 focus:border-blue-500 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.10)]"
  }`;

const pinCellClassName = (active, filled, hasError) =>
  `flex h-14 w-12 items-center justify-center rounded-2xl border text-lg font-semibold transition ${
    hasError
      ? "border-red-300 bg-red-50 text-red-600"
      : active
      ? "border-blue-500 bg-blue-50 text-slate-900 shadow-[0_0_0_4px_rgba(59,130,246,0.12)]"
      : filled
      ? "border-slate-300 bg-slate-50 text-slate-900"
      : "border-slate-200 bg-white text-slate-400"
  }`;

const UnifiedLoginPage = () => {
  const navigate = useNavigate();
  const { employee, setEmployee } = useAuth();
  const [stage, setStage] = useState("login");
  const [accountMeta, setAccountMeta] = useState(null);
  const [loginForm, setLoginForm] = useState(INITIAL_LOGIN);
  const [credentialForm, setCredentialForm] = useState(INITIAL_CREDENTIALS);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("adminToken")) {
      navigate("/admin/dashboard", { replace: true });
      return;
    }

    if (getDeptAdminToken() && getDeptAdminData()) {
      navigate("/dept/dashboard", { replace: true });
      return;
    }

    if (employee || localStorage.getItem("token")) {
      navigate("/", { replace: true });
    }
  }, [employee, navigate]);

  const handleLoginChange = (event) => {
    const { name, value } = event.target;
    setLoginForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  };

  const handleCredentialChange = (event) => {
    const { name, value } = event.target;
    setCredentialForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  };

  const validateLogin = () => {
    const nextErrors = {};

    if (!loginForm.email) {
      nextErrors.email = "Email is required.";
    } else if (!/\S+@\S+\.\S+/.test(loginForm.email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!loginForm.password) {
      nextErrors.password = "Password is required.";
    }

    if (!/^\d{6}$/.test(loginForm.securityPin.trim())) {
      nextErrors.securityPin = "Security pin must be exactly 6 digits.";
    }

    return nextErrors;
  };

  const validatePasswordReset = () => {
    const nextErrors = {};

    if (!credentialForm.newPassword) {
      nextErrors.newPassword = "New password is required.";
    } else if (credentialForm.newPassword.length < 8) {
      nextErrors.newPassword = "Password must be at least 8 characters.";
    }

    if (!credentialForm.confirmPassword) {
      nextErrors.confirmPassword = "Confirm the new password.";
    } else if (credentialForm.confirmPassword !== credentialForm.newPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    if (!/^\d{6}$/.test(credentialForm.newSecurityPin.trim())) {
      nextErrors.newSecurityPin = "Security pin must be exactly 6 digits.";
    }

    if (!credentialForm.confirmSecurityPin) {
      nextErrors.confirmSecurityPin = "Confirm the new security pin.";
    } else if (
      credentialForm.confirmSecurityPin !== credentialForm.newSecurityPin
    ) {
      nextErrors.confirmSecurityPin = "Security pins do not match.";
    }

    return nextErrors;
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateLogin();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const resolvedAccount = await resolveUserByEmail(loginForm.email);
      setAccountMeta(resolvedAccount);

      if (resolvedAccount.accountType === "superadmin") {
        await adminLogin(loginForm);
        toast.success("Admin login successful.");
        navigate("/admin/dashboard", { replace: true });
        return;
      }

      if (resolvedAccount.accountType === "employee") {
        const response = await loginUser(loginForm);
        const employeeData = {
          ...response.employee,
          department: response.employee.department
            ? {
                _id: response.employee.department._id || response.employee.department.id || "",
                name: response.employee.department.name || response.employee.department,
              }
            : { _id: "", name: "No Department" },
        };

        setEmployee(employeeData);
        localStorage.setItem("employee", JSON.stringify(employeeData));
        toast.success(response.message || "Employee login successful.");
        navigate("/", { replace: true });
        return;
      } else {
        const response = await deptAdminLoginRequest(
          loginForm.email,
          loginForm.password,
          loginForm.securityPin
        );
        if (!response.success) {
          throw new Error(response.message || "Login failed.");
        }
        setDeptAdminToken(response.token);
        setDeptAdminData(response.deptAdmin);
        toast.success(response.message || "Login successful.");

        if (response.deptAdmin?.isFirstLogin) {
          setStage("change-password");
          return;
        }

        navigate("/dept/dashboard", { replace: true });
        return;
      }
    } catch (error) {
      setErrors({ form: error.message || "Unable to continue login." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    const nextErrors = validatePasswordReset();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await changeDeptAdminPassword(
        loginForm.email,
        credentialForm.newPassword,
        credentialForm.newSecurityPin
      );
      if (!response.success) {
        throw new Error(response.message || "Failed to update password.");
      }

      sessionStorage.removeItem("deptAdminToken");
      sessionStorage.removeItem("deptAdminData");
      localStorage.removeItem("deptAdminToken");
      localStorage.removeItem("deptAdminData");
      toast.success(response.message || "Credentials updated successfully.");
      setStage("login");
      setCredentialForm(INITIAL_CREDENTIALS);
      setLoginForm(INITIAL_LOGIN);
      navigate("/login", { replace: true });
    } catch (error) {
      setErrors({ form: error.message || "Unable to update password." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetToLogin = () => {
    setStage("login");
    setAccountMeta(null);
    setLoginForm(INITIAL_LOGIN);
    setCredentialForm(INITIAL_CREDENTIALS);
    setErrors({});
  };

  return (
    <AuthShell
      title={stage === "login" ? "Login" : "Change Password"}
      subtitle={
        stage === "login"
          ? "Sign in with your email address, password, and 6-digit security pin."
          : "First-time departmental admins and network engineers must set a new password and a new 6-digit security pin before continuing."
      }
      footer={
        <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
          <span>New user?</span>
          <Link className="font-semibold text-sky-700 hover:text-sky-800" to="/register">
            Register here
          </Link>
        </div>
      }
    >
      {errors.form ? (
        <div className="mb-6 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{errors.form}</span>
        </div>
      ) : null}

      {stage === "login" ? (
        <form className="space-y-6" onSubmit={handleLoginSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-4.5 text-slate-400" size={18} />
              <input
                className={fieldClassName(errors.email)}
                name="email"
                onChange={handleLoginChange}
                placeholder="your@email.com"
                type="email"
                value={loginForm.email}
              />
            </div>
            {errors.email ? <p className="mt-2 text-sm text-red-600">{errors.email}</p> : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-4.5 text-slate-400" size={18} />
              <input
                className={fieldClassName(errors.password)}
                name="password"
                onChange={handleLoginChange}
                placeholder="Password"
                type="password"
                value={loginForm.password}
              />
            </div>
            {errors.password ? <p className="mt-2 text-sm text-red-600">{errors.password}</p> : null}
          </div>

          <div>
            <label className="mb-3 block text-sm font-medium text-slate-700">Security Pin</label>
            <div className="relative">
              <input
                className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
                inputMode="numeric"
                maxLength={6}
                name="securityPin"
                onChange={handleLoginChange}
                pattern="\d{6}"
                type="password"
                value={loginForm.securityPin}
              />
              <div className="flex gap-2">
                {Array.from({ length: 6 }).map((_, index) => {
                  const char = loginForm.securityPin[index];
                  const filled = Boolean(char);
                  const active =
                    index === loginForm.securityPin.length ||
                    (index === 5 && loginForm.securityPin.length === 6);

                  return (
                    <div
                      key={index}
                      className={pinCellClassName(active, filled, errors.securityPin)}
                    >
                      {filled ? "•" : ""}
                    </div>
                  );
                })}
              </div>
            </div>
            {errors.securityPin ? <p className="mt-2 text-sm text-red-600">{errors.securityPin}</p> : null}
          </div>

          <button
            className="w-full rounded-[22px] bg-[linear-gradient(90deg,#0ea5e9_0%,#4f46e5_100%)] py-4 text-base font-semibold text-white shadow-[0_18px_34px_rgba(79,70,229,0.24)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </form>
      ) : null}

      {stage === "change-password" ? (
        <form className="space-y-5" onSubmit={handleChangePassword}>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">New Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-4.5 text-slate-400" size={18} />
              <input
                className={fieldClassName(errors.newPassword)}
                name="newPassword"
                onChange={handleCredentialChange}
                placeholder="Enter new password"
                type="password"
                value={credentialForm.newPassword}
              />
            </div>
            {errors.newPassword ? <p className="mt-2 text-sm text-red-600">{errors.newPassword}</p> : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-4.5 text-slate-400" size={18} />
              <input
                className={fieldClassName(errors.confirmPassword)}
                name="confirmPassword"
                onChange={handleCredentialChange}
                placeholder="Confirm new password"
                type="password"
                value={credentialForm.confirmPassword}
              />
            </div>
            {errors.confirmPassword ? <p className="mt-2 text-sm text-red-600">{errors.confirmPassword}</p> : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">New 6-digit Security PIN</label>
            <div className="relative">
              <Lock className="absolute left-4 top-4.5 text-slate-400" size={18} />
              <input
                className={fieldClassName(errors.newSecurityPin)}
                inputMode="numeric"
                maxLength={6}
                name="newSecurityPin"
                onChange={handleCredentialChange}
                pattern="\d{6}"
                placeholder="Enter new 6-digit PIN"
                type="password"
                value={credentialForm.newSecurityPin}
              />
            </div>
            {errors.newSecurityPin ? <p className="mt-2 text-sm text-red-600">{errors.newSecurityPin}</p> : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Confirm Security PIN</label>
            <div className="relative">
              <Lock className="absolute left-4 top-4.5 text-slate-400" size={18} />
              <input
                className={fieldClassName(errors.confirmSecurityPin)}
                inputMode="numeric"
                maxLength={6}
                name="confirmSecurityPin"
                onChange={handleCredentialChange}
                pattern="\d{6}"
                placeholder="Confirm new 6-digit PIN"
                type="password"
                value={credentialForm.confirmSecurityPin}
              />
            </div>
            {errors.confirmSecurityPin ? <p className="mt-2 text-sm text-red-600">{errors.confirmSecurityPin}</p> : null}
          </div>

          <div className="flex gap-3">
            <button
              className="flex-1 rounded-[22px] border border-slate-300 py-4 font-medium text-slate-700 transition hover:bg-slate-50"
              onClick={resetToLogin}
              type="button"
            >
              Back
            </button>
            <button
              className="flex-1 rounded-[22px] bg-[linear-gradient(90deg,#0ea5e9_0%,#4f46e5_100%)] py-4 font-semibold text-white shadow-[0_18px_34px_rgba(79,70,229,0.24)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Updating..." : "Save Credentials"}
            </button>
          </div>
        </form>
      ) : null}
    </AuthShell>
  );
};

export default UnifiedLoginPage;
