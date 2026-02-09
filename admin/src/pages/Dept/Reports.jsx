import { useState, useEffect, useRef } from 'react';
import { DownloadCloud, BarChart2, FileText, Loader, X, RefreshCcw, Filter, Calendar, Layers, Check, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { generateDeptTicketReport, exportDeptTicketReportExcel, exportDeptInventoryReportExcel, getLoggedInDepartmentalAdmin, getAllBuildingsForAdminIT, getAllComponentSets } from '../../service/deptAuthService';
import { toast } from 'react-toastify';

const STATUS_OPTIONS = ['pending', 'in_progress', 'resolved', 'revoked'];

const DeptReports = () => {
  // Ticket Report State
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  const [ticketStartDate, setTicketStartDate] = useState('');
  const [ticketEndDate, setTicketEndDate] = useState('');
  const [ticketStatuses, setTicketStatuses] = useState(['all']);
  const [ticketIncludeComments, setTicketIncludeComments] = useState(false);
  const [showTicketStatusDropdown, setShowTicketStatusDropdown] = useState(false);

  // Inventory Report State
  const [isGeneratingInventoryExcel, setIsGeneratingInventoryExcel] = useState(false);
  const [building, setBuilding] = useState([]);
  const [buildingOptions, setBuildingOptions] = useState([]);
  const [floor, setFloor] = useState([]);
  const [floorOptions, setFloorOptions] = useState([]);
  const [labNumber, setLabNumber] = useState([]);
  const [labOptions, setLabOptions] = useState([]);
  const [systemType, setSystemType] = useState([]);
  const [systemTypeOptions, setSystemTypeOptions] = useState([]);
  const [networkLocations, setNetworkLocations] = useState([]);
  const [buildingsData, setBuildingsData] = useState([]);

  // Dropdown open states for inventory filters
  const [showBuildingDropdown, setShowBuildingDropdown] = useState(false);
  const [showFloorDropdown, setShowFloorDropdown] = useState(false);
  const [showLabDropdown, setShowLabDropdown] = useState(false);
  const [showSystemTypeDropdown, setShowSystemTypeDropdown] = useState(false);
  const buildingDropdownRef = useRef(null);
  const floorDropdownRef = useRef(null);
  const labDropdownRef = useRef(null);
  const systemTypeDropdownRef = useRef(null);

  // Responsive
  const ticketStatusDropdownRef = useRef(null);

  // --- Ticket Report Logic ---
  const handleTicketStatusChange = (status) => {
    setTicketStatuses(prev => {
      if (status === 'all') {
        return ['all'];
      } else {
        let newStatuses = prev.filter(s => s !== 'all');
        if (prev.includes(status)) {
          newStatuses = newStatuses.filter(s => s !== status);
        } else {
          newStatuses = [...newStatuses, status];
        }
        return newStatuses.length === 0 ? ['all'] : newStatuses;
      }
    });
  };

  const ticketFilterParams = {
    startDate: ticketStartDate,
    endDate: ticketEndDate,
    status: ticketStatuses,
    includeComments: ticketIncludeComments
  };

  const handleGenerateReport = async () => {
    try {
      setIsGenerating(true);
      const blob = await generateDeptTicketReport(ticketFilterParams);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket_report_${new Date().toLocaleDateString()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Report generated successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateExcel = async () => {
    setIsGeneratingExcel(true);
    try {
      const blob = await exportDeptTicketReportExcel(ticketFilterParams);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket_report_${new Date().toLocaleDateString()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Excel report generated successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to generate Excel report');
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  const resetTicketFilters = () => {
    setTicketStartDate('');
    setTicketEndDate('');
    setTicketStatuses(['all']);
    setTicketIncludeComments(false);
  };

  // --- Inventory Report Logic ---
  const handleGenerateInventoryExcel = async () => {
    setIsGeneratingInventoryExcel(true);
    try {
      const blob = await exportDeptInventoryReportExcel({
        building: building.join(','),
        floor: floor.join(','),
        labNumber: labNumber.join(','),
        systemType: systemType.join(',')
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory_report_${new Date().toLocaleDateString()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Inventory Excel report generated successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to generate Inventory Excel report');
    } finally {
      setIsGeneratingInventoryExcel(false);
    }
  };

  const resetInventoryFilters = () => {
    setBuilding([]);
    setFloor([]);
    setLabNumber([]);
    setSystemType([]);
  };

  // --- Inventory Multi-Select Handlers ---
  const handleMultiSelect = (value, selected, setSelected, options) => {
    if (value === 'all') {
      if (selected.length === options.length) setSelected([]);
      else setSelected(options.map(o => (typeof o === 'string' ? o : o.name || o)));
    } else {
      let newSelected = selected.includes(value)
        ? selected.filter(v => v !== value)
        : [...selected, value];
      // Remove 'all' if present
      newSelected = newSelected.filter(v => v !== 'all');
      setSelected(newSelected);
    }
  };

  // --- Shared/Fetch Logic ---
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setShowTicketStatusDropdown(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ticketStatusDropdownRef.current && !ticketStatusDropdownRef.current.contains(event.target)) {
        setShowTicketStatusDropdown(false);
      }
    }
    if (showTicketStatusDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTicketStatusDropdown]);

  // --- Dropdown Close Handlers ---
  useEffect(() => {
    function handleClickOutside(event) {
      if (buildingDropdownRef.current && !buildingDropdownRef.current.contains(event.target)) setShowBuildingDropdown(false);
      if (floorDropdownRef.current && !floorDropdownRef.current.contains(event.target)) setShowFloorDropdown(false);
      if (labDropdownRef.current && !labDropdownRef.current.contains(event.target)) setShowLabDropdown(false);
      if (systemTypeDropdownRef.current && !systemTypeDropdownRef.current.contains(event.target)) setShowSystemTypeDropdown(false);
    }
    if (showBuildingDropdown || showFloorDropdown || showLabDropdown || showSystemTypeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showBuildingDropdown, showFloorDropdown, showLabDropdown, showSystemTypeDropdown]);

  // Fetch building options for inventory report
  useEffect(() => {
    async function fetchBuildingsAndTypes() {
      try {
        const userRes = await getLoggedInDepartmentalAdmin();
        let userData = null;
        if (userRes.success && userRes.data) {
          userData = userRes.data.admin || userRes.data;
          if (userData.isNetworkEngineer && Array.isArray(userData.locations)) {
            // Network engineer: buildings from locations
            const uniqueBuildings = [];
            const seen = new Set();
            userData.locations.forEach((loc) => {
              if (loc.building && !seen.has(loc.building._id)) {
                uniqueBuildings.push({ _id: loc.building._id, name: loc.building.name });
                seen.add(loc.building._id);
              }
            });
            setBuildingOptions(uniqueBuildings);
            setNetworkLocations(userData.locations);
            setBuildingsData(uniqueBuildings);
            if (uniqueBuildings.length === 1) setBuilding([uniqueBuildings[0].name]);
          } else {
            // Not network engineer: fetch all buildings
            const allBuildings = await getAllBuildingsForAdminIT();
            setBuildingOptions(allBuildings);
            setBuildingsData(allBuildings);
            setNetworkLocations([]);
            if (allBuildings.length === 1) setBuilding([allBuildings[0].name]);
          }
        } else {
          setBuildingOptions([]);
          setBuildingsData([]);
          setNetworkLocations([]);
        }
        // Fetch system types
        const setsRes = await getAllComponentSets();
        const sets = Array.isArray(setsRes) ? setsRes : setsRes?.sets || [];
        const sysTypes = new Set();
        sets.forEach(set => {
          if (set.systemType) sysTypes.add(set.systemType);
        });
        setSystemTypeOptions(Array.from(sysTypes));
      } catch {
        setBuildingOptions([]);
        setBuildingsData([]);
        setNetworkLocations([]);
        setSystemTypeOptions([]);
      }
    }
    fetchBuildingsAndTypes();
  }, []);

  // Update floor options when building changes
  useEffect(() => {
    if (!building || building.length === 0) {
      setFloorOptions([]);
      setFloor([]);
      setLabOptions([]);
      setLabNumber([]);
      return;
    }
    // Find building objects
    const selectedBuildings = buildingsData.filter(b => building.includes(b.name));
    let floorsSet = new Set();
    if (networkLocations.length > 0) {
      // Network engineer: floors from locations
      networkLocations.forEach(loc => {
        if (loc.building && building.includes(loc.building.name)) {
          floorsSet.add(loc.floor.toString());
        }
      });
    } else {
      selectedBuildings.forEach(b => {
        if (b.floors) {
          b.floors.forEach(f => floorsSet.add(f.floor.toString()));
        }
      });
    }
    const floorsArr = Array.from(floorsSet);
    setFloorOptions(floorsArr);
    if (floorsArr.length === 1) setFloor([floorsArr[0]]);
    else setFloor([]);
    setLabOptions([]);
    setLabNumber([]);
  }, [building, buildingsData, networkLocations]);

  // Update lab options when floor changes
  useEffect(() => {
    if (!building || building.length === 0 || !floor || floor.length === 0) {
      setLabOptions([]);
      setLabNumber([]);
      return;
    }
    const selectedBuildings = buildingsData.filter(b => building.includes(b.name));
    let labsSet = new Set();
    if (networkLocations.length > 0) {
      // Network engineer: labs from locations
      networkLocations.forEach(loc => {
        if (loc.building && building.includes(loc.building.name) && floor.includes(loc.floor.toString())) {
          (loc.labs || []).forEach(lab => labsSet.add(lab));
        }
      });
    } else {
      selectedBuildings.forEach(b => {
        if (b.floors) {
          b.floors.forEach(f => {
            if (floor.includes(f.floor.toString()) && f.labs) {
              f.labs.forEach(lab => labsSet.add(lab));
            }
          });
        }
      });
    }
    const labsArr = Array.from(labsSet);
    setLabOptions(labsArr);
    if (labsArr.length === 1) setLabNumber([labsArr[0]]);
    else setLabNumber([]);
  }, [building, floor, buildingsData, networkLocations]);

  // --- Render ---
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-4 relative overflow-x-hidden">
      <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[420px] h-[220px] bg-gradient-to-tr from-purple-200 via-blue-200 to-transparent rounded-full blur-3xl opacity-60 z-0 pointer-events-none" />
      <div className="w-full max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row gap-8">
        {/* Ticket Report Card */}
        <div className="flex-1 bg-white/80 rounded-2xl shadow-2xl border border-purple-100 p-6 mb-8 md:mb-0">
          <div className="flex flex-col items-center mb-2">
            <div className="w-14 h-14 flex items-center justify-center bg-purple-100 rounded-xl shadow">
              <FileText className="text-purple-600" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">Ticket Reports</h1>
            <span className="text-gray-400 text-xs">Last generated: {new Date().toLocaleDateString()}</span>
          </div>
          <div className="mb-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex flex-col gap-2 min-w-[120px]">
                <label className="text-xs font-semibold text-gray-700 mb-0 flex items-center gap-1"><Calendar size={15}/> Start Date</label>
                <input type="date" value={ticketStartDate} onChange={e => setTicketStartDate(e.target.value)} className="border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-purple-300 focus:border-purple-400 transition w-full bg-white/80 shadow-sm" />
              </div>
              <div className="flex flex-col gap-2 min-w-[120px]">
                <label className="text-xs font-semibold text-gray-700 mb-0 flex items-center gap-1"><Calendar size={15}/> End Date</label>
                <input type="date" value={ticketEndDate} onChange={e => setTicketEndDate(e.target.value)} className="border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-purple-300 focus:border-purple-400 transition w-full bg-white/80 shadow-sm" />
              </div>
              <div className="flex flex-col gap-2 min-w-[160px] relative" ref={ticketStatusDropdownRef}>
                <label className="text-xs font-semibold text-gray-700 mb-0 flex items-center gap-1"><Layers size={15}/> Status</label>
                <button type="button" onClick={()=>setShowTicketStatusDropdown(v=>!v)} className="border border-gray-300 rounded-xl px-4 py-2 bg-white/90 text-left flex justify-between items-center w-full focus:ring-2 focus:ring-purple-300 shadow-sm transition">
                  <span>{ticketStatuses.length === 0 ? 'Select status' : ticketStatuses.map(s => s.replace('_',' ')).join(', ')}</span>
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {showTicketStatusDropdown && (
                  <div className="absolute z-30 mt-2 w-full bg-white/95 border border-purple-100 rounded-xl shadow-xl py-2 animate-fade-in-down transition-all">
                    {['all', ...STATUS_OPTIONS].map(s => (
                      <button key={s} type="button" onClick={()=>handleTicketStatusChange(s)} className={`flex items-center w-full px-4 py-2 text-sm hover:bg-purple-50 rounded-lg transition ${ticketStatuses.includes(s) ? 'font-semibold text-purple-700 bg-purple-50' : 'text-gray-700'}`}>{ticketStatuses.includes(s) && <Check size={16} className="mr-2 text-purple-600"/>}{s.replace('_',' ')}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 min-w-[120px]">
                <label className="text-xs font-semibold text-gray-700 mb-0 flex items-center gap-1"><MessageCircle size={15}/> Include Comments</label>
                <button type="button" onClick={()=>setTicketIncludeComments(v=>!v)} className={`w-14 h-8 flex items-center rounded-full p-1 transition border-2 ${ticketIncludeComments ? 'bg-green-400 border-green-500' : 'bg-gray-200 border-gray-300'}`} aria-pressed={ticketIncludeComments}>
                  <span className={`w-6 h-6 bg-white rounded-full shadow transform transition-transform ${ticketIncludeComments ? 'translate-x-6' : ''}`}></span>
                </button>
              </div>
              <div className="flex flex-col gap-2 min-w-[100px]">
                <label className="invisible">Reset</label>
                <button type="button" onClick={resetTicketFilters} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 bg-white/80 text-gray-600 hover:bg-gray-100 transition text-xs font-semibold shadow-sm">
                  <RefreshCcw size={16} /> Reset
                </button>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 rounded-xl p-3 mb-4">
            <span className="text-gray-600 font-medium text-sm">Report includes:</span>
            <ul className="text-sm text-gray-700 space-y-1 mt-2">
              <li className="flex items-center">
                <span className="inline-block w-2 h-2 rounded-full bg-purple-500 mr-2" />Status distribution
              </li>
              <li className="flex items-center">
                <span className="inline-block w-2 h-2 rounded-full bg-purple-500 mr-2" />Resolution metrics
              </li>
            </ul>
          </div>
          <div className="flex flex-col gap-2 mb-8">
            <button
              onClick={handleGenerateReport}
              disabled={isGenerating}
              className={`w-full flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-base font-medium shadow-sm border border-purple-600 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2
                ${isGenerating
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'}
              `}
            >
              {isGenerating ? (
                <>
                  <Loader className="animate-spin" size={18} />
                  Generating PDF...
                </>
              ) : (
                <>
                  <DownloadCloud size={18} />
                  Download PDF
                </>
              )}
            </button>
            <button
              onClick={handleGenerateExcel}
              disabled={isGeneratingExcel}
              className={`w-full flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-base font-medium shadow-sm border border-green-600 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2
                ${isGeneratingExcel
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'}
              `}
            >
              {isGeneratingExcel ? (
                <>
                  <Loader className="animate-spin" size={18} />
                  Generating Excel...
                </>
              ) : (
                <>
                  <DownloadCloud size={18} />
                  Download Excel
                </>
              )}
            </button>
          </div>
        </div>
        {/* Inventory Report Card */}
        <div className="flex-1 bg-white/80 rounded-2xl shadow-2xl border border-green-100 p-6">
          <div className="flex flex-col items-center mb-2">
            <div className="w-14 h-14 flex items-center justify-center bg-green-100 rounded-xl shadow">
              <FileText className="text-green-600" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">Inventory Reports</h1>
            <span className="text-gray-400 text-xs">Last generated: {new Date().toLocaleDateString()}</span>
          </div>
          <div className="mb-6">
            <div className="flex flex-wrap gap-4 items-end">
              {/* Building Multi-Select */}
              <div className="flex flex-col gap-2 min-w-[140px]" ref={buildingDropdownRef}>
                <label className="text-xs font-semibold text-gray-700 mb-0 flex items-center gap-1"><Layers size={15}/> Building</label>
                <button type="button" onClick={()=>setShowBuildingDropdown(v=>!v)} className="border border-gray-300 rounded-xl px-4 py-2 bg-white/90 text-left flex justify-between items-center w-full focus:ring-2 focus:ring-green-300 shadow-sm transition">
                  <span>{building.length === 0 ? 'Select building' : building.join(', ')}</span>
                  <ChevronDown size={16} />
                </button>
                {showBuildingDropdown && (
                  <div className="absolute z-30 mt-2 w-full bg-white/95 border border-green-100 rounded-xl shadow-xl py-2 animate-fade-in-down transition-all max-h-56 overflow-y-auto">
                    <button type="button" onClick={()=>handleMultiSelect('all', building, setBuilding, buildingOptions)} className={`flex items-center w-full px-4 py-2 text-sm hover:bg-green-50 rounded-lg transition ${building.length === buildingOptions.length ? 'font-semibold text-green-700 bg-green-50' : 'text-gray-700'}`}>{building.length === buildingOptions.length && <Check size={16} className="mr-2 text-green-600"/>}All</button>
                    {buildingOptions.map(b => (
                      <button key={b._id} type="button" onClick={()=>handleMultiSelect(b.name, building, setBuilding, buildingOptions)} className={`flex items-center w-full px-4 py-2 text-sm hover:bg-green-50 rounded-lg transition ${building.includes(b.name) ? 'font-semibold text-green-700 bg-green-50' : 'text-gray-700'}`}>{building.includes(b.name) && <Check size={16} className="mr-2 text-green-600"/>}{b.name}</button>
                    ))}
                  </div>
                )}
              </div>
              {/* Floor Multi-Select */}
              <div className="flex flex-col gap-2 min-w-[100px]" ref={floorDropdownRef}>
                <label className="text-xs font-semibold text-gray-700 mb-0 flex items-center gap-1"><Layers size={15}/> Floor</label>
                <button type="button" onClick={()=>setShowFloorDropdown(v=>!v)} className="border border-gray-300 rounded-xl px-4 py-2 bg-white/90 text-left flex justify-between items-center w-full focus:ring-2 focus:ring-green-300 shadow-sm transition">
                  <span>{floor.length === 0 ? 'Select floor' : floor.join(', ')}</span>
                  <ChevronDown size={16} />
                </button>
                {showFloorDropdown && (
                  <div className="absolute z-30 mt-2 w-full bg-white/95 border border-green-100 rounded-xl shadow-xl py-2 animate-fade-in-down transition-all max-h-56 overflow-y-auto">
                    <button type="button" onClick={()=>handleMultiSelect('all', floor, setFloor, floorOptions)} className={`flex items-center w-full px-4 py-2 text-sm hover:bg-green-50 rounded-lg transition ${floor.length === floorOptions.length ? 'font-semibold text-green-700 bg-green-50' : 'text-gray-700'}`}>{floor.length === floorOptions.length && <Check size={16} className="mr-2 text-green-600"/>}All</button>
                    {floorOptions.map(f => (
                      <button key={f} type="button" onClick={()=>handleMultiSelect(f, floor, setFloor, floorOptions)} className={`flex items-center w-full px-4 py-2 text-sm hover:bg-green-50 rounded-lg transition ${floor.includes(f) ? 'font-semibold text-green-700 bg-green-50' : 'text-gray-700'}`}>{floor.includes(f) && <Check size={16} className="mr-2 text-green-600"/>}{f}</button>
                    ))}
                  </div>
                )}
              </div>
              {/* Lab Multi-Select */}
              <div className="flex flex-col gap-2 min-w-[100px]" ref={labDropdownRef}>
                <label className="text-xs font-semibold text-gray-700 mb-0 flex items-center gap-1"><Layers size={15}/> Lab</label>
                <button type="button" onClick={()=>setShowLabDropdown(v=>!v)} className="border border-gray-300 rounded-xl px-4 py-2 bg-white/90 text-left flex justify-between items-center w-full focus:ring-2 focus:ring-green-300 shadow-sm transition">
                  <span>{labNumber.length === 0 ? 'Select lab' : labNumber.join(', ')}</span>
                  <ChevronDown size={16} />
                </button>
                {showLabDropdown && (
                  <div className="absolute z-30 mt-2 w-full bg-white/95 border border-green-100 rounded-xl shadow-xl py-2 animate-fade-in-down transition-all max-h-56 overflow-y-auto">
                    <button type="button" onClick={()=>handleMultiSelect('all', labNumber, setLabNumber, labOptions)} className={`flex items-center w-full px-4 py-2 text-sm hover:bg-green-50 rounded-lg transition ${labNumber.length === labOptions.length ? 'font-semibold text-green-700 bg-green-50' : 'text-gray-700'}`}>{labNumber.length === labOptions.length && <Check size={16} className="mr-2 text-green-600"/>}All</button>
                    {labOptions.map(lab => (
                      <button key={lab} type="button" onClick={()=>handleMultiSelect(lab, labNumber, setLabNumber, labOptions)} className={`flex items-center w-full px-4 py-2 text-sm hover:bg-green-50 rounded-lg transition ${labNumber.includes(lab) ? 'font-semibold text-green-700 bg-green-50' : 'text-gray-700'}`}>{labNumber.includes(lab) && <Check size={16} className="mr-2 text-green-600"/>}{lab}</button>
                    ))}
                  </div>
                )}
              </div>
              {/* System Type Multi-Select */}
              <div className="flex flex-col gap-2 min-w-[140px]" ref={systemTypeDropdownRef}>
                <label className="text-xs font-semibold text-gray-700 mb-0 flex items-center gap-1"><Layers size={15}/> System Type</label>
                <button type="button" onClick={()=>setShowSystemTypeDropdown(v=>!v)} className="border border-gray-300 rounded-xl px-4 py-2 bg-white/90 text-left flex justify-between items-center w-full focus:ring-2 focus:ring-green-300 shadow-sm transition">
                  <span>{systemType.length === 0 ? 'Select type' : systemType.join(', ')}</span>
                  <ChevronDown size={16} />
                </button>
                {showSystemTypeDropdown && (
                  <div className="absolute z-30 mt-2 w-full bg-white/95 border border-green-100 rounded-xl shadow-xl py-2 animate-fade-in-down transition-all max-h-56 overflow-y-auto">
                    <button type="button" onClick={()=>handleMultiSelect('all', systemType, setSystemType, systemTypeOptions)} className={`flex items-center w-full px-4 py-2 text-sm hover:bg-green-50 rounded-lg transition ${systemType.length === systemTypeOptions.length ? 'font-semibold text-green-700 bg-green-50' : 'text-gray-700'}`}>{systemType.length === systemTypeOptions.length && <Check size={16} className="mr-2 text-green-600"/>}All</button>
                    {systemTypeOptions.map(type => (
                      <button key={type} type="button" onClick={()=>handleMultiSelect(type, systemType, setSystemType, systemTypeOptions)} className={`flex items-center w-full px-4 py-2 text-sm hover:bg-green-50 rounded-lg transition ${systemType.includes(type) ? 'font-semibold text-green-700 bg-green-50' : 'text-gray-700'}`}>{systemType.includes(type) && <Check size={16} className="mr-2 text-green-600"/>}{type}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 min-w-[100px]">
                <label className="invisible">Reset</label>
                <button type="button" onClick={resetInventoryFilters} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 bg-white/80 text-gray-600 hover:bg-gray-100 transition text-xs font-semibold shadow-sm">
                  <RefreshCcw size={16} /> Reset
                </button>
              </div>
            </div>
          </div>
          <div className="bg-green-50 rounded-xl p-3 mb-4">
            <span className="text-gray-600 font-medium text-sm">Report includes:</span>
            <ul className="text-sm text-gray-700 space-y-1 mt-2">
              <li className="flex items-center">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2" />System details
              </li>
              <li className="flex items-center">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2" />Owner info (email or name)
              </li>
              <li className="flex items-center">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2" />Component breakdown
              </li>
            </ul>
          </div>
          <div className="flex flex-col gap-2 mb-8">
            <button
              onClick={handleGenerateInventoryExcel}
              disabled={isGeneratingInventoryExcel}
              className={`w-full flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-base font-medium shadow-sm border border-green-600 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2
                ${isGeneratingInventoryExcel
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'}
              `}
            >
              {isGeneratingInventoryExcel ? (
                <>
                  <Loader className="animate-spin" size={18} />
                  Generating Inventory Excel...
                </>
              ) : (
                <>
                  <DownloadCloud size={18} />
                  Download Inventory Excel
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeptReports; 