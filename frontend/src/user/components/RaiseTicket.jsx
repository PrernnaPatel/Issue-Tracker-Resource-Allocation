import { useState, useEffect } from 'react';
import { AlertCircle, Upload, X, FileText, Send, Building2, User, Paperclip } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { raiseTicket, getAllDepartments, getTicketOptionsForDepartment } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const RaiseTicket = () => {
  const { employee } = useAuth();
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [ticketOptions, setTicketOptions] = useState([]);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [useCustomTitle, setUseCustomTitle] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    to_department: ''
  });
  const [attachment, setAttachment] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Fetch only departments that can resolve tickets
  useEffect(() => {
    const fetchDepartments = async () => {
      setLoading(true);
      try {
        const data = await getAllDepartments();
        const baseDepartments = Array.isArray(data)
          ? data.filter(dept => dept && (dept._id || dept.id) && dept.name)
          : [];
        const hasResolveFlag = baseDepartments.some(dept => dept.canResolve === true);
        const resolvingDepartments = hasResolveFlag
          ? baseDepartments.filter(dept => dept.canResolve === true)
          : baseDepartments;
        setDepartments(resolvingDepartments);
        if (resolvingDepartments.length === 0) {
          toast.warning('No departments available for ticket resolution');
        }
      } catch (error) {
        console.error('Failed to fetch departments:', error);
        toast.error('Failed to load departments');
        setDepartments([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDepartments();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    if (name === 'to_department') {
      setSelectedTitle('');
      setCustomTitle('');
      setUseCustomTitle(false);
      setFormData(prev => ({
        ...prev,
        title: ''
      }));
    }
  };

  const handleTitleSelect = (e) => {
    const value = e.target.value;
    setSelectedTitle(value);

    if (value === '__other__') {
      setUseCustomTitle(true);
      setCustomTitle('');
      setFormData(prev => ({ ...prev, title: '' }));
    } else {
      setUseCustomTitle(false);
      setCustomTitle('');
      setFormData(prev => ({ ...prev, title: value }));
    }

    if (errors.title) {
      setErrors(prev => ({
        ...prev,
        title: ''
      }));
    }
  };

  const handleCustomTitleChange = (e) => {
    const value = e.target.value;
    setCustomTitle(value);
    setFormData(prev => ({ ...prev, title: value }));
    if (errors.title) {
      setErrors(prev => ({
        ...prev,
        title: ''
      }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      setAttachment(file);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      setAttachment(file);
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.to_department) newErrors.to_department = 'Please select a department';
    if (useCustomTitle) {
      if (!customTitle.trim()) newErrors.title = 'Title is required';
    } else if (!selectedTitle) {
      newErrors.title = 'Please select a ticket title';
    }
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    return newErrors;
  };

  useEffect(() => {
    const loadOptions = async () => {
      if (!formData.to_department) {
        setTicketOptions([]);
        return;
      }

      setOptionsLoading(true);
      try {
        const options = await getTicketOptionsForDepartment(formData.to_department);
        setTicketOptions(Array.isArray(options) ? options : []);
      } catch (error) {
        setTicketOptions([]);
      } finally {
        setOptionsLoading(false);
      }
    };

    loadOptions();
  }, [formData.to_department]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const ticketData = {
        title: formData.title,
        description: formData.description,
        from_department: employee?.department || 'No Department',
        raisedBy: employee?._id || employee?.email || '',
        to_department: formData.to_department
      };
      
      console.log('Raising ticket with data:', ticketData, attachment);
      const response = await raiseTicket(ticketData, attachment);
      console.log('Ticket response:', response);
      if (response.message === 'Ticket raised successfully') {
        toast.success('Ticket raised successfully!');
        navigate('/my-tickets');
      } else {
        throw new Error(response.message || 'Failed to raise ticket');
      }
      
    } catch (error) {
      console.error('Error raising ticket:', error);
      toast.error(error.message || 'Failed to raise ticket');
      setErrors({ form: error.message || 'Failed to raise ticket' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
      return '🖼️';
    } else if (['pdf'].includes(extension)) {
      return '📄';
    } else if (['doc', 'docx'].includes(extension)) {
      return '📝';
    } else if (['xls', 'xlsx'].includes(extension)) {
      return '📊';
    }
    return '📎';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

      <div className="relative z-10 p-6 max-w-4xl mx-auto">

        {/* Main Form Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-6">
            <div className="flex items-center space-x-3">
              <User className="w-6 h-6 text-white" />
              <div>
                <h2 className="text-xl font-semibold text-white">New Ticket Request</h2>
                <p className="text-purple-100">Fill out the form below to submit your request</p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* Department Selection */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                <Building2 className="w-4 h-4 mr-2 text-purple-600" />
                Department
              </label>
              <div className="relative">
                <select
                  name="to_department"
                  value={formData.to_department}
                  onChange={handleChange}
                  className={`w-full py-4 px-6 bg-gray-50 border-2 rounded-2xl focus:outline-none focus:bg-white transition-all duration-300 text-gray-800 appearance-none cursor-pointer ${
                    errors.to_department 
                      ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100' 
                      : 'border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100'
                  }`}
                  disabled={loading}
                >
                  <option value="">
                    {loading ? 'Loading departments...' : 'Select the appropriate department'}
                  </option>
                  {departments.map((dept) => (
                    <option key={dept._id || dept.id} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {errors.to_department && (
                  <div className="absolute -bottom-6 left-0 flex items-center text-sm text-red-600 animate-pulse">
                    <AlertCircle size={14} className="mr-1" />
                    {errors.to_department}
                  </div>
                )}
              </div>
            </div>

            {/* Ticket Title Selection */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                <FileText className="w-4 h-4 mr-2 text-purple-600" />
                Ticket Title
              </label>
              <div className="relative">
                <select
                  name="ticket_title"
                  value={selectedTitle}
                  onChange={handleTitleSelect}
                  className={`w-full py-4 px-6 bg-gray-50 border-2 rounded-2xl focus:outline-none focus:bg-white transition-all duration-300 text-gray-800 appearance-none cursor-pointer ${
                    errors.title 
                      ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100' 
                      : 'border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100'
                  }`}
                  disabled={!formData.to_department || optionsLoading}
                >
                  <option value="">
                    {!formData.to_department
                      ? 'Select a department first'
                      : optionsLoading
                        ? 'Loading ticket titles...'
                        : 'Select ticket title'}
                  </option>
                  {ticketOptions.map((option) => (
                    <option key={option._id || option.title} value={option.title}>
                      {option.title}
                    </option>
                  ))}
                  <option value="__other__">Other</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {errors.title && (
                  <div className="absolute -bottom-6 left-0 flex items-center text-sm text-red-600 animate-pulse">
                    <AlertCircle size={14} className="mr-1" />
                    {errors.title}
                  </div>
                )}
              </div>
            </div>

            {useCustomTitle && (
              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                  <FileText className="w-4 h-4 mr-2 text-purple-600" />
                  Custom Ticket Title
                </label>
                <div className="relative">
                  <textarea
                    name="custom_title"
                    value={customTitle}
                    onChange={handleCustomTitleChange}
                    rows={3}
                    className={`w-full py-4 px-6 bg-gray-50 border-2 rounded-2xl focus:outline-none focus:bg-white transition-all duration-300 text-gray-800 placeholder-gray-400 resize-none ${
                      errors.title 
                        ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100' 
                        : 'border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100'
                    }`}
                    placeholder="Write your ticket title"
                  />
                </div>
              </div>
            )}

            {/* Description Field */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                <FileText className="w-4 h-4 mr-2 text-purple-600" />
                Description
              </label>
              <div className="relative">
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={5}
                  className={`w-full py-4 px-6 bg-gray-50 border-2 rounded-2xl focus:outline-none focus:bg-white transition-all duration-300 text-gray-800 placeholder-gray-400 resize-none ${
                    errors.description 
                      ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100' 
                      : 'border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100'
                  }`}
                  placeholder="Provide a detailed description of your issue or request. Include any relevant information that might help us resolve your ticket faster."
                />
                {errors.description && (
                  <div className="absolute -bottom-6 left-0 flex items-center text-sm text-red-600 animate-pulse">
                    <AlertCircle size={14} className="mr-1" />
                    {errors.description}
                  </div>
                )}
              </div>
            </div>

            {/* File Attachment */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                <Paperclip className="w-4 h-4 mr-2 text-purple-600" />
                Attachment (Optional)
              </label>
              
              {attachment ? (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center text-white text-xl">
                        {getFileIcon(attachment.name)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{attachment.name}</p>
                        <p className="text-sm text-gray-600">
                          {(attachment.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeAttachment}
                      className="w-8 h-8 bg-red-100 hover:bg-red-200 rounded-full flex items-center justify-center text-red-600 transition-colors duration-200"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer group ${
                    dragActive 
                      ? 'border-purple-400 bg-purple-50' 
                      : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                  />
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                      <Upload className="w-8 h-8 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-700 mb-2">
                        Drop your file here, or <span className="text-purple-600">browse</span>
                      </p>
                      <p className="text-sm text-gray-500">
                        Supports: PDF, PNG, JPG, DOC, XLS (Max 10MB)
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-4 px-8 rounded-2xl font-semibold text-white transition-all duration-300 transform ${
                  isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 hover:scale-105 hover:shadow-xl active:scale-95'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Submitting Ticket...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <Send className="w-5 h-5" />
                    <span>Submit Ticket</span>
                  </div>
                )}
              </button>
            </div>

            {/* Form Error */}
            {errors.form && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-red-700">{errors.form}</p>
              </div>
            )}
          </form>
        </div>

        {/* Help Section */}
        
      </div>

      <style>{`
        .bg-grid-pattern {
          background-image: linear-gradient(rgba(0, 0, 0, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 0, 0, 0.1) 1px, transparent 1px);
          background-size: 20px 20px;
        }
        
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default RaiseTicket;
