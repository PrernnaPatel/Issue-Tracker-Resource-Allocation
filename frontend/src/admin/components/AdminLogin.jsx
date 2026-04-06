import { useState } from 'react';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { loginAdmin } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const AdminLogin = ({ onDeptClick }) => {
  const { setAdmin } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // ...rest of the login logic similar to LoginForm but simplified for admin
  
  return (
    <div className="p-8 flex flex-col justify-center h-[500px]">
      <h2 className="text-2xl font-bold text-[#4B2D87] mb-2">Admin Login</h2>
      <p className="text-gray-600 mb-6">Sign in to access admin dashboard</p>

      {/* Form content */}
      <form onSubmit={handleLoginSubmit} className="space-y-5">
        {/* Email and Password fields */}
      </form>

      <div className="text-center mt-6 pt-4 border-t border-gray-100">
        <p className="text-sm text-gray-600">
          Are you a department user?{' '}
          <button onClick={onDeptClick} className="text-[#4B2D87] hover:underline font-medium">
            Login here
          </button>
        </p>
      </div>
    </div>
  );
};