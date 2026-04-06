import { useState, useEffect } from "react";
import { User, Mail, Lock, AlertCircle, ChevronDown, Building, Hash, Phone } from "lucide-react";
import { getAllBuildings, getAllDepartments, registerNewUser } from '../services/authService';
import { toast } from 'react-toastify';

const RegistrationForm = ({ onLoginClick }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    securityPin: "",
    confirmSecurityPin: "",
    department: "",
    building: "",
    floor: "",
    lab_no: "",
    contact_no: "",
    termsAgreed: false
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [labs, setLabs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [showBuildingDropdown, setShowBuildingDropdown] = useState(false);
  const [showFloorDropdown, setShowFloorDropdown] = useState(false);
  const [showLabDropdown, setShowLabDropdown] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [buildingsData, deptsData] = await Promise.all([
          getAllBuildings(),
          getAllDepartments()
        ]);
        setBuildings(buildingsData || []);
        setDepartments(deptsData || []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Failed to load buildings or departments');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (formData.building) {
      const selectedBuilding = buildings.find(b => b.name === formData.building);
      if (selectedBuilding) {
        const availableFloors = selectedBuilding.floors.map(f => f.floor.toString());
        setFloors(availableFloors);
        setFormData(prev => ({ ...prev, floor: '', lab_no: '' }));
      } else {
        setFloors([]);
      }
    } else {
      setFloors([]);
      setLabs([]);
    }
  }, [formData.building, buildings]);

  useEffect(() => {
    if (formData.building && formData.floor) {
      const selectedBuilding = buildings.find(b => b.name === formData.building);
      const selectedFloor = selectedBuilding?.floors.find(
        f => f.floor.toString() === formData.floor
      );
      if (selectedFloor) {
        setLabs(selectedFloor.labs);
        setFormData(prev => ({ ...prev, lab_no: '' }));
      } else {
        setLabs([]);
      }
    } else {
      setLabs([]);
    }
  }, [formData.building, formData.floor, buildings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const selectDepartment = (dept) => {
    setFormData(prev => ({ ...prev, department: dept }));
    setShowDepartmentDropdown(false);
    if (errors.department) {
      setErrors(prev => ({ ...prev, department: '' }));
    }
  };

  const selectBuilding = (building) => {
    setFormData(prev => ({ ...prev, building, floor: '', lab_no: '' }));
    setShowBuildingDropdown(false);
    if (errors.building) {
      setErrors(prev => ({ ...prev, building: '' }));
    }
  };

  const selectFloor = (floor) => {
    setFormData(prev => ({ ...prev, floor, lab_no: '' }));
    setShowFloorDropdown(false);
    if (errors.floor) {
      setErrors(prev => ({ ...prev, floor: '' }));
    }
  };

  const selectLab = (lab) => {
    setFormData(prev => ({ ...prev, lab_no: lab }));
    setShowLabDropdown(false);
    if (errors.lab_no) {
      setErrors(prev => ({ ...prev, lab_no: '' }));
    }
  };

  const validateContactNumber = (number) => {
    const indianMobileRegex = /^[6-9]\d{9}$/;
    return indianMobileRegex.test(number);
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = "Name is required";
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    if (!/^\d{6}$/.test(formData.securityPin)) {
      newErrors.securityPin = "Security pin must be exactly 6 digits";
    }
    if (!formData.confirmSecurityPin) {
      newErrors.confirmSecurityPin = "Please confirm your security pin";
    } else if (formData.securityPin !== formData.confirmSecurityPin) {
      newErrors.confirmSecurityPin = "Security pins do not match";
    }
    if (!formData.department) newErrors.department = "Department is required";
    if (!formData.building) newErrors.building = "Building is required";
    if (!formData.floor) newErrors.floor = "Floor is required";
    if (!formData.lab_no) newErrors.lab_no = "Lab number is required";
    if (!formData.contact_no) {
      newErrors.contact_no = "Contact number is required";
    } else if (!validateContactNumber(formData.contact_no)) {
      newErrors.contact_no = "Please enter a valid Indian mobile number (10 digits starting with 6, 7, 8, or 9)";
    }
    if (!formData.termsAgreed) {
      newErrors.termsAgreed = "You must agree to the Terms of Service and Privacy Policy";
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Register submit clicked", formData);
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      toast.error("Please fix the highlighted fields before registering.");
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await registerNewUser(formData);
      
      // Check for success based on response.success or message content
      if (response.success || response.message === "Registered successfully") {
        toast.success("Registration successful! Please login.", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: "light",
          style: {
            background: "#4B2D87",
            color: "#fff",
            borderRadius: "10px",
          },
          progressStyle: {
            background: "#fff"
          }
        });
        setFormData({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
          securityPin: "",
          confirmSecurityPin: "",
          department: "",
          building: "",
          floor: "",
          lab_no: "",
          contact_no: "",
          termsAgreed: false
        });
        setFloors([]);
        setLabs([]);
        if (typeof onLoginClick === "function") {
          onLoginClick();
        }
      } else {
        toast.error(response.message || "Registration failed", {
          position: "top-right",
          autoClose: 3000,
          theme: "light"
        });
        setErrors({ form: response.message || "Registration failed" });
      }
    } catch (error) {
      console.error("Error during registration:", error);
      const errorMessage = error.message || "Something went wrong. Please try again.";
      toast.error(errorMessage);
      setErrors({ form: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const DropdownField = ({ 
    label, 
    value, 
    placeholder, 
    options, 
    onSelect, 
    showDropdown, 
    setShowDropdown, 
    error, 
    icon: Icon 
  }) => (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className={`w-full py-3 pl-10 pr-10 text-left border rounded-full bg-white relative focus:outline-none focus:ring-2 ${
          error
            ? "border-red-500 focus:ring-red-200"
            : "border-gray-300 focus:ring-[#4B2D87]"
        }`}
      >
        {Icon && (
          <Icon
            className="absolute top-3 left-3 text-gray-400"
            size={18}
          />
        )}
        <span className={value ? "text-gray-900" : "text-gray-400"}>
          {value || placeholder}
        </span>
        <ChevronDown
          className="absolute top-3 right-3 text-gray-400"
          size={18}
        />
      </button>

      {showDropdown && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto transition duration-150 ease-in-out">
          {options.length > 0 ? (
            options.map((option) => (
              <button
                type="button"
                key={option}
                onClick={() => onSelect(option)}
                className={`w-full text-left px-4 py-2 text-sm ${
                  value === option
                    ? "bg-[#EDE9FE] text-[#4B2D87]"
                    : "hover:bg-gray-100"
                }`}
              >
                {option}
              </button>
            ))
          ) : (
            <div className="px-4 py-2 text-sm text-gray-500">
              No options available
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="flex items-center mt-1 text-sm text-red-600">
          <AlertCircle size={14} className="mr-1" /> {error}
        </p>
      )}
    </div>
  );

  return (
    <div className="p-8 flex flex-col h-[550px]">
      <div className="overflow-y-auto pr-2">
        <div className="pb-4">
          {isLoading && (
            <p className="text-gray-600">Loading data...</p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User
                  className="absolute top-3 left-3 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full py-3 pl-10 pr-3 border rounded-full focus:outline-none focus:ring-2 ${
                    errors.name
                      ? "border-red-500 focus:ring-red-200"
                      : "border-gray-300 focus:ring-[#4B2D87]"
                  }`}
                  placeholder="Full Name"
                />
              </div>
              {errors.name && (
                <p className="flex items-center mt-1 text-sm text-red-600">
                  <AlertCircle size={14} className="mr-1" /> {errors.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className="absolute top-3 left-3 text-gray-400"
                  size={18}
                />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full py-3 pl-10 pr-3 border rounded-full focus:outline-none focus:ring-2 ${
                    errors.email
                      ? "border-red-500 focus:ring-red-200"
                      : "border-gray-300 focus:ring-[#4B2D87]"
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Number
              </label>
              <div className="relative">
                <Phone
                  className="absolute top-3 left-3 text-gray-400"
                  size={18}
                />
                <input
                  type="tel"
                  name="contact_no"
                  value={formData.contact_no}
                  onChange={handleChange}
                  className={`w-full py-3 pl-10 pr-3 border rounded-full focus:outline-none focus:ring-2 ${
                    errors.contact_no
                      ? "border-red-500 focus:ring-red-200"
                      : "border-gray-300 focus:ring-[#4B2D87]"
                  }`}
                  placeholder="+91 0000000000"
                  maxLength="10"
                />
              </div>
              {errors.contact_no && (
                <p className="flex items-center mt-1 text-sm text-red-600">
                  <AlertCircle size={14} className="mr-1" /> {errors.contact_no}
                </p>
              )}
            </div>

            <DropdownField
              label="Department"
              value={formData.department}
              placeholder="Select department"
              options={departments.map(dept => dept.name)}
              onSelect={selectDepartment}
              showDropdown={showDepartmentDropdown}
              setShowDropdown={setShowDepartmentDropdown}
              error={errors.department}
              icon={Hash}
            />

            <DropdownField
              label="Building"
              value={formData.building}
              placeholder="Select building"
              options={buildings.map(b => b.name)}
              onSelect={selectBuilding}
              showDropdown={showBuildingDropdown}
              setShowDropdown={setShowBuildingDropdown}
              error={errors.building}
              icon={Building}
            />

            {formData.building && (
              <DropdownField
                label="Floor"
                value={formData.floor}
                placeholder="Select floor"
                options={floors}
                onSelect={selectFloor}
                showDropdown={showFloorDropdown}
                setShowDropdown={setShowFloorDropdown}
                error={errors.floor}
                icon={Hash}
              />
            )}

            {formData.floor && (
              <DropdownField
                label="Lab Number"
                value={formData.lab_no}
                placeholder="Select lab number"
                options={labs}
                onSelect={selectLab}
                showDropdown={showLabDropdown}
                setShowDropdown={setShowLabDropdown}
                error={errors.lab_no}
                icon={Hash}
              />
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute top-3 left-3 text-gray-400"
                  size={18}
                />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full py-3 pl-10 pr-3 border rounded-full focus:outline-none focus:ring-2 ${
                    errors.password
                      ? "border-red-500 focus:ring-red-200"
                      : "border-gray-300 focus:ring-[#4B2D87]"
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute top-3 left-3 text-gray-400"
                  size={18}
                />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full py-3 pl-10 pr-3 border rounded-full focus:outline-none focus:ring-2 ${
                    errors.confirmPassword
                      ? "border-red-500 focus:ring-red-200"
                      : "border-gray-300 focus:ring-[#4B2D87]"
                  }`}
                  placeholder="••••••••"
                />
              </div>
              {errors.confirmPassword && (
                <p className="flex items-center mt-1 text-sm text-red-600">
                  <AlertCircle size={14} className="mr-1" /> {errors.confirmPassword}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                6-digit Security PIN
              </label>
              <div className="relative">
                <Lock
                  className="absolute top-3 left-3 text-gray-400"
                  size={18}
                />
                <input
                  type="password"
                  name="securityPin"
                  value={formData.securityPin}
                  onChange={handleChange}
                  inputMode="numeric"
                  maxLength={6}
                  className={`w-full py-3 pl-10 pr-3 border rounded-full focus:outline-none focus:ring-2 ${
                    errors.securityPin
                      ? "border-red-500 focus:ring-red-200"
                      : "border-gray-300 focus:ring-[#4B2D87]"
                  }`}
                  placeholder="Enter 6-digit PIN"
                />
              </div>
              {errors.securityPin && (
                <p className="flex items-center mt-1 text-sm text-red-600">
                  <AlertCircle size={14} className="mr-1" /> {errors.securityPin}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Security PIN
              </label>
              <div className="relative">
                <Lock
                  className="absolute top-3 left-3 text-gray-400"
                  size={18}
                />
                <input
                  type="password"
                  name="confirmSecurityPin"
                  value={formData.confirmSecurityPin}
                  onChange={handleChange}
                  inputMode="numeric"
                  maxLength={6}
                  className={`w-full py-3 pl-10 pr-3 border rounded-full focus:outline-none focus:ring-2 ${
                    errors.confirmSecurityPin
                      ? "border-red-500 focus:ring-red-200"
                      : "border-gray-300 focus:ring-[#4B2D87]"
                  }`}
                  placeholder="Confirm 6-digit PIN"
                />
              </div>
              {errors.confirmSecurityPin && (
                <p className="flex items-center mt-1 text-sm text-red-600">
                  <AlertCircle size={14} className="mr-1" /> {errors.confirmSecurityPin}
                </p>
              )}
            </div>

            <div className="flex items-center">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                className="h-4 w-4 text-[#4B2D87] focus:ring-[#4B2D87] border-gray-300 rounded"
                checked={formData.termsAgreed}
                onChange={(e) =>
                  setFormData({ ...formData, termsAgreed: e.target.checked })
                }
              />
              <label
                htmlFor="terms"
                className="ml-2 block text-sm text-gray-700"
              >
                I agree to the{" "}
                <a href="#" className="text-[#4B2D87] hover:underline">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="text-[#4B2D87] hover:underline">
                  Privacy Policy
                </a>
              </label>
            </div>
            {errors.termsAgreed && (
              <p className="flex items-center mt-1 text-sm text-red-600">
                <AlertCircle size={14} className="mr-1" /> {errors.termsAgreed}
              </p>
            )}

            {errors.form && (
              <p className="flex items-center mt-1 text-sm text-red-600">
                <AlertCircle size={14} className="mr-1" /> {errors.form}
              </p>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`w-full py-3 rounded-full font-medium transition-all ${
                isSubmitting
                  ? "bg-gray-400 cursor-not-allowed text-white"
                  : "bg-[#4B2D87] text-white hover:bg-[#5E3A9F]"
              }`}
            >
              {isSubmitting ? "Creating account..." : "Register"}
            </button>
          </form>
        </div>
      </div>
      <div className="text-center mt-4 pt-2 border-t border-gray-100">
        <p className="text-sm text-gray-600">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onLoginClick}
            className="text-[#4B2D87] hover:underline font-medium"
          >
            Login
          </button>
        </p>
      </div>
    </div>
  );
};

export default RegistrationForm;
