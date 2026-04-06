import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { updateBuilding } from '../service/adminAuthService';

const EditBuildingModal = ({ isOpen, onClose, building, onSuccess }) => {
  const [name, setName] = useState('');
  const [floors, setFloors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (building) {
      setName(building.name || '');
      setFloors(building.floors ? JSON.parse(JSON.stringify(building.floors)) : []);
    }
  }, [building]);

  const handleFloorChange = (index, field, value) => {
    const newFloors = [...floors];
    newFloors[index][field] = value;
    setFloors(newFloors);
  };

  const handleLabChange = (floorIndex, labIndex, value) => {
    const newFloors = [...floors];
    newFloors[floorIndex].labs[labIndex] = value;
    setFloors(newFloors);
  };

  const addFloor = () => {
    setFloors([...floors, { floor: '', labs: [''] }]);
  };

  const removeFloor = (index) => {
    setFloors(floors.filter((_, i) => i !== index));
  };

  const addLab = (floorIndex) => {
    const newFloors = [...floors];
    newFloors[floorIndex].labs.push('');
    setFloors(newFloors);
  };

  const removeLab = (floorIndex, labIndex) => {
    const newFloors = [...floors];
    newFloors[floorIndex].labs = newFloors[floorIndex].labs.filter((_, i) => i !== labIndex);
    setFloors(newFloors);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await updateBuilding(building._id, { name, floors });
      console.log(result);
      if (result.success) {
        toast.success('Building updated successfully!');
        onSuccess();
      } else {
        toast.error(result.message || 'Failed to update building.');
      }
    } catch (error) {
      toast.error('An error occurred while updating the building.',error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Edit Building</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="buildingName" className="block text-sm font-medium text-gray-700 mb-2">Building Name</label>
            <input
              id="buildingName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B2D87] focus:border-transparent"
              required
            />
          </div>

          <h3 className="text-lg font-semibold text-gray-700 mb-4">Floors</h3>
          <div className="space-y-6">
            {floors.map((floor, floorIndex) => (
              <div key={floorIndex} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <input
                    type="text"
                    placeholder="Floor Name (e.g., Ground Floor)"
                    value={floor.floor}
                    onChange={(e) => handleFloorChange(floorIndex, 'floor', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#4B2D87]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => removeFloor(floorIndex)}
                    className="ml-4 text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
                
                <h4 className="text-md font-medium text-gray-600 mb-2 ml-1">Labs</h4>
                <div className="space-y-3">
                  {floor.labs.map((lab, labIndex) => (
                    <div key={labIndex} className="flex items-center">
                      <input
                        type="text"
                        placeholder="Lab Name"
                        value={lab}
                        onChange={(e) => handleLabChange(floorIndex, labIndex, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#4B2D87]"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => removeLab(floorIndex, labIndex)}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
                 <button
                    type="button"
                    onClick={() => addLab(floorIndex)}
                    className="mt-4 flex items-center px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                  >
                    <Plus size={16} className="mr-1" /> Add Lab
                  </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addFloor}
            className="mt-6 flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
          >
            <Plus size={18} className="mr-2" /> Add Floor
          </button>
          
          <div className="mt-8 flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[#4B2D87] text-white rounded-lg hover:bg-[#5E3A9F] transition-colors disabled:bg-gray-400"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Update Building'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditBuildingModal; 