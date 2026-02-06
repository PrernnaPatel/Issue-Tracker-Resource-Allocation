import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Info, AlertCircle } from 'lucide-react';
import { useDeptAuth } from '../../context/DeptAuthContext';
import { updateInventorySystem, getLoggedInDepartmentalAdmin, getAllComponentSets } from '../../service/deptAuthService';
import InventorySystemForm from '../../components/InventorySystemForm';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/dept-admin';

const InventoryDetail = () => {
  const { id } = useParams();
  const [system, setSystem] = useState(null);
  const [loading, setLoading] = useState(true);
  const { token } = useDeptAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [labs, setLabs] = useState([]);
  const [systemTypes, setSystemTypes] = useState([]);
  const [componentTypes, setComponentTypes] = useState([]);
  const [componentSets, setComponentSets] = useState([]);
  const [networkLocations, setNetworkLocations] = useState([]);

  useEffect(() => {
    const fetchSystem = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/get-inventory?id=${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await res.json();
        console.log(data)
        if (!res.ok || !data.system) {
          toast.error(data.message || "System not found");
          setLoading(false);
          return;
        }
        setSystem(data.system);
      } catch (e) {
        toast.error("Failed to fetch system details",e);
      } finally {
        setLoading(false);
      }
    };
    fetchSystem();
  }, [id, token]);

  // Helper to fetch all buildings for Admin IT
  const fetchAllBuildings = async (token) => {
    try {
      const res = await fetch(`${API_URL}/all-buildings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.buildings)) {
        return data.buildings;
      }
      return [];
    } catch {
      return [];
    }
  };

  useEffect(() => {
    const fetchData = async () => {
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
          } else if (userData.role === 'Admin IT') {
            setNetworkLocations([]);
            // Fetch all buildings for Admin IT
            const allBuildings = await fetchAllBuildings(token);
            setBuildings(allBuildings);
            extractedBuildings = allBuildings;
          } else if (Array.isArray(userData.buildings)) {
            setNetworkLocations([]);
            extractedBuildings = userData.buildings;
            setBuildings(extractedBuildings);
          } else if (userData.building) {
            setNetworkLocations([]);
            extractedBuildings = [userData.building];
            setBuildings(extractedBuildings);
          }
        } else {
          setBuildings([]);
          setNetworkLocations([]);
        }
        const setsRes = await getAllComponentSets();
        const sets = Array.isArray(setsRes) ? setsRes : setsRes?.sets || [];
        setComponentSets(sets);
        const sysTypes = new Set();
        const compTypes = new Set();
        sets.forEach(set => {
          if (set.systemType) sysTypes.add(set.systemType);
          (set.components || []).forEach(comp => {
            if (comp.componentType) compTypes.add(comp.componentType);
          });
        });
        setSystemTypes(Array.from(sysTypes));
        setComponentTypes(Array.from(compTypes));
      } catch {
        setBuildings([]);
        setNetworkLocations([]);
        setSystemTypes([]);
        setComponentTypes([]);
        setComponentSets([]);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (system && system.building) {
      if (networkLocations.length > 0) {
        const floorsSet = new Set();
        networkLocations.forEach(loc => {
          if (loc.building._id === (system.building._id || system.building)) {
            floorsSet.add(loc.floor.toString());
          }
        });
        setFloors(Array.from(floorsSet));
      } else {
        const selectedBuilding = buildings.find(b => b._id === (system.building._id || system.building));
        if (selectedBuilding && selectedBuilding.floors) {
          const availableFloors = selectedBuilding.floors.map(f => f.floor.toString());
          setFloors(availableFloors);
        }
      }
    } else {
      setFloors([]);
    }
  }, [system && system.building, buildings, networkLocations]);

  useEffect(() => {
    if (system && system.building && system.floor) {
      if (networkLocations.length > 0) {
        const labsSet = new Set();
        networkLocations.forEach(loc => {
          if (
            loc.building._id === (system.building._id || system.building) &&
            loc.floor.toString() === system.floor
          ) {
            (loc.labs || []).forEach(lab => labsSet.add(lab));
          }
        });
        setLabs(Array.from(labsSet));
      } else {
        const selectedBuilding = buildings.find(b => b._id === (system.building._id || system.building));
        if (selectedBuilding && selectedBuilding.floors) {
          const selectedFloor = selectedBuilding.floors.find(f => f.floor.toString() === system.floor);
          if (selectedFloor && selectedFloor.labs) {
            setLabs(selectedFloor.labs);
          }
        }
      }
    } else {
      setLabs([]);
    }
  }, [system && system.building, system && system.floor, networkLocations, buildings]);

  if (loading) {
    return <div className="p-8 text-center text-lg">Loading system details...</div>;
  }
  if (!system) return null;

  return (
    <div className="max-w-4xl mx-auto mt-10 bg-white rounded-2xl shadow-2xl border border-indigo-100 p-8 md:p-12 lg:p-16">
      <div className="flex items-center gap-2 mb-6 justify-between">
        <div className="flex items-center gap-2">
          <Info className="h-6 w-6 text-indigo-700" />
          <h1 className="text-2xl font-bold text-indigo-800">System Details</h1>
        </div>
        <button
          onClick={() => {
            setIsEditing(true);
          }}
          className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 font-semibold"
        >
          Edit
        </button>
      </div>
      {!isEditing ? (
        <div className="space-y-2">
          <div><span className="font-semibold">Name:</span> {system.systemName}</div>
          <div><span className="font-semibold">Tag:</span> {system.tag}</div>
          <div><span className="font-semibold">Type:</span> {system.systemType}</div>
          <div><span className="font-semibold">Model No.:</span> {system.modelNo}</div>
          <div><span className="font-semibold">Manufacturer:</span> {system.manufacturer || '-'}</div>
          <div><span className="font-semibold">Designation:</span> {system.designation}</div>
          <div><span className="font-semibold">Building:</span> {system.buildingName || system.building?.name || ''}</div>
          <div><span className="font-semibold">Floor:</span> {system.floor}</div>
          <div><span className="font-semibold">Lab:</span> {system.labNumber}</div>
          <div><span className="font-semibold">Owner Email:</span> {system.owner?.email || system.ownerName || system.ownerEmail || 'Unassigned'}</div>
          <div><span className="font-semibold">IP Address:</span> {system.ipAddress}</div>
          <div><span className="font-semibold">MAC Address:</span> {system.macAddress}</div>
          <div><span className="font-semibold">USB Status:</span> {system.usbStatus}</div>
          <div><span className="font-semibold">Antivirus:</span> {system.hasAntivirus}</div>
          <div><span className="font-semibold">Desktop Policy:</span> {system.desktopPolicy}</div>
          <div><span className="font-semibold">Remarks:</span> {system.remark}</div>
          {system.components && system.components.length > 0 && (
            <div>
              <span className="font-semibold">Components:</span>
              <ul className="list-disc ml-6">
                {system.components.map((comp, idx) => (
                  <li key={idx} className="text-indigo-700">
                    {comp.componentType} ({comp.tag})
                    <div className="ml-6 mt-2 mb-4 p-4 bg-indigo-50 border-l-4 border-indigo-200 rounded-xl text-sm text-gray-700">
                      {comp.modelNumber && <div><b>Model:</b> {comp.modelNumber}</div>}
                      {comp.manufacturer && <div><b>Manufacturer:</b> {comp.manufacturer}</div>}
                      {comp.remark && <div><b>Remark:</b> {comp.remark}</div>}
                      {/* Add more fields as needed */}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <InventorySystemForm
          initialData={system}
          onSubmit={async (formData, ownerEmailInput) => {
            try {
              const payload = { ...formData };
              delete payload.owner;
              delete payload.ownerEmail;
              if (ownerEmailInput && ownerEmailInput.trim() !== '') {
                payload.owner = ownerEmailInput.trim();
              } else {
                payload.owner = null;
              }
              const buildingObj = buildings.find(b => b._id === payload.building);
              delete payload.building;
              payload.building = buildingObj ? buildingObj.name : '';
              const updatedSystem = await updateInventorySystem(system._id, payload);
              setSystem(updatedSystem || payload);
              setIsEditing(false);
              toast.success('System updated successfully!');
            } catch (err) {
              toast.error(err.message || 'Failed to update system');
            }
          }}
          onCancel={() => setIsEditing(false)}
          buildings={buildings}
          floors={floors}
          labs={labs}
          systemTypes={systemTypes}
          componentTypes={componentTypes}
          componentSets={componentSets}
          networkLocations={networkLocations}
          mode="edit"
        />
      )}
    </div>
  );
};

export default InventoryDetail; 