import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Building2, AlertCircle } from 'lucide-react';
import { getAllBuildings, deleteBuilding } from '../service/adminAuthService';
import { toast } from 'react-toastify';
import AddBuildingModal from '../components/AddBuildingModal';
import EditBuildingModal from '../components/EditBuildingModal';
// import { div } from 'framer-motion/client';

const Buildings = () => {
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingBuildingId, setDeletingBuildingId] = useState(null);
  const buildingsPerPage = 8;

  useEffect(() => {
    fetchBuildings();
  }, []);

  const fetchBuildings = async () => {
    try {
      setLoading(true);
      const buildings = await getAllBuildings();
      setBuildings(Array.isArray(buildings) ? buildings : []);
    } catch (error) {
      console.error('Error fetching buildings:', error);
      toast.error(error.message || 'Failed to load buildings');
    } finally {
      setLoading(false);
    }
  };

  // Filter buildings based on search query
  const filteredBuildings = buildings.filter(building =>
    building.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination logic
  const indexOfLastBuilding = currentPage * buildingsPerPage;
  const indexOfFirstBuilding = indexOfLastBuilding - buildingsPerPage;
  const currentBuildings = filteredBuildings.slice(indexOfFirstBuilding, indexOfLastBuilding);
  const totalPages = Math.ceil(filteredBuildings.length / buildingsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleEditClick = (building) => {
    setSelectedBuilding(building);
    setShowEditModal(true);
  };

  const handleAddBuildingSuccess = () => {
    setShowAddModal(false);
    fetchBuildings(); // Refresh the buildings list
  };

  const handleUpdateBuildingSuccess = () => {
    setShowEditModal(false);
    setSelectedBuilding(null);
    fetchBuildings();
  };

  const handleDeleteBuilding = async (buildingId, buildingName) => {
    // Show confirmation dialog
    const isConfirmed = window.confirm(
      `Are you sure you want to delete "${buildingName}"? This action cannot be undone.`
    );

    if (!isConfirmed) {
      return;
    }

    try {
      setDeletingBuildingId(buildingId);
      const result = await deleteBuilding(buildingId);
      
      if (result.success) {
        toast.success(result.message || 'Building deleted successfully');
        fetchBuildings(); // Refresh the buildings list
      } else {
        toast.error(result.message || 'Failed to delete building');
      }
    } catch (error) {
      console.error('Error deleting building:', error);
      toast.error(error.message || 'Failed to delete building');
    } finally {
      setDeletingBuildingId(null);
    }
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4B2D87]"></div>
        </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Buildings</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2 bg-[#4B2D87] text-white rounded-lg hover:bg-[#5E3A9F] transition-colors"
          >
            <Plus size={20} className="mr-2" />
            Add Building
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search buildings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B2D87] focus:border-transparent"
            />
          </div>
        </div>

        {/* Buildings Grid */}
        {currentBuildings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {currentBuildings.map((building) => (
              <div
                key={building._id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Building2 size={24} className="text-[#4B2D87]" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                      onClick={() => handleEditClick(building)}
                    >
                      <Edit2 size={16} className="text-gray-500" />
                    </button>
                    <button
                      className={`p-1 rounded-full transition-colors ${
                        deletingBuildingId === building._id
                          ? 'bg-gray-100 cursor-not-allowed'
                          : 'hover:bg-gray-100'
                      }`}
                      onClick={() => handleDeleteBuilding(building._id, building.name)}
                      disabled={deletingBuildingId === building._id}
                    >
                      {deletingBuildingId === building._id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                      ) : (
                      <Trash2 size={16} className="text-red-500" />
                      )}
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-800 mb-2">{building.name}</h3>
                
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Floors: {building.floors?.length || 0}
                  </p>
                  <p className="text-sm text-gray-600">
                    Total Labs: {building.floors?.reduce((total, floor) => total + (floor.labs?.length || 0), 0) || 0}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Building2 size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No buildings found</h3>
            <p className="text-gray-500">
              {searchQuery
                ? "No buildings match your search criteria"
                : "Start by adding your first building"}
            </p>
          </div>
        )}

        {/* Pagination */}
        {filteredBuildings.length > buildingsPerPage && (
          <div className="mt-6 flex justify-center">
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-1 border border-gray-300 rounded-md text-sm ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => handlePageChange(i + 1)}
                  className={`px-3 py-1 border border-gray-300 rounded-md text-sm ${
                    currentPage === i + 1
                      ? 'bg-[#4B2D87] text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 border border-gray-300 rounded-md text-sm ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals rendered outside the main content for proper blur */}
      {showAddModal && (
        <AddBuildingModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddBuildingSuccess}
        />
      )}
      {showEditModal && selectedBuilding && (
        <EditBuildingModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          building={selectedBuilding}
          onSuccess={handleUpdateBuildingSuccess}
        />
      )}
    </div>
  );
};

export default Buildings;