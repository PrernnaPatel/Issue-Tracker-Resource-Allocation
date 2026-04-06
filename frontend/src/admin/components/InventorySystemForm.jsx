import React, { useState, useEffect } from 'react';
import { AlertCircle, Copy, Plus, Trash2, Package, Usb, Shield, Mail, Hash, Building2 } from 'lucide-react';
import { getLoggedInDepartmentalAdmin, getAllBuildingsForAdminIT } from '../service/deptAuthService';

const usbOptions = ["Enabled", "Disabled"];
const yesNoOptions = ["Yes", "No"];

const InventorySystemForm = ({
  initialData = {},
  onSubmit,
  onCancel,
  componentTypes = [],
  componentSets = [],
  mode = 'add',
}) => {
  const [form, setForm] = useState({});
  const [ownerEmailInput, setOwnerEmailInput] = useState(
    initialData.owner?.email || initialData.ownerName || ''
  );
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkComponents, setBulkComponents] = useState([]);
  const [showOtherInput, setShowOtherInput] = useState({});
  const [otherComponentName, setOtherComponentName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [availableFloors, setAvailableFloors] = useState([]);
  const [availableLabs, setAvailableLabs] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [networkLocations, setNetworkLocations] = useState([]);

  useEffect(() => {
    let buildingId = '';
    if (initialData.building && typeof initialData.building === 'object' && initialData.building._id) {
      buildingId = initialData.building._id;
    } else if (typeof initialData.building === 'string' && buildings.length > 0) {
      const found = buildings.find(b => b.name === initialData.building);
      if (found) buildingId = found._id;
      else buildingId = initialData.building;
    }
    setForm({
      ...initialData,
      manufacturer: initialData.manufacturer || '',
      building: buildingId,
      floor: initialData.floor ? String(initialData.floor) : '',
      labNumber: initialData.labNumber ? String(initialData.labNumber) : '',
      designation: initialData.designation || initialData.designations || '',
    });
    setOwnerEmailInput(initialData.owner?.email || initialData.ownerName || '');
  }, [initialData, buildings]);

  useEffect(() => {
    const fetchUserAndBuildings = async () => {
      try {
        const userRes = await getLoggedInDepartmentalAdmin();
        if (userRes.success && userRes.data) {
          const userData = userRes.data.admin || userRes.data;
          let extractedBuildings = [];
          if (userData.isNetworkEngineer && Array.isArray(userData.locations)) {
            setNetworkLocations(userData.locations);
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
          } else if (userData.department && userData.department.name === 'Admin IT') {
            setNetworkLocations([]);
            const allBuildings = await getAllBuildingsForAdminIT();
            setBuildings(allBuildings);
            extractedBuildings = allBuildings;
          } else {
            setNetworkLocations([]);
            if (Array.isArray(userData.buildings)) {
              extractedBuildings = userData.buildings;
              setBuildings(extractedBuildings);
            } else if (userData.building) {
              extractedBuildings = [userData.building];
              setBuildings(extractedBuildings);
            }
          }
          setForm(prev => {
            if (!prev.building && extractedBuildings.length === 1) {
              return { ...prev, building: extractedBuildings[0]._id };
            }
            return prev;
          });
        } else {
          setBuildings([]);
          setNetworkLocations([]);
        }
      } catch (error) {
        setBuildings([]);
        setNetworkLocations([]);
        setErrorMsg("Failed to load building data: " + error.message);
      }
    };
    fetchUserAndBuildings();
  }, [initialData]);

  useEffect(() => {
    if (form.building) {
      if (networkLocations && networkLocations.length > 0) {
        const floorsSet = new Set();
        networkLocations.forEach(loc => {
          if (loc.building._id === form.building) {
            floorsSet.add(loc.floor.toString());
          }
        });
        setAvailableFloors(Array.from(floorsSet));
      } else {
        const selectedBuilding = buildings.find(b => b._id === form.building);
        if (selectedBuilding && selectedBuilding.floors) {
          const available = selectedBuilding.floors.map(f => f.floor.toString());
          setAvailableFloors(available);
        } else {
          setAvailableFloors([]);
        }
      }
      setForm(prev => ({ ...prev, floor: '', labNumber: '' }));
      setAvailableLabs([]);
    } else {
      setAvailableFloors([]);
      setAvailableLabs([]);
    }
  }, [form.building, buildings, networkLocations]);

  useEffect(() => {
    if (form.building && form.floor) {
      if (networkLocations && networkLocations.length > 0) {
        const labsSet = new Set();
        networkLocations.forEach(loc => {
          if (
            loc.building._id === form.building &&
            loc.floor.toString() === form.floor
          ) {
            (loc.labs || []).forEach(lab => labsSet.add(lab));
          }
        });
        setAvailableLabs(Array.from(labsSet));
      } else {
        const selectedBuilding = buildings.find(b => b._id === form.building);
        if (selectedBuilding && selectedBuilding.floors) {
          const selectedFloor = selectedBuilding.floors.find(f => f.floor.toString() === form.floor);
          if (selectedFloor && selectedFloor.labs) {
            setAvailableLabs(selectedFloor.labs);
          } else {
            setAvailableLabs([]);
          }
        } else {
          setAvailableLabs([]);
        }
      }
      setForm(prev => ({ ...prev, labNumber: '' }));
    } else {
      setAvailableLabs([]);
    }
  }, [form.building, form.floor, buildings, networkLocations]);

  useEffect(() => {
    if (
      form.building &&
      availableFloors.length > 0 &&
      !form.floor &&
      initialData.floor
    ) {
      setForm(prev => ({
        ...prev,
        floor: String(initialData.floor)
      }));
    }
  }, [availableFloors, form.building, form.floor, initialData.floor]);

  useEffect(() => {
    if (
      form.building &&
      form.floor &&
      availableLabs.length > 0 &&
      !form.labNumber &&
      initialData.labNumber
    ) {
      setForm(prev => ({
        ...prev,
        labNumber: String(initialData.labNumber)
      }));
    }
  }, [availableLabs, form.building, form.floor, form.labNumber, initialData.labNumber]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAddComponentSet = (setName) => {
    const componentSet = componentSets.find(set => set.name === setName);
    setBulkComponents(componentSet.components.map((comp) => ({ ...comp, tag: "", serialNumber: "", remark: "" })));
    setShowBulkAdd(true);
  };

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
    setForm(prev => ({ ...prev, components: [...(prev.components || []), ...validComponents] }));
    setBulkComponents([]);
    setShowBulkAdd(false);
  };

  const removeComponent = (index) => {
    if (window.confirm('Are you sure you want to delete this component?')) {
      setForm(prev => ({ ...prev, components: prev.components.filter((_, i) => i !== index) }));
    }
  };

  const isCustomComponentType = (componentType) => {
    return componentType && !componentTypes.includes(componentType);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form, ownerEmailInput);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-gradient-to-br from-indigo-50 to-cyan-50 p-8 rounded-2xl shadow-xl border border-indigo-100">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold mb-1">System Tag *</label>
          <input type="text" className="w-full px-4 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent" value={form.tag || ''} onChange={e => handleChange('tag', e.target.value)} required placeholder="SYS-001" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">System Name *</label>
          <input type="text" className="w-full px-4 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent" value={form.systemName || ''} onChange={e => handleChange('systemName', e.target.value)} required placeholder="Lab PC 1" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">System Type</label>
          <select className="w-full px-4 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent" value={form.systemType || ''} onChange={e => handleChange('systemType', e.target.value)}>
            <option value="">Select System Type</option>
            {componentSets.map(set => (
              <option key={set.name} value={set.name}>{set.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Model No.</label>
          <input type="text" className="w-full px-4 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent" value={form.modelNo || ''} onChange={e => handleChange('modelNo', e.target.value)} placeholder="e.g., HP-1234" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Manufacturer</label>
          <input
            type="text"
            value={form.manufacturer || ''}
            onChange={e => handleChange('manufacturer', e.target.value)}
            placeholder="e.g., HP, Dell, Lenovo"
            className="w-full px-4 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Designation</label>
          <input type="text" className="w-full px-4 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent" value={form.designation || ''} onChange={e => handleChange('designation', e.target.value)} placeholder="e.g., Lab Incharge, Student" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Building *</label>
          <select className="w-full px-4 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent" value={form.building || ''} onChange={e => handleChange('building', e.target.value)} required>
            <option value="">Select Building</option>
            {buildings.map((building) => (
              <option key={building._id} value={building._id}>{building.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Floor *</label>
          <select className="w-full px-4 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent" value={form.floor || ''} onChange={e => handleChange('floor', e.target.value)} required>
            <option value="">Select Floor</option>
            {availableFloors.map((floor) => (
              <option key={floor} value={floor}>Floor {floor}</option>
            ))}
            {form.floor && !availableFloors.includes(form.floor) && (
              <option value={form.floor}>Floor {form.floor}</option>
            )}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Lab *</label>
          <select className="w-full px-4 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent" value={form.labNumber || ''} onChange={e => handleChange('labNumber', e.target.value)} required>
            <option value="">Select Lab</option>
            {availableLabs.map((lab) => (
              <option key={lab} value={lab}>{lab}</option>
            ))}
            {form.labNumber && !availableLabs.includes(form.labNumber) && (
              <option value={form.labNumber}>{form.labNumber}</option>
            )}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Owner</label>
          <input type="text" className="w-full px-4 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" value={ownerEmailInput} onChange={e => setOwnerEmailInput(e.target.value)} placeholder="john.doe@company.com" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">IP Address</label>
          <input type="text" className="w-full px-4 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" value={form.ipAddress || ''} onChange={e => handleChange('ipAddress', e.target.value)} placeholder="192.168.1.100" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">MAC Address</label>
          <input type="text" className="w-full px-4 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" value={form.macAddress || ''} onChange={e => handleChange('macAddress', e.target.value)} placeholder="00:1B:44:11:3A:B7" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">USB Status</label>
          <select className="w-full px-4 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" value={form.usbStatus || ''} onChange={e => handleChange('usbStatus', e.target.value)}>
            <option value="">Select USB Status</option>
            {usbOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Antivirus Installed</label>
          <select className="w-full px-4 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" value={form.hasAntivirus || ''} onChange={e => handleChange('hasAntivirus', e.target.value)}>
            <option value="">Select Antivirus Status</option>
            {yesNoOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Desktop Policy</label>
          <select className="w-full px-4 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" value={form.desktopPolicy || ''} onChange={e => handleChange('desktopPolicy', e.target.value)}>
            <option value="">Select Policy Status</option>
            {yesNoOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold mb-1">Remarks</label>
          <textarea className="w-full px-4 py-2 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" value={form.remark || ''} onChange={e => handleChange('remark', e.target.value)} rows={3} placeholder="Additional notes or comments about this system..." />
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-bold text-indigo-700 mb-2">System Components</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <select onChange={e => e.target.value && handleAddComponentSet(e.target.value)} className="px-4 py-2 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-gray-300" defaultValue="">
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
                          <button type="button" onClick={() => {
                            if (window.confirm('Are you sure you want to delete this component?')) {
                              setBulkComponents(prev => prev.filter((_, i) => i !== index));
                            }
                          }} className="px-2 py-2 text-red-500 hover:text-red-700" title="Remove Component">
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

          {form.components && form.components.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700 flex items-center gap-2"><Package className="h-5 w-5 text-indigo-600" />Added Components ({form.components.length})</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {form.components.map((comp, index) => (
                  <div key={index} className="bg-white border-l-4 border-l-indigo-500 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 group">
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
        </div>
      </div>

      <div className="flex gap-3 justify-end mt-8">
        <button type="submit" className="px-6 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 font-bold shadow">{mode === 'edit' ? 'Save Changes' : 'Add System to Inventory'}</button>
        <button type="button" className="px-6 py-2 bg-gray-300 rounded-xl font-bold" onClick={onCancel}>Cancel</button>
      </div>
      {errorMsg && (
        <div className="mt-4 text-red-600 flex items-center gap-2"><AlertCircle className="h-5 w-5" />{errorMsg}</div>
      )}
    </form>
  );
};

export default InventorySystemForm; 