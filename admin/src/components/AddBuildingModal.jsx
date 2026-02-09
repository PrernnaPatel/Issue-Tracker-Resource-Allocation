import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { addBuilding } from '../service/adminAuthService';
import { toast } from 'react-toastify';


const AddBuildingModal = ({ isOpen, onClose, onSuccess }) => {
  const [buildingData, setBuildingData] = useState({
    name: '',
    floors: [{ floor: 1, labs: [] }]
  });
  const [labInputs, setLabInputs] = useState(['']); // Track raw input values
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBuildingData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const addFloor = () => {
    setBuildingData(prev => ({
      ...prev,
      floors: [...prev.floors, { floor: prev.floors.length + 1, labs: [] }]
    }));
    setLabInputs(prev => [...prev, '']);
  };

  const removeFloor = (index) => {
    setBuildingData(prev => ({
      ...prev,
      floors: prev.floors.filter((_, i) => i !== index)
    }));
    setLabInputs(prev => prev.filter((_, i) => i !== index));
  };

  const handleLabChange = (floorIndex, value) => {
    // Update the raw input value
    setLabInputs(prev => 
      prev.map((input, i) => i === floorIndex ? value : input)
    );
    
    // Process the value and update building data
    const processedLabs = value.split(',').map(lab => lab.trim()).filter(Boolean);
    setBuildingData(prev => ({
      ...prev,
      floors: prev.floors.map((floor, i) => 
        i === floorIndex ? { ...floor, labs: processedLabs } : floor
      )
    }));

    // Clear error when user types
    if (errors[`floor${floorIndex}`]) {
      setErrors(prev => ({ ...prev, [`floor${floorIndex}`]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate
    const newErrors = {};
    if (!buildingData.name.trim()) {
      newErrors.name = 'Building name is required';
    }
    if (!buildingData.floors.length) {
      newErrors.floors = 'At least one floor is required';
    }

    // Check for empty labs
    buildingData.floors.forEach((floor, index) => {
      if (!floor.labs || floor.labs.length === 0) {
        newErrors[`floor${index}`] = 'At least one lab is required per floor';
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await addBuilding(buildingData);
      toast.success('Building added successfully');
      
      // Reset form
      setBuildingData({
        name: '',
        floors: [{ floor: 1, labs: [] }]
      });
      setLabInputs(['']);
      setErrors({});
      
      onClose();
      onSuccess?.();
    } catch (error) {
      toast.error(error.message || 'Failed to add building');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Add New Building</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Building Name
            </label>
            <input
              type="text"
              name="name"
              value={buildingData.name}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#4B2D87] focus:border-transparent ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter building name"
            />
            {errors.name && (
              <p className="flex items-center mt-1 text-sm text-red-600">
                <AlertCircle size={14} className="mr-1" /> {errors.name}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-700">Floors</label>
              <button
                type="button"
                onClick={addFloor}
                className="text-sm text-[#4B2D87] hover:text-[#5E3A9F]"
              >
                + Add Floor
              </button>
            </div>
            {buildingData.floors.map((floor, index) => (
              <div key={index} className="flex items-start space-x-4">
                <div className="flex-grow">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Floor {floor.floor} Labs
                  </label>
                  <input
                    type="text"
                    value={labInputs[index] || ''}
                    onChange={(e) => handleLabChange(index, e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#4B2D87] focus:border-transparent ${
                      errors[`floor${index}`] ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter lab numbers (e.g., 101, 102, 103)"
                  />
                  {errors[`floor${index}`] && (
                    <p className="flex items-center mt-1 text-sm text-red-600">
                      <AlertCircle size={14} className="mr-1" /> {errors[`floor${index}`]}
                    </p>
                  )}
                </div>
                {buildingData.floors.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeFloor(index)}
                    className="mt-7 text-red-500 hover:text-red-700"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#4B2D87] text-white rounded-lg hover:bg-[#5E3A9F]"
            >
              Add Building
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBuildingModal;