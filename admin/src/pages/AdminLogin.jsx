import { useState } from 'react';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../service/adminAuthService';
import { useAdminAuth } from '../context/AdminAuthContext';
import { toast } from 'react-toastify';

const AdminLogin = ({ onDeptClick }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { updateAdminContext } = useAdminAuth();

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
      const data = await adminLogin(formData);
      updateAdminContext(data);
      toast.success('Login successful');
      navigate('/admin/dashboard');
    } catch (error) {
      toast.error(error.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 flex flex-col justify-center h-[500px] bg-white border border-gray-200 rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Login</h2>
      <p className="text-gray-600 mb-6">Sign in to access admin dashboard</p>

      {errors.general && (
        <p className="text-red-600 mb-3 flex items-center text-sm">
          <AlertCircle size={14} className="mr-1" /> {errors.general}
        </p>
      )}

      {/* Form content */}
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
              className={`w-full py-3 pl-10 pr-3 bg-white border rounded-full focus:outline-none focus:ring-2 text-gray-900 placeholder-gray-400 ${
                errors.email ? 'border-red-300 focus:ring-red-100 focus:border-red-500' : 'border-gray-300 focus:ring-purple-100 focus:border-purple-500'
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
              className={`w-full py-3 pl-10 pr-3 bg-white border rounded-full focus:outline-none focus:ring-2 text-gray-900 placeholder-gray-400 ${
                errors.password ? 'border-red-300 focus:ring-red-100 focus:border-red-500' : 'border-gray-300 focus:ring-purple-100 focus:border-purple-500'
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

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-3 rounded-full text-white font-medium transition-all ${
            isSubmitting 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-purple-500/25'
          }`}
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="text-center mt-6 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          Are you a department user?{' '}
          <button onClick={onDeptClick} className="text-purple-600 hover:text-purple-700 hover:underline font-medium transition-colors">
            Login here
          </button>
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;