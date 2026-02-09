"use client"

import { useState, useEffect, useRef } from "react"
import {
  Plus,
  Monitor,
  Cpu,
  Mouse,
  Keyboard,
  Building2,
  User,
  Mail,
  Hash,
  MapPin,
  Shield,
  Usb,
  HardDrive,
  AlertCircle,
  Copy,
  Zap,
  X,
  Save,
  Trash2,
  Package,
  Settings,
  Info,
} from "lucide-react"
import { getAllInventorySystems, addInventorySystem, getAllComponentSets, getLoggedInDepartmentalAdmin, getAllBuildingsForAdminIT, bulkUpdateInventoryLocation, bulkDeleteInventorySystems } from "../../service/deptAuthService"
import { toast } from "react-toastify";
import { useNavigate } from 'react-router-dom';
import InventorySystemForm from '../../components/InventorySystemForm';

const initialInventory = {
  tag: "",
  systemName: "",
  systemType: "Desktop",
  modelNo: "",
  manufacturer: "",
  designations: "",
  department: "",
  building: "",
  floor: "",
  labNumber: "",
  ipAddress: "",
  macAddress: "",
  usbStatus: "",
  hasAntivirus: "",
  desktopPolicy: "",
  remark: "",
  ownerEmail: "",
  components: [],
}

const usbOptions = ["Enabled", "Disabled"];
const yesNoOptions = ["Yes", "No"];

function InventoryManagement() {
  const [inventory, setInventory] = useState(initialInventory)
  const [allSystems, setAllSystems] = useState([])
  const [showAddSystemForm, setShowAddSystemForm] = useState(false)
  const navigate = useNavigate();
  
  // Building/Floor/Lab state
  const [buildings, setBuildings] = useState([])
  const [floors, setFloors] = useState([])
  const [labs, setLabs] = useState([])
  
  // Add networkLocations state
  const [networkLocations, setNetworkLocations] = useState([]);

  // Add filter state for inventory table
  const [filterBuilding, setFilterBuilding] = useState('');
  const [filterFloor, setFilterFloor] = useState('');
  const [filterLab, setFilterLab] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const systemsPerPage = 10;

  // Add a state to remember last used location/type for sticky add
  // const [lastLocation, setLastLocation] = useState(null);
  const otherTypeInputRef = useRef(null);

  // Add state for bulk add and quick add components
  const [componentTypes, setComponentTypes] = useState([]);
  const [componentSets, setComponentSets] = useState([]);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkComponents, setBulkComponents] = useState([]);
  const [showOtherInput, setShowOtherInput] = useState({});
  const [otherComponentName, setOtherComponentName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [expandedSystemIndex, setExpandedSystemIndex] = useState(null);
  const [expandAll, setExpandAll] = useState(false);

  // Bulk update location state
  const [selectedSystems, setSelectedSystems] = useState([]);
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [bulkUpdateLocation, setBulkUpdateLocation] = useState({
    building: '',
    floor: '',
    labNumber: ''
  });
  const [bulkUpdateFloors, setBulkUpdateFloors] = useState([]);
  const [bulkUpdateLabs, setBulkUpdateLabs] = useState([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Bulk delete state
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const initializeData = async () => {
      try {
        await fetchUserAndBuildings();
        await Promise.all([
          fetchInventorySystems(),
          fetchComponentSetsAndTypes(),
        ]);
      } catch (error) {
        toast("Failed to initialize inventory data: " + error);
      }
    };
    initializeData();
  }, []);

  const fetchUserAndBuildings = async () => {
    try {
      const userRes = await getLoggedInDepartmentalAdmin();
      if (userRes.success && userRes.data) {
        const userData = userRes.data.admin || userRes.data;
        let extractedBuildings = [];
        if (userData.isNetworkEngineer && Array.isArray(userData.locations)) {
          setNetworkLocations(userData.locations);
          // Extract unique buildings for dropdown
          const uniqueBuildings = [];
          const seen = new Set();
          userData.locations.forEach((loc) => {
            if (loc.building && !seen.has(loc.building._id)) {
              uniqueBuildings.push(loc.building);
              seen.add(loc.building._id);
            }
          });
          extractedBuildings = uniqueBuildings;
          setBuildings(extractedBuildings);
          
          if (uniqueBuildings.length === 1) {
            setInventory((prev) => ({ ...prev, building: uniqueBuildings[0]._id }));
          }
        } else if (userData.department.name === 'Admin IT') {
          setNetworkLocations([]);
          // Fetch all buildings for Admin IT using separate function
          const allBuildings = await getAllBuildingsForAdminIT();
          setBuildings(allBuildings);
          extractedBuildings = allBuildings;
          if (allBuildings.length === 1) {
            setInventory((prev) => ({ ...prev, building: allBuildings[0]._id }));
          }
        } else {
          setNetworkLocations([]);
          if (Array.isArray(userData.buildings)) {
            extractedBuildings = userData.buildings;
            setBuildings(extractedBuildings);
          } else if (userData.building) {
            extractedBuildings = [userData.building];
            setBuildings(extractedBuildings);
          }
          if (extractedBuildings.length === 1) {
            setInventory((prev) => ({ ...prev, building: extractedBuildings[0]._id }));
          }
        }
      } else {
        setBuildings([]);
        setNetworkLocations([]);
      }
    } catch (error) {
      setBuildings([]);
      setNetworkLocations([]);
      toast("Failed to load building data: " + error.message);
    }
  };

  // Update fetchComponentSetsAndTypes to populate componentTypes and componentSets
  const fetchComponentSetsAndTypes = async () => {
    try {
      const setsRes = await getAllComponentSets();
      const sets = Array.isArray(setsRes) ? setsRes : setsRes?.sets || [];
      setComponentSets(sets);
      const compTypes = new Set();
      sets.forEach(set => {
        (set.components || []).forEach(comp => {
          if (comp.componentType) compTypes.add(comp.componentType);
        });
      });
      setComponentTypes(Array.from(compTypes));
    } catch (error) {
      setComponentSets([]);
      setComponentTypes([]);
      toast("Failed to load component sets/types: " + error);
    }
  };

  const fetchInventorySystems = async () => {
    try {
      const systemsRes = await getAllInventorySystems();
      const systems = Array.isArray(systemsRes) ? systemsRes : systemsRes?.systems || [];
      setAllSystems(systems);
    } catch (error) {
      setAllSystems([]);
      toast("Failed to load inventory systems: " + error);
    }
  };

  // Update floors when building changes
  useEffect(() => {
    if (inventory.building) {
      if (networkLocations.length > 0) {
        // For network engineer
        const floorsSet = new Set();
        networkLocations.forEach(loc => {
          if (loc.building._id === inventory.building) {
            floorsSet.add(loc.floor.toString());
          }
        });
        setFloors(Array.from(floorsSet));
        setInventory(prev => ({ ...prev, floor: "", labNumber: "" }));
        setLabs([]);
      } else {
        // Existing logic for non-network engineer
        const selectedBuilding = buildings.find(b => b._id === inventory.building);
        if (selectedBuilding && selectedBuilding.floors) {
          const availableFloors = selectedBuilding.floors.map(f => f.floor.toString());
          setFloors(availableFloors);
          setInventory(prev => ({ ...prev, floor: "", labNumber: "" }));
          setLabs([]);
        }
      }
    } else {
      setFloors([]);
      setLabs([]);
    }
  }, [inventory.building, buildings, networkLocations]);

  // Update labs when floor changes
  useEffect(() => {
    if (inventory.building && inventory.floor) {
      if (networkLocations.length > 0) {
        // For network engineer
        const labsSet = new Set();
        networkLocations.forEach(loc => {
          if (
            loc.building._id === inventory.building &&
            loc.floor.toString() === inventory.floor
          ) {
            (loc.labs || []).forEach(lab => labsSet.add(lab));
          }
        });
        setLabs(Array.from(labsSet));
        setInventory(prev => ({ ...prev, labNumber: "" }));
      } else {
        // Existing logic for non-network engineer
        const selectedBuilding = buildings.find(b => b._id === inventory.building);
        if (selectedBuilding && selectedBuilding.floors) {
          const selectedFloor = selectedBuilding.floors.find(f => f.floor.toString() === inventory.floor);
          if (selectedFloor && selectedFloor.labs) {
            setLabs(selectedFloor.labs);
            setInventory(prev => ({ ...prev, labNumber: "" }));
          }
        }
      }
    } else {
      setLabs([]);
    }
  }, [inventory.building, inventory.floor, networkLocations, buildings]);

  // Helper for custom component type
  const isCustomComponentType = (componentType) => {
    return componentType && !componentTypes.includes(componentType);
  };

  const handleInventoryChange = (field, value) => {
    setInventory(prev => ({ ...prev, [field]: value }));
  };

  const handleAddSystem = async (e) => {
    e.preventDefault();
    if (!inventory.tag || !inventory.systemName || !inventory.building || !inventory.floor || !inventory.labNumber) {
      alert("Please fill in all required fields including building, floor, and lab");
      return;
    }
    // Floor validation for network engineers
    if (networkLocations.length > 0) {
      const allowed = networkLocations.some(loc =>
        loc.building._id === inventory.building &&
        loc.floor.toString() === inventory.floor
      );
      if (!allowed) {
        alert("You are not allowed to add a system to this floor in the selected building.");
        return;
      }
    }
    try {
      const payload = {
        ...inventory,
        buildingName: buildings.find(b => b._id === inventory.building)?.name || "",
        owner: inventory.ownerEmail, // send as 'owner' for backend
      };
      delete payload.ownerEmail
      Object.keys(payload).forEach(key => {
        if (payload[key] === "" || payload[key] === undefined) {
          delete payload[key];
        }
      });
      const newSystem = await addInventorySystem(payload);
      // Show backend error message if present
      if (newSystem && newSystem.message) {
        if (newSystem.message.includes("Owner's assigned location")) {
          toast("The selected floor/lab does not match the owner (employee) location. Please check the owner email and location.\n");
        } else {
          toast(newSystem.message);
        }
        return;
      }
      await fetchInventorySystems();
      setTimeout(() => {
        setCurrentPage(Math.ceil((allSystems.length + 1) / systemsPerPage));
      }, 0);
      // Save last used location/type
      // setLastLocation({ // This line was removed
      //   building: inventory.building,
      //   floor: inventory.floor,
      //   labNumber: inventory.labNumber,
      //   systemType: inventory.systemType
      // });
      // Reset only non-location fields
      setInventory({
        ...initialInventory,
        building: inventory.building,
        floor: inventory.floor,
        labNumber: inventory.labNumber,
        systemType: inventory.systemType
      });
      // Keep the add form open for next entry
      toast.success("System added! You can add another for the same location.");
    } catch (error) {
      toast.error(error.message || "Failed to add system");
    }
  };

  // After allSystems is set/updated, reset to page 1
  useEffect(() => {
    setCurrentPage(1);
  }, [allSystems.length]);

  // Filtered systems for table
  const filteredSystems = allSystems.filter(system => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (system.tag && system.tag.toLowerCase().includes(q)) ||
      (system.systemName && system.systemName.toLowerCase().includes(q)) ||
      (system.modelNo && system.modelNo.toLowerCase().includes(q)) ||
      (system.ownerEmail && system.ownerEmail.toLowerCase().includes(q)) ||
      (system.addedBy && (
        (system.addedBy.name && system.addedBy.name.toLowerCase().includes(q)) ||
        (system.addedBy.email && system.addedBy.email.toLowerCase().includes(q))
      )) ||
      (system.updatedBy && (
        (system.updatedBy.name && system.updatedBy.name.toLowerCase().includes(q)) ||
        (system.updatedBy.email && system.updatedBy.email.toLowerCase().includes(q))
      ))
    );
  });
  const indexOfLastSystem = currentPage * systemsPerPage;
  const indexOfFirstSystem = indexOfLastSystem - systemsPerPage;
  const currentSystems = filteredSystems.slice(indexOfFirstSystem, indexOfLastSystem);
  const totalPages = Math.ceil(filteredSystems.length / systemsPerPage);

  useEffect(() => {
    if (inventory.newComponentType === 'Other' && otherTypeInputRef.current) {
      otherTypeInputRef.current.focus();
    }
  }, [inventory.newComponentType]);

  // Add handlers for System Components section
  const handleBulkComponentChange = (index, field, value) => {
    setBulkComponents(prev => prev.map((comp, i) => (i === index ? { ...comp, [field]: value } : comp)));
  };
  const handleAddBulkComponents = () => {
    const validComponents = bulkComponents.filter((comp) => comp.tag && comp.componentType);
    if (validComponents.length === 0) {
      setErrorMsg("Please fill in at least one component with tag and type");
      setTimeout(() => setErrorMsg(""), 4000);
      return;
    }
    setInventory(prev => ({ ...prev, components: [...(prev.components || []), ...validComponents] }));
    setBulkComponents([]);
    setShowBulkAdd(false);
  };
  const removeComponent = (index) => {
    setInventory(prev => ({ ...prev, components: prev.components.filter((_, i) => i !== index) }));
  };
  const handleAddComponentSet = (setName) => {
    const componentSet = componentSets.find(set => set.name === setName);
    setBulkComponents(componentSet.components.map((comp) => ({ ...comp, tag: "", serialNumber: "", remark: "" })));
    setShowBulkAdd(true);
  };

  // Bulk update location functions
  const handleSystemSelection = (systemId) => {
    setSelectedSystems(prev => 
      prev.includes(systemId) 
        ? prev.filter(id => id !== systemId)
        : [...prev, systemId]
    );
  };

  const handleSelectAllSystems = () => {
    if (selectedSystems.length === currentSystems.filter(Boolean).length) {
      setSelectedSystems([]);
    } else {
      setSelectedSystems(currentSystems.filter(Boolean).map(system => system._id));
    }
  };

  const handleSelectAllSystemsAcrossPages = () => {
    if (selectedSystems.length === filteredSystems.length) {
      setSelectedSystems([]);
    } else {
      setSelectedSystems(filteredSystems.map(system => system._id));
    }
  };

  const handleBulkUpdateLocationChange = (field, value) => {
    setBulkUpdateLocation(prev => {
      const newLocation = { ...prev, [field]: value };
      
      // Update floors when building changes
      if (field === 'building') {
        if (networkLocations.length > 0) {
          const floorsSet = new Set();
          networkLocations.forEach(loc => {
            if (loc.building._id === value) {
              floorsSet.add(loc.floor.toString());
            }
          });
          setBulkUpdateFloors(Array.from(floorsSet));
          setBulkUpdateLabs([]);
          return { ...newLocation, floor: "", labNumber: "" };
        } else {
          const selectedBuilding = buildings.find(b => b._id === value);
          if (selectedBuilding && selectedBuilding.floors) {
            const availableFloors = selectedBuilding.floors.map(f => f.floor.toString());
            setBulkUpdateFloors(availableFloors);
            setBulkUpdateLabs([]);
            return { ...newLocation, floor: "", labNumber: "" };
          }
        }
      }
      
      // Update labs when floor changes
      if (field === 'floor') {
        if (networkLocations.length > 0) {
          const labsSet = new Set();
          networkLocations.forEach(loc => {
            if (
              loc.building._id === newLocation.building &&
              loc.floor.toString() === value
            ) {
              (loc.labs || []).forEach(lab => labsSet.add(lab));
            }
          });
          setBulkUpdateLabs(Array.from(labsSet));
          return { ...newLocation, labNumber: "" };
        } else {
          const selectedBuilding = buildings.find(b => b._id === newLocation.building);
          if (selectedBuilding && selectedBuilding.floors) {
            const selectedFloor = selectedBuilding.floors.find(f => f.floor.toString() === value);
            if (selectedFloor && selectedFloor.labs) {
              setBulkUpdateLabs(selectedFloor.labs);
              return { ...newLocation, labNumber: "" };
            }
          }
        }
      }
      
      return newLocation;
    });
  };

  const handleBulkUpdateLocation = async () => {
    if (selectedSystems.length === 0) {
      toast.error("Please select at least one system to update");
      return;
    }

    if (!bulkUpdateLocation.building || !bulkUpdateLocation.floor || !bulkUpdateLocation.labNumber) {
      toast.error("Please fill in all location fields");
      return;
    }

    const buildingName = buildings.find(b => b._id === bulkUpdateLocation.building)?.name;
    if (!buildingName) {
      toast.error("Invalid building selected");
      return;
    }

    setIsBulkUpdating(true);
    try {
      const result = await bulkUpdateInventoryLocation(
        selectedSystems,
        buildingName,
        bulkUpdateLocation.floor,
        bulkUpdateLocation.labNumber
      );

      if (result.success) {
        toast.success(result.message);
        setSelectedSystems([]);
        setShowBulkUpdateModal(false);
        setBulkUpdateLocation({ building: '', floor: '', labNumber: '' });
        // Refresh the inventory data
        await fetchInventorySystems();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Failed to update locations: " + error.message);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Calculate total subsystems
  const totalSubsystems = allSystems.reduce((sum, sys) => sum + (Array.isArray(sys.components) ? sys.components.length : 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      
      <div className="relative z-10 max-w-7xl mx-auto py-12 px-4">

        {/* Main Content: Inventory List or Add System Form */}
        {!showAddSystemForm ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-100 via-indigo-100 to-blue-200 text-indigo-900 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-indigo-900 flex items-center gap-3">
                  <Building2 className="h-7 w-7" />
                  Inventory Systems
                </h2>
                <div className="flex gap-2">
                  <span className="inline-block bg-indigo-100 text-indigo-700 font-semibold px-4 py-2 rounded-lg">
                    Total: {allSystems.length} | Subsystems: {totalSubsystems}
                  </span>
                  {selectedSystems.length > 0 && (
                    <span className="inline-block bg-green-100 text-green-700 font-semibold px-4 py-2 rounded-lg">
                      Selected: {selectedSystems.length}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAllSystems}
                    className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 font-medium shadow"
                  >
                    {selectedSystems.length === currentSystems.filter(Boolean).length && currentSystems.filter(Boolean).length > 0 ? 'Deselect Page' : 'Select Page'}
                  </button>
                  <button
                    onClick={handleSelectAllSystemsAcrossPages}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium shadow"
                  >
                    {selectedSystems.length === filteredSystems.length && filteredSystems.length > 0 ? 'Deselect All' : 'Select All'}
                  </button>
                  {selectedSystems.length > 0 && (
                    <>
                      <button
                        onClick={() => setShowBulkUpdateModal(true)}
                        className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium shadow"
                      >
                        <Settings className="h-5 w-5 inline-block mr-1" />
                        Update Location ({selectedSystems.length})
                      </button>
                      <button
                        onClick={() => setShowBulkDeleteModal(true)}
                        className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:from-red-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium shadow"
                        disabled={isBulkDeleting}
                      >
                        <Trash2 className="h-5 w-5 inline-block mr-1" />
                        Delete ({selectedSystems.length})
                      </button>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setShowAddSystemForm(true)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium shadow"
                >
                  <Plus className="h-5 w-5 inline-block mr-1" /> Add New System
                </button>
              </div>
            </div>
            <div className="p-6">
              {/* Inventory Search and Filters */}
              <div className="flex flex-wrap gap-4 mb-4 items-end justify-between">
                <div className="flex flex-col gap-2 min-w-[220px]">
                  <label className="text-xs font-semibold text-gray-700 mb-0">Search Inventory</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by tag, name, model, or owner email..."
                    className="border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition w-full bg-white/80 shadow-sm"
                  />
                </div>
                {/* Existing filters below */}
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex flex-col gap-2 min-w-[180px]">
                    <label className="text-xs font-semibold text-gray-700 mb-0">Filter by Building</label>
                    <select
                      value={filterBuilding}
                      onChange={e => {
                        setFilterBuilding(e.target.value);
                        setFilterFloor('');
                        setFilterLab('');
                      }}
                      className="border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition w-full bg-white/80 shadow-sm"
                    >
                      <option value="">All Buildings</option>
                      {buildings.map(b => (
                        <option key={b._id} value={b._id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2 min-w-[120px]">
                    <label className="text-xs font-semibold text-gray-700 mb-0">Filter by Floor</label>
                    <select
                      value={filterFloor}
                      onChange={e => {
                        setFilterFloor(e.target.value);
                        setFilterLab('');
                      }}
                      className="border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition w-full bg-white/80 shadow-sm"
                      disabled={!filterBuilding}
                    >
                      <option value="">All Floors</option>
                      {filterBuilding && (() => {
                        if (networkLocations.length > 0) {
                          // For network engineer
                          const floorsSet = new Set();
                          networkLocations.forEach(loc => {
                            if (loc.building._id === filterBuilding) {
                              floorsSet.add(loc.floor.toString());
                            }
                          });
                          return Array.from(floorsSet).map(floor => (
                            <option key={floor} value={floor}>Floor {floor}</option>
                          ));
                        } else {
                          // For regular users
                          const selectedBuilding = buildings.find(b => b._id === filterBuilding);
                          return selectedBuilding?.floors?.map(f => (
                            <option key={f.floor} value={f.floor}>Floor {f.floor}</option>
                          )) || [];
                        }
                      })()}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2 min-w-[120px]">
                    <label className="text-xs font-semibold text-gray-700 mb-0">Filter by Lab</label>
                    <select
                      value={filterLab}
                      onChange={e => setFilterLab(e.target.value)}
                      className="border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition w-full bg-white/80 shadow-sm"
                      disabled={!filterBuilding || !filterFloor}
                    >
                      <option value="">All Labs</option>
                      {filterBuilding && filterFloor && (() => {
                        if (networkLocations.length > 0) {
                          // For network engineer
                          const labsSet = new Set();
                          networkLocations.forEach(loc => {
                            if (
                              loc.building._id === filterBuilding &&
                              loc.floor.toString() === filterFloor
                            ) {
                              (loc.labs || []).forEach(lab => labsSet.add(lab));
                            }
                          });
                          return Array.from(labsSet).map(lab => (
                            <option key={lab} value={lab}>{lab}</option>
                          ));
                        } else {
                          // For regular users
                          const building = buildings.find(b => b._id === filterBuilding);
                          const floorObj = building?.floors?.find(f => f.floor.toString() === filterFloor);
                          return (floorObj?.labs || []).map(lab => (
                            <option key={lab} value={lab}>{lab}</option>
                          ));
                        }
                      })()}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2 min-w-[100px]">
                    <label className="invisible">Reset</label>
                    <button
                      type="button"
                      onClick={() => { setFilterBuilding(''); setFilterFloor(''); setFilterLab(''); }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 bg-white/80 text-gray-600 hover:bg-gray-100 transition text-xs font-semibold shadow-sm"
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 bg-indigo-500 text-white rounded-lg font-semibold shadow hover:bg-indigo-600 transition"
                  onClick={() => {
                    if (expandAll) {
                      setExpandAll(false);
                      setExpandedSystemIndex(null);
                    } else {
                      setExpandAll(true);
                      setExpandedSystemIndex(null);
                    }
                  }}
                >
                  {expandAll ? 'Hide All Components' : 'Show All Components'}
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl shadow-lg border border-gray-200 bg-white">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-blue-100 via-indigo-100 to-blue-200 sticky top-0 z-10">
                    <tr>
                                              <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            checked={selectedSystems.length === currentSystems.filter(Boolean).length && currentSystems.filter(Boolean).length > 0}
                            onChange={handleSelectAllSystems}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Tag</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">System Name</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Building</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Floor</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Lab</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Components</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Added By</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Created At</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Last Edited</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Edited By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {allSystems.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="text-center py-8 text-gray-400">
                          No systems found.
                        </td>
                      </tr>
                    ) : (
                      currentSystems.filter(Boolean).map((system, index) => {
                        const isExpanded = expandAll || expandedSystemIndex === index;
                        return [
                          (
                            <tr
                              key={system._id || index}
                              className={`hover:bg-indigo-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${selectedSystems.includes(system._id) ? 'ring-2 ring-indigo-200 bg-indigo-50' : ''}`}
                            >
                              <td className="px-4 py-2">
                                <input
                                  type="checkbox"
                                  checked={selectedSystems.includes(system._id)}
                                  onChange={() => handleSystemSelection(system._id)}
                                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                              </td>
                              <td className="px-4 py-2 cursor-pointer text-sm" onClick={() => navigate(`/dept/inventory/${system._id}`)}>{system.tag}</td>
                              <td className="px-4 py-2 font-medium text-gray-900 cursor-pointer text-sm" onClick={() => navigate(`/dept/inventory/${system._id}`)}>{system.systemName}</td>
                              <td className="px-4 py-2 cursor-pointer text-sm" onClick={() => navigate(`/dept/inventory/${system._id}`)}>{system.buildingName || system.building?.name || ''}</td>
                              <td className="px-4 py-2 cursor-pointer text-sm" onClick={() => navigate(`/dept/inventory/${system._id}`)}>{system.floor}</td>
                              <td className="px-4 py-2 cursor-pointer text-sm" onClick={() => navigate(`/dept/inventory/${system._id}`)}>{system.labNumber}</td>
                              <td className="px-4 py-2 text-center">
                                <button
                                  type="button"
                                  className="text-indigo-600 hover:underline text-xs font-semibold"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setExpandedSystemIndex(expandedSystemIndex === index ? null : index);
                                  }}
                                >
                                  {isExpanded ? 'Hide' : 'View'}
                                </button>
                              </td>
                              <td className="px-4 py-2 text-xs cursor-pointer" onClick={() => navigate(`/dept/inventory/${system._id}`)}>{system.addedBy?.name || '-'}</td>
                              <td className="px-4 py-2 text-xs cursor-pointer" onClick={() => navigate(`/dept/inventory/${system._id}`)}>{system.createdAt ? new Date(system.createdAt).toLocaleString() : '-'}</td>
                              <td className="px-4 py-2 text-xs cursor-pointer" onClick={() => navigate(`/dept/inventory/${system._id}`)}>{system.updatedAt ? new Date(system.updatedAt).toLocaleString() : '-'}</td>
                              <td className="px-4 py-2 text-xs cursor-pointer" onClick={() => navigate(`/dept/inventory/${system._id}`)}>{system.updatedBy?.name || system.addedBy?.name || '-'}</td>
                            </tr>
                          ),
                          isExpanded && (
                            <tr key={`expanded-${system._id || index}`}>
                              <td colSpan={11} className="bg-indigo-50 px-4 py-2">
                                <div>
                                  <strong>Components:</strong>
                                  {Array.isArray(system.components) && system.components.length > 0 ? (
                                    <ul className="list-disc ml-6 mt-2">
                                      {system.components.map((comp, i) => (
                                        <li key={i} className="mb-1">
                                          <span className="font-semibold">{comp.componentType}</span> — Tag: {comp.tag} {comp.modelNumber && (<span>({comp.manufacturer} {comp.modelNumber})</span>)}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <span className="ml-2 text-gray-500">No components</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        ];
                      }).flat()
                    )}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded bg-indigo-100 text-indigo-700 font-semibold disabled:opacity-50"
                  >
                    Prev
                  </button>
                  {[...Array(totalPages)].map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPage(idx + 1)}
                      className={`px-3 py-1 rounded ${currentPage === idx + 1 ? 'bg-indigo-500 text-white' : 'bg-indigo-50 text-indigo-700'}`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded bg-indigo-100 text-indigo-700 font-semibold disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-100 via-indigo-100 to-blue-200 text-indigo-900 p-8 flex items-center justify-between shadow-sm">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <div className="w-10 h-10 bg-blue bg-opacity-20 rounded-xl flex items-center justify-center">
                  <Building2 className="h-6 w-6" />
                </div>
                Add New System
              </h2>
              <button
                onClick={() => setShowAddSystemForm(false)}
                className="px-4 py-2 bg-gradient-to-r from-gray-400 to-gray-600 text-white rounded-lg hover:from-gray-500 hover:to-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 font-medium shadow"
              >
                Back to Inventory
              </button>
            </div>
            <div className="p-8">
              {/* Update the form to use a single column layout for all fields */}
              <form onSubmit={handleAddSystem} className="space-y-6 w-full text-left">
                {/* Building */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-500" />
                    Building *
                  </label>
                  <select
                    value={inventory.building}
                    onChange={(e) => handleInventoryChange("building", e.target.value)}
                    required
                    className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                  >
                    <option value="">Select Building</option>
                    {buildings.map((building) => (
                      <option key={building._id} value={building._id}>
                        {building.name}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Floor */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Hash className="h-4 w-4 text-gray-500" />
                    Floor *
                  </label>
                  <select
                    value={inventory.floor}
                    onChange={(e) => handleInventoryChange("floor", e.target.value)}
                    required
                    disabled={!inventory.building}
                    className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 hover:border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Select Floor</option>
                    {floors.map((floor) => (
                      <option key={floor} value={floor}>
                        Floor {floor}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Lab */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Hash className="h-4 w-4 text-gray-500" />
                    Lab *
                  </label>
                  <select
                    value={inventory.labNumber}
                    onChange={(e) => handleInventoryChange("labNumber", e.target.value)}
                    required
                    disabled={!inventory.floor}
                    className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 hover:border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Select Lab</option>
                    {labs.map((lab) => (
                      <option key={lab} value={lab}>
                        {lab}
                      </option>
                    ))}
                  </select>
                </div>
                {/* System Tag */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">System Tag *</label>
                  <input
                    type="text"
                    value={inventory.tag}
                    onChange={(e) => handleInventoryChange("tag", e.target.value)}
                    placeholder="SYS-001"
                    required
                    className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                  />
                </div>
                {/* System Name */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">System Name *</label>
                  <input
                    type="text"
                    value={inventory.systemName}
                    onChange={(e) => handleInventoryChange("systemName", e.target.value)}
                    placeholder="Lab PC 1"
                    required
                    className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                  />
                </div>
                {/* System Type */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">System Type</label>
                  <select
                    value={inventory.systemType}
                    onChange={(e) => handleInventoryChange("systemType", e.target.value)}
                    className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                  >
                    <option value="">Select System Type</option>
                    {componentSets.map(set => (
                      <option key={set.name} value={set.name}>{set.name}</option>
                    ))}
                  </select>
                </div>
                {/* Model No. */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Model No.</label>
                  <input
                    type="text"
                    value={inventory.modelNo}
                    onChange={(e) => handleInventoryChange("modelNo", e.target.value)}
                    placeholder="e.g., HP-1234"
                    className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                  />
                </div>
                {/* Manufacturer */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Manufacturer</label>
                  <input
                    type="text"
                    value={inventory.manufacturer}
                    onChange={(e) => handleInventoryChange("manufacturer", e.target.value)}
                    placeholder="e.g., HP, Dell, Lenovo"
                    className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                  />
                </div>
                {/* Designations */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Designations</label>
                  <input
                    type="text"
                    value={inventory.designations}
                    onChange={(e) => handleInventoryChange("designations", e.target.value)}
                    placeholder="e.g., Lab Incharge, Student"
                    className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                  />
                </div>
                {/* Owner Email */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                    Owner
                  </label>
                  <input
                    type="text"
                    value={inventory.ownerEmail}
                    onChange={(e) => handleInventoryChange("ownerEmail", e.target.value)}
                    className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                  />
                </div>
                {/* IP Address */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">IP Address</label>
                  <input
                    type="text"
                    value={inventory.ipAddress}
                    onChange={(e) => handleInventoryChange("ipAddress", e.target.value)}
                    placeholder="192.168.1.100"
                    className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                  />
                </div>
                {/* MAC Address */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">MAC Address</label>
                  <input
                    type="text"
                    value={inventory.macAddress}
                    onChange={(e) => handleInventoryChange("macAddress", e.target.value)}
                    placeholder="00:1B:44:11:3A:B7"
                    className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                  />
                </div>
                {/* USB Status */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Usb className="h-4 w-4 text-gray-500" />
                    USB Status
                  </label>
                  <select
                    value={inventory.usbStatus}
                    onChange={(e) => handleInventoryChange("usbStatus", e.target.value)}
                    className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                  >
                    <option value="">Select USB Status</option>
                    {usbOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Antivirus */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-gray-500" />
                    Antivirus Installed
                  </label>
                  <select
                    value={inventory.hasAntivirus}
                    onChange={(e) => handleInventoryChange("hasAntivirus", e.target.value)}
                    className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                  >
                    <option value="">Select Antivirus Status</option>
                    {yesNoOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Desktop Policy */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Desktop Policy</label>
                  <select
                    value={inventory.desktopPolicy}
                    onChange={(e) => handleInventoryChange("desktopPolicy", e.target.value)}
                    className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                  >
                    <option value="">Select Policy Status</option>
                    {yesNoOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Remarks */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Remarks</label>
                  <textarea
                    value={inventory.remark}
                    onChange={(e) => handleInventoryChange("remark", e.target.value)}
                    placeholder="Additional notes or comments about this system..."
                    rows="3"
                    className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 hover:border-gray-300 resize-none"
                  />
                </div>
                {/* System Components Section */}
                <div className="mt-8 w-full">
                  <h3 className="text-lg font-bold text-indigo-700 mb-2">System Components</h3>
                  <div className="space-y-4 w-full">
                    <div className="flex items-center justify-between w-full">
                      <select onChange={e => e.target.value && handleAddComponentSet(e.target.value)} className="px-4 py-2 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-gray-300 w-full max-w-xs" defaultValue="">
                        <option value="">Quick Add Components</option>
                        {componentSets.map((set) => (
                          <option key={set.name} value={set.name}>{set.name}</option>
                        ))}
                      </select>
                    </div>
                    {showBulkAdd && (
                      <div className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg">
                        <div className="p-6 border-b border-green-200">
                          <h3 className="text-xl font-bold flex items-center gap-3 text-green-800">
                            <div className="w-8 h-8 bg-green-200 rounded-xl flex items-center justify-center">
                              <Copy className="h-5 w-5 text-green-600" />
                            </div>
                            Add Multiple Components
                          </h3>
                          <p className="text-sm text-green-700 mt-2">
                            All components will inherit the system's owner, location, and policy settings. You can add new components or modify existing ones.
                          </p>
                        </div>
                        <div className="p-6 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-gray-700">Components</h4>
                            <button type="button" onClick={() => setBulkComponents(prev => [...prev, { componentType: '', tag: '', modelNumber: '', manufacturer: '' }])} className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm flex items-center gap-1">
                              <Plus className="h-4 w-4" /> Add New Component
                            </button>
                          </div>
                          <div className="space-y-4">
                            {bulkComponents.map((comp, index) => (
                              <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 bg-white rounded-xl border border-green-200 shadow-sm hover:shadow-md transition-all duration-200">
                                <div className={`space-y-1 ${showOtherInput[`bulk-${index}`] ? 'md:col-span-2' : ''}`}>
                                  <label className="block text-xs font-semibold text-gray-700">Component Type</label>
                                  {showOtherInput[`bulk-${index}`] ? (
                                    <div className="flex gap-2">
                                      <input type="text" value={otherComponentName} onChange={e => setOtherComponentName(e.target.value)} placeholder="Enter component name" className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                                      <button onClick={() => { if (otherComponentName.trim()) { handleBulkComponentChange(index, "componentType", otherComponentName); setShowOtherInput(prev => ({ ...prev, [`bulk-${index}`]: false })); setOtherComponentName(""); } }} className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium whitespace-nowrap">Save</button>
                                    </div>
                                  ) : (
                                    <select value={comp.componentType} onChange={e => { if (e.target.value === "Other") { setShowOtherInput(prev => ({ ...prev, [`bulk-${index}`]: true })); setOtherComponentName(""); } else { handleBulkComponentChange(index, "componentType", e.target.value); } }} className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200">
                                      <option value="">Select Type</option>
                                      {componentTypes.map((type) => (<option key={type} value={type}>{type}</option>))}
                                      {isCustomComponentType(comp.componentType) && (<option value={comp.componentType}>{comp.componentType}</option>)}
                                      <option value="Other">Other</option>
                                    </select>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <label className="block text-xs font-semibold text-gray-700">Tag Number *</label>
                                  <input type="text" value={comp.tag} onChange={e => handleBulkComponentChange(index, "tag", e.target.value)} placeholder="e.g., CPU-001" required className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200" />
                                </div>
                                <div className="space-y-1">
                                  <label className="block text-xs font-semibold text-gray-700">Model</label>
                                  <input type="text" value={comp.modelNumber} onChange={e => handleBulkComponentChange(index, "modelNumber", e.target.value)} placeholder="Model" className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200" />
                                </div>
                                <div className="space-y-1">
                                  <label className="block text-xs font-semibold text-gray-700">Manufacturer</label>
                                  <input type="text" value={comp.manufacturer} onChange={e => handleBulkComponentChange(index, "manufacturer", e.target.value)} placeholder="Brand" className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200" />
                                </div>
                                <div className="flex items-end">
                                  {bulkComponents.length > 1 && (
                                    <button type="button" onClick={() => setBulkComponents(prev => prev.filter((_, i) => i !== index))} className="px-2 py-2 text-red-500 hover:text-red-700" title="Remove Component">
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-3">
                            <button type="button" onClick={handleAddBulkComponents} className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200 font-medium shadow-lg">Add All Components</button>
                            <button type="button" onClick={() => setShowBulkAdd(false)} className="px-6 py-3 border-2 border-gray-300 rounded-xl bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200 font-medium">Cancel</button>
                          </div>
                        </div>
                      </div>
                    )}
                    {inventory.components && inventory.components.length > 0 && (
                      <div className="space-y-4 w-full">
                        <h4 className="font-semibold text-gray-700 flex items-center gap-2"><Package className="h-5 w-5 text-indigo-600" />Added Components ({inventory.components.length})</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                          {inventory.components.map((comp, index) => (
                            <div key={index} className="bg-white border-l-4 border-l-indigo-500 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 group w-full">
                              <div className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                                      <Package className="h-5 w-5 text-indigo-600" />
                                    </div>
                                    <div>
                                      <p className="font-semibold text-gray-800">{comp.componentType}</p>
                                      <p className="text-sm text-gray-500">Tag: {comp.tag}</p>
                                      {comp.modelNumber && (<p className="text-xs text-gray-400">{comp.manufacturer} {comp.modelNumber}</p>)}
                                    </div>
                                  </div>
                                  <button type="button" onClick={() => removeComponent(index)} className="w-8 h-8 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 hover:text-red-700 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {errorMsg && (
                      <div className="mt-4 text-red-600 flex items-center gap-2 w-full"><AlertCircle className="h-5 w-5" />{errorMsg}</div>
                    )}
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white font-bold text-lg rounded-2xl hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:-translate-y-1"
                >
                  🚀 Add System to Inventory
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Bulk Update Location Modal */}
        {showBulkUpdateModal && (
          <div className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
              <div className="bg-gradient-to-r from-green-100 via-emerald-100 to-green-200 text-green-900 p-6 rounded-t-2xl">
                <h3 className="text-xl font-bold flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-200 rounded-xl flex items-center justify-center">
                    <Settings className="h-5 w-5 text-green-600" />
                  </div>
                  Bulk Update Location
                </h3>
                <p className="text-sm text-green-700 mt-2">
                  Update location for {selectedSystems.length} selected system(s)
                </p>
              </div>
              <div className="p-6 space-y-4">
                {/* Building */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-500" />
                    Building *
                  </label>
                  <select
                    value={bulkUpdateLocation.building}
                    onChange={(e) => {
                      console.log('Building selected:', e.target.value);
                      console.log('Available buildings:', buildings);
                      handleBulkUpdateLocationChange("building", e.target.value);
                    }}
                    required
                    className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 hover:border-gray-300"
                  >
                    <option value="">Select Building</option>
                    {buildings.length > 0 ? (
                      buildings.map((building) => (
                        <option key={building._id} value={building._id}>
                          {building.name}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No buildings available</option>
                    )}
                  </select>
                </div>

                {/* Floor */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Hash className="h-4 w-4 text-gray-500" />
                    Floor *
                  </label>
                  <select
                    value={bulkUpdateLocation.floor}
                    onChange={(e) => {
                      console.log('Floor selected:', e.target.value);
                      console.log('Available floors:', bulkUpdateFloors);
                      console.log('Current building:', bulkUpdateLocation.building);
                      handleBulkUpdateLocationChange("floor", e.target.value);
                    }}
                    required
                    disabled={!bulkUpdateLocation.building}
                    className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 hover:border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Select Floor</option>
                    {bulkUpdateFloors.length > 0 ? (
                      bulkUpdateFloors.map((floor) => (
                        <option key={floor} value={floor}>
                          Floor {floor}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No floors available</option>
                    )}
                  </select>
                </div>

                {/* Lab */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Hash className="h-4 w-4 text-gray-500" />
                    Lab *
                  </label>
                  <select
                    value={bulkUpdateLocation.labNumber}
                    onChange={(e) => handleBulkUpdateLocationChange("labNumber", e.target.value)}
                    required
                    disabled={!bulkUpdateLocation.floor}
                    className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 hover:border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Select Lab</option>
                    {bulkUpdateLabs.map((lab) => (
                      <option key={lab} value={lab}>
                        {lab}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleBulkUpdateLocation}
                    disabled={isBulkUpdating}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200 font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isBulkUpdating ? 'Updating...' : 'Update Location'}
                  </button>
                  <button
                    onClick={() => {
                      setShowBulkUpdateModal(false);
                      setBulkUpdateLocation({ building: '', floor: '', labNumber: '' });
                    }}
                    disabled={isBulkUpdating}
                    className="px-6 py-3 border-2 border-gray-300 rounded-xl bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Delete Modal */}
        {showBulkDeleteModal && (
          <div className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
              <div className="bg-gradient-to-r from-red-100 via-pink-100 to-red-200 text-red-900 p-6 rounded-t-2xl">
                <h3 className="text-xl font-bold flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-200 rounded-xl flex items-center justify-center">
                    <Trash2 className="h-5 w-5 text-red-600" />
                  </div>
                  Confirm Delete
                </h3>
                <p className="text-sm text-red-700 mt-2">
                  Are you sure you want to delete {selectedSystems.length} selected system(s)? This action cannot be undone.
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={async () => {
                      setIsBulkDeleting(true);
                      try {
                        const result = await bulkDeleteInventorySystems(selectedSystems);
                        if (result.success) {
                          toast.success(result.message);
                          setSelectedSystems([]);
                          setShowBulkDeleteModal(false);
                          await fetchInventorySystems();
                        } else {
                          toast.error(result.message);
                        }
                      } catch (error) {
                        toast.error("Failed to delete systems: " + error.message);
                      } finally {
                        setIsBulkDeleting(false);
                      }
                    }}
                    disabled={isBulkDeleting}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-200 font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isBulkDeleting ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                  <button
                    onClick={() => setShowBulkDeleteModal(false)}
                    disabled={isBulkDeleting}
                    className="px-6 py-3 border-2 border-gray-300 rounded-xl bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default InventoryManagement
