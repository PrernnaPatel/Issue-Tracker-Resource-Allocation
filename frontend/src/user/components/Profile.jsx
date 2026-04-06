import { useEffect, useState } from "react";
import { User, Mail, Building2, Phone, Loader2, Briefcase, Building, LayoutGrid, Edit2, Check, X, ChevronDown, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { getProfile, updateProfile, getAllBuildings, getAllDepartments } from '../services/authService';

const Profile = () => {
  const { employee, setEmployee } = useAuth();
  const [profileImage, setProfileImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    department: { _id: '', name: '' },
    contact_no: '',
    building: { _id: '', name: '' },
    floor: '',
    lab_no: '',
    image: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    name: '',
    email: '',
    department: '',
    contact_no: '',
    building: '',
    floor: '',
    lab_no: '',
    image: ''
  });
  const [buildings, setBuildings] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [floors, setFloors] = useState([]);
  const [labs, setLabs] = useState([]);
  const [errors, setErrors] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [profileResult, buildingsData, deptsData] = await Promise.all([
          getProfile(),
          getAllBuildings(),
          getAllDepartments()
        ]);

        // Accept both image and profile_image from backend
        const validatedProfile = {
          name: profileResult?.name || '',
          email: profileResult?.email || '',
          department: profileResult?.department || { _id: '', name: '' },
          contact_no: profileResult?.contact_no || '',
          building: profileResult?.building || { _id: '', name: '' },
          floor: profileResult?.floor || '',
          lab_no: profileResult?.lab_no || '',
          image: profileResult?.image || profileResult?.profile_image || ''
        };

        setProfileData(validatedProfile);
        setEditedData({
          name: validatedProfile.name,
          email: validatedProfile.email,
          department: validatedProfile.department?.name || '',
          contact_no: validatedProfile.contact_no,
          building: validatedProfile.building?._id || '',
          floor: validatedProfile.floor?.toString() || '',
          lab_no: validatedProfile.lab_no || '',
          image: validatedProfile.image || ''
        });
        setBuildings(buildingsData || []);
        setDepartments(deptsData || []);
        setProfileImage(validatedProfile?.image || null);

        // Set up floors and labs if building is selected
        if (validatedProfile?.building?._id && buildingsData) {
          const selectedBuilding = buildingsData.find(b => b._id === validatedProfile.building._id);
          if (selectedBuilding && selectedBuilding.floors) {
            const availableFloors = selectedBuilding.floors.map(f => f.floor.toString());
            setFloors(availableFloors);
            if (validatedProfile.floor && availableFloors.includes(validatedProfile.floor.toString())) {
              const selectedFloor = selectedBuilding.floors.find(f => f.floor.toString() === validatedProfile.floor.toString());
              if (selectedFloor && selectedFloor.labs) {
                setLabs(selectedFloor.labs);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load profile data');
        toast.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    if (editedData.building && buildings.length > 0) {
      const selectedBuilding = buildings.find(b => b._id === editedData.building);
      if (selectedBuilding && selectedBuilding.floors) {
        const availableFloors = selectedBuilding.floors.map(f => f.floor.toString());
        setFloors(availableFloors);
        if (!availableFloors.includes(editedData.floor)) {
          setEditedData(prev => ({ ...prev, floor: '', lab_no: '' }));
          setLabs([]);
        }
      } else {
        setFloors([]);
        setLabs([]);
      }
    } else {
      setFloors([]);
      setLabs([]);
    }
  }, [editedData.building, buildings]);

  useEffect(() => {
    if (editedData.building && editedData.floor && buildings.length > 0) {
      const selectedBuilding = buildings.find(b => b._id === editedData.building);
      if (selectedBuilding && selectedBuilding.floors) {
        const selectedFloor = selectedBuilding.floors.find(f => f.floor.toString() === editedData.floor);
        if (selectedFloor && selectedFloor.labs) {
          setLabs(selectedFloor.labs);
          if (!selectedFloor.labs.includes(editedData.lab_no)) {
            setEditedData(prev => ({ ...prev, lab_no: '' }));
          }
        } else {
          setLabs([]);
        }
      }
    } else {
      setLabs([]);
    }
  }, [editedData.building, editedData.floor, buildings]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(URL.createObjectURL(file));
      setImageFile(file);
    }
  };

  const validateContactNumber = (number) => {
    const indianMobileRegex = /^[6-9]\d{9}$/;
    return indianMobileRegex.test(number);
  };

  const validateFields = () => {
    const newErrors = {};
    if (!editedData.name) newErrors.name = 'Name is required';
    if (!editedData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(editedData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!editedData.department) newErrors.department = 'Department is required';
    if (!editedData.building) newErrors.building = 'Building is required';
    if (!editedData.floor) newErrors.floor = 'Floor is required';
    if (!editedData.lab_no) newErrors.lab_no = 'Lab number is required';
    if (!editedData.contact_no) {
      newErrors.contact_no = 'Contact number is required';
    } else if (!validateContactNumber(editedData.contact_no)) {
      newErrors.contact_no = 'Please enter a valid Indian mobile number (10 digits starting with 6, 7, 8, or 9)';
    }
    return newErrors;
  };

  const handleSave = async () => {
    const validationErrors = validateFields();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error('Please fill in all required fields correctly');
      return;
    }

    setIsUpdating(true);

    try {
      const selectedBuilding = buildings.find(b => b._id === editedData.building);
      const selectedDepartment = departments.find(d => d.name === editedData.department);
      if (!selectedBuilding || !selectedDepartment) {
        throw new Error('Invalid building or department selection');
      }

      let updateData;
      let isMultipart = false;

      if (imageFile) {
        isMultipart = true;
        updateData = new FormData();
        updateData.append('name', editedData.name);
        updateData.append('email', editedData.email);
        updateData.append('department', selectedDepartment.name);
        updateData.append('contact_no', editedData.contact_no);
        updateData.append('building', selectedBuilding.name);
        updateData.append('floor', editedData.floor);
        updateData.append('lab_no', editedData.lab_no);
        updateData.append('image', imageFile);
      } else {
        updateData = {
          name: editedData.name,
          email: editedData.email,
          department: selectedDepartment.name,
          contact_no: editedData.contact_no,
          building: selectedBuilding.name,
          floor: parseInt(editedData.floor),
          lab_no: editedData.lab_no,
          image: editedData.image
        };
      }

      const updatedProfile = await updateProfile(updateData, isMultipart);

      if (updatedProfile) {
        // Accept both image and profile_image from backend
        const newImage = updatedProfile.image || updatedProfile.profile_image || profileData.image;
        const completeProfileData = {
          name: editedData.name,
          email: editedData.email,
          contact_no: editedData.contact_no,
          floor: editedData.floor,
          lab_no: editedData.lab_no,
          image: newImage,
          building: selectedBuilding,
          department: selectedDepartment
        };

        setProfileData(completeProfileData);

        setEditedData({
          name: completeProfileData.name,
          email: completeProfileData.email,
          department: completeProfileData.department.name,
          contact_no: completeProfileData.contact_no,
          building: completeProfileData.building._id,
          floor: completeProfileData.floor?.toString(),
          lab_no: completeProfileData.lab_no,
          image: completeProfileData.image
        });

        if (newImage) {
          setProfileImage(newImage);
        }

        // Update auth context and localStorage
        const updatedEmployee = {
          ...employee,
          name: completeProfileData.name,
          email: completeProfileData.email,
          contact_no: completeProfileData.contact_no,
          floor: completeProfileData.floor,
          lab_no: completeProfileData.lab_no,
          profile_image: newImage,
          building: completeProfileData.building,
          department: completeProfileData.department
        };
        setEmployee(updatedEmployee);
        localStorage.setItem('employee', JSON.stringify(updatedEmployee));

        setIsEditing(false);
        setImageFile(null);
        setErrors({});
        toast.success('Profile updated successfully', {
          style: {
            background: "#4B2D87",
            color: "#fff"
          }
        });
      }
    } catch (err) {
      console.error('Update error:', err);
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setEditedData({
      name: profileData.name,
      email: profileData.email,
      department: profileData.department?.name || '',
      contact_no: profileData.contact_no,
      building: profileData.building?._id || '',
      floor: profileData.floor?.toString() || '',
      lab_no: profileData.lab_no || '',
      image: profileData.image || ''
    });
    setProfileImage(profileData?.image || null);
    setIsEditing(false);
    setImageFile(null);
    setErrors({});
  };

  const renderField = (label, value, icon, field) => {
    const Icon = icon;
    const isDropdown = field === 'building' || field === 'floor' || field === 'lab_no';
    const isDepartment = field === 'department';

    const getFieldValue = () => {
      if (!isEditing) {
        if ((field === 'building' || field === 'department') && value && typeof value === 'object') {
          return value.name || 'N/A';
        }
        return value || 'N/A';
      }
      return editedData[field] || '';
    };

    const getOptions = () => {
      switch (field) {
        case 'building':
          return buildings.map(b => ({
            value: b._id,
            label: b.name
          }));
        case 'floor':
          return floors.map(f => ({
            value: f,
            label: `Floor ${f}`
          }));
        case 'lab_no':
          return labs.map(l => ({
            value: l,
            label: `Lab ${l}`
          }));
        default:
          return [];
      }
    };

    const handleFieldChange = (e) => {
      const newValue = e.target.value;
      switch (field) {
        case 'building':
          setEditedData(prev => ({
            ...prev,
            building: newValue,
            floor: '',
            lab_no: ''
          }));
          break;
        case 'floor':
          setEditedData(prev => ({
            ...prev,
            floor: newValue,
            lab_no: ''
          }));
          break;
        default:
          setEditedData(prev => ({
            ...prev,
            [field]: newValue
          }));
      }
    };

    return (
      <div>
        <label className="block text-sm font-medium text-gray-500 mb-2">{label}</label>
        {isEditing ? (
          <div className="relative">
            <Icon className="absolute top-3 left-3 text-gray-400" size={20} />
            {isDropdown ? (
              <div className="relative">
                <select
                  value={getFieldValue()}
                  onChange={handleFieldChange}
                  className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-[#4B2D87] focus:border-transparent ${
                    errors[field] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isUpdating}
                >
                  <option value="">Select {label}</option>
                  {getOptions().map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown 
                  size={20} 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" 
                />
              </div>
            ) : (
              <input
                type={field === 'contact_no' ? 'tel' : 'text'}
                value={getFieldValue()}
                onChange={handleFieldChange}
                maxLength={field === 'contact_no' ? 10 : undefined}
                className={`pl-10 w-full py-2 border rounded-lg focus:ring-2 focus:ring-[#4B2D87] focus:border-transparent ${
                  errors[field] ? 'border-red-500' : 'border-gray-300'
                } ${isDepartment ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                disabled={isUpdating || isDepartment}
                readOnly={isDepartment}
              />
            )}
            {errors[field] && (
              <p className="text-red-500 text-sm mt-1">{errors[field]}</p>
            )}
          </div>
        ) : (
          <div className="flex items-center bg-gray-50 rounded-lg p-3 border border-gray-200">
            <Icon className="text-gray-400 mr-3" size={20} />
            <span className="text-gray-700">{getFieldValue()}</span>
          </div>
        )}
      </div>
    );
  };

  if (!employee && !loading) {
    return (
      <div className="min-h-screen bg-[#F5F3FF] p-6 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-md p-6 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h1>
          <p className="text-red-500">No user data found. Please log in again.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F3FF] p-6 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="animate-spin text-[#4B2D87] mb-4" size={40} />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F5F3FF] p-6">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md p-6">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="text-red-500 mt-2">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-[#4B2D87] text-white rounded-lg hover:bg-[#5E3A9F]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F3FF] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[#4B2D87] rounded-xl shadow-md p-8 mb-6 relative">
          {/* Loading overlay during update */}
          {isUpdating && (
            <div className="absolute inset-0 bg-black bg-opacity-30 rounded-xl flex items-center justify-center z-10">
              <div className="bg-white rounded-lg p-4 flex items-center">
                <Loader2 className="animate-spin text-[#4B2D87] mr-2" size={20} />
                <span className="text-gray-700">Updating profile...</span>
              </div>
            </div>
          )}
          
          <div className="absolute top-4 right-4 flex space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={isUpdating}
                  className="p-2 bg-green-500 rounded-lg hover:bg-green-600 transition-colors duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? (
                    <Loader2 size={20} className="text-white animate-spin" />
                  ) : (
                    <Check size={20} className="text-white" />
                  )}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isUpdating}
                  className="p-2 bg-red-500 rounded-lg hover:bg-red-600 transition-colors duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X size={20} className="text-white" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                disabled={isUpdating}
                className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Edit2 size={20} className="text-[#4B2D87] group-hover:text-[#5E3A9F]" />
              </button>
            )}
          </div>

          <div className="flex flex-col items-center">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 relative overflow-hidden group">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover rounded-full"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User size={40} className="text-[#4B2D87]" />
              )}
              {isEditing && !isUpdating && (
                <label className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                  <span className="text-white text-xs">Change</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white">{profileData?.name || 'Loading...'}</h1>
            <p className="text-gray-300 mt-1">{profileData?.email || 'Loading...'}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <User size={24} className="mr-3 text-[#4B2D87]" />
            Personal Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {renderField('Name', profileData?.name, User, 'name')}
            {renderField('Email', profileData?.email, Mail, 'email')}
            {renderField('Department', profileData?.department, Briefcase, 'department')}
            {renderField('Contact', profileData?.contact_no, Phone, 'contact_no')}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <Building size={24} className="mr-3 text-[#4B2D87]" />
            Location Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {renderField('Building', profileData?.building, Building2, 'building')}
            {renderField('Floor', profileData?.floor, LayoutGrid, 'floor')}
            {renderField('Lab Number', profileData?.lab_no, Building, 'lab_no')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;