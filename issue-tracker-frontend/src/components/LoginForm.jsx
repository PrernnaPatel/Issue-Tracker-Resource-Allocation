import { useState } from 'react';
import { Mail, Lock, AlertCircle, Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { loginUser, verifyUser, requestPasswordResetOtp, resetPassword } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const LoginForm = ({ onRegisterClick }) => {
  const { setEmployee } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '', otp: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState('login'); // login -> otp
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState('email'); // 'email' or 'reset'
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateLogin = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';

    if (!formData.password) newErrors.password = 'Password is required';

    return newErrors;
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateLogin();
    if (Object.keys(validationErrors).length) return setErrors(validationErrors);

    setIsSubmitting(true);
    try {
      const response = await loginUser(formData);
      const data = await response.json();
      console.log("Response data:", data);
      if (data.message === "OTP sent to your email" || data.message === "Use the OTP sent to your mail") {
        setStep('otp');
        console.log(step);
      } else {
        setErrors({ general: data.message || 'Login failed' });
      }
    } catch {
      setErrors({ general: 'Server error. Try again later.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    if (!formData.otp) return setErrors({ otp: 'OTP is required' });

    setIsSubmitting(true);
    try {
      const res = await verifyUser({ email: formData.email, otp: formData.otp });
      console.log("Full OTP verification response:", res);
      console.log("Employee data from response:", res.employee);
      console.log("Department data from response:", res.employee?.department);
      
      if (res.message === "Login Successfull") {
        // Ensure department data is properly structured
        const employeeData = {
          ...res.employee,
          department: res.employee.department ? {
            _id: res.employee.department._id || res.employee.department.id,
            name: res.employee.department.name || res.employee.department
          } : { _id: '', name: 'No Department' }
        };
        console.log("Structured employee data:", employeeData);
        setEmployee(employeeData);
        localStorage.setItem('employee', JSON.stringify(employeeData));
        toast.success('Successfully logged in!');
        navigate('/');
      } else {
        setErrors({ otp: res.message || 'Invalid OTP' });
      }
    } catch (error) {
      console.error("Login error:", error);
      setErrors({ otp: 'Server error during OTP verification' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!formData.email) {
      setErrors({ email: 'Email is required for password reset' });
      return;
    }

    setIsSubmitting(true);
    try {
      await requestPasswordResetOtp(formData.email);
      toast.success('OTP sent to your email');
      setResetStep('reset');
    } catch (error) {
      toast.error(error.message);
      setErrors({ email: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (!formData.otp || !formData.newPassword || !formData.confirmPassword) {
      setErrors({ 
        general: 'Please fill in all fields' 
      });
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setErrors({ 
        confirmPassword: 'Passwords do not match' 
      });
      return;
    }

    if (formData.newPassword.length < 6) {
      setErrors({ 
        newPassword: 'Password must be at least 6 characters long' 
      });
      return;
    }

    setIsSubmitting(true);
    try {
      console.log("Resetting password with data:", formData);
      console.log("Resetting password with data:", formData.email, formData.otp, formData.newPassword);
      await resetPassword(formData.email, formData.otp, formData.newPassword);
      toast.success('Password reset successful. Please login with your new password.');
      setIsForgotPassword(false);
      setResetStep('email');
      setFormData(prev => ({
        ...prev,
        otp: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error) {
      toast.error(error.message);
      setErrors({ general: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 flex flex-col justify-center h-[500px]">
      <h2 className="text-2xl font-bold text-[#4B2D87] mb-2">
        {isForgotPassword ? 'Reset Password' : 'Sign In'}
      </h2>
      <p className="text-gray-600 mb-6">
        {isForgotPassword 
          ? 'Enter your email to receive password reset instructions' 
          : step === 'login' 
            ? 'Sign in to access your dashboard' 
            : 'Enter the OTP sent to your email'}
      </p>

      {errors.general && (
        <p className="text-red-600 mb-3 flex items-center text-sm">
          <AlertCircle size={14} className="mr-1" /> {errors.general}
        </p>
      )}

      {isForgotPassword ? (
        <form onSubmit={resetStep === 'email' ? handleForgotPassword : handleResetPassword} className="space-y-5">
          {resetStep === 'email' ? (
            // Email input for requesting OTP
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute top-3 left-3 text-gray-400" size={18} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full py-3 pl-10 pr-3 border rounded-full focus:outline-none focus:ring-2 ${
                    errors.email ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-[#4B2D87]'
                  }`}
                  placeholder="your@email.com"
                />
              </div>
              {errors.email && (
                <p className="flex items-center mt-1 text-sm text-red-600">
                  <AlertCircle size={14} className="mr-1" /> {errors.email}
                </p>
              )}
            </div>
          ) : (
            // OTP and new password inputs
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">OTP</label>
                <div className="relative">
                  <Key className="absolute top-3 left-3 text-gray-400" size={18} />
                  <input
                    type="text"
                    name="otp"
                    value={formData.otp}
                    onChange={handleChange}
                    className={`w-full py-3 pl-10 pr-3 border rounded-full focus:outline-none focus:ring-2 ${
                      errors.otp ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-[#4B2D87]'
                    }`}
                    placeholder="Enter OTP"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute top-3 left-3 text-gray-400" size={18} />
                  <input
                    type="password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    className={`w-full py-3 pl-10 pr-3 border rounded-full focus:outline-none focus:ring-2 ${
                      errors.newPassword ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-[#4B2D87]'
                    }`}
                    placeholder="New Password"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute top-3 left-3 text-gray-400" size={18} />
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`w-full py-3 pl-10 pr-3 border rounded-full focus:outline-none focus:ring-2 ${
                      errors.confirmPassword ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-[#4B2D87]'
                    }`}
                    placeholder="Confirm Password"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex flex-col space-y-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 rounded-full text-white font-medium transition-all ${
                isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#4B2D87] hover:bg-[#5E3A9F]'
              }`}
            >
              {isSubmitting 
                ? 'Processing...' 
                : resetStep === 'email' 
                  ? 'Send OTP' 
                  : 'Reset Password'
              }
            </button>
            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setResetStep('email');
                setFormData(prev => ({
                  ...prev,
                  otp: '',
                  newPassword: '',
                  confirmPassword: ''
                }));
              }}
              className="text-[#4B2D87] text-sm hover:underline"
            >
              Back to Login
            </button>
          </div>
        </form>
      ) : (
        <>
          {step === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute top-3 left-3 text-gray-400" size={18} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full py-3 pl-10 pr-3 border rounded-full focus:outline-none focus:ring-2 ${
                      errors.email ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-[#4B2D87]'
                    }`}
                    placeholder="your@email.com"
                  />
                </div>
                {errors.email && (
                  <p className="flex items-center mt-1 text-sm text-red-600">
                    <AlertCircle size={14} className="mr-1" /> {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute top-3 left-3 text-gray-400" size={18} />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full py-3 pl-10 pr-3 border rounded-full focus:outline-none focus:ring-2 ${
                      errors.password ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-[#4B2D87]'
                    }`}
                    placeholder="Password"
                  />
                </div>
                {errors.password && (
                  <p className="flex items-center mt-1 text-sm text-red-600">
                    <AlertCircle size={14} className="mr-1" /> {errors.password}
                  </p>
                )}
              </div>

              {/* Add Forgot Password link */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-sm text-[#4B2D87] hover:underline"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 rounded-full text-white font-medium transition-all ${
                  isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#4B2D87] hover:bg-[#5E3A9F]'
                }`}
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOTPSubmit} className="space-y-5">
              {/* OTP Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">OTP</label>
                <div className="relative">
                  <Key className="absolute top-3 left-3 text-gray-400" size={18} />
                  <input
                    type="text"
                    name="otp"
                    value={formData.otp}
                    onChange={handleChange}
                    className={`w-full py-3 pl-10 pr-3 border rounded-full focus:outline-none focus:ring-2 ${
                      errors.otp ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-[#4B2D87]'
                    }`}
                    placeholder="Enter the OTP"
                  />
                </div>
                {errors.otp && (
                  <p className="flex items-center mt-1 text-sm text-red-600">
                    <AlertCircle size={14} className="mr-1" /> {errors.otp}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 rounded-full text-white font-medium transition-all ${
                  isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#4B2D87] hover:bg-[#5E3A9F]'
                }`}
              >
                {isSubmitting ? 'Verifying...' : 'Verify OTP'}
              </button>
            </form>
          )}
        </>
      )}

      <div className="text-center mt-6 pt-4 border-t border-gray-100">
        <p className="text-sm text-gray-600">
          Don't have an account?{' '}
          <button onClick={onRegisterClick} className="text-[#4B2D87] hover:underline font-medium">
            Register
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;