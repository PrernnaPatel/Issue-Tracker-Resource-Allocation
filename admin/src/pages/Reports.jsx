import { useState, useEffect, useRef } from 'react';
import { DownloadCloud, BarChart2, FileText, Loader, PieChart, X, RefreshCcw, Filter, Calendar, Layers, Check, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { generateTicketReport, exportTicketReportExcel, getAllDepartments } from '../service/adminAuthService';
import { toast } from 'react-toastify';

const Reports = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState(['all']);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [includeComments, setIncludeComments] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [showFilters, setShowFilters] = useState(window.innerWidth >= 768);

  const statusDropdownRef = useRef(null);
  const deptDropdownRef = useRef(null);

  useEffect(() => {
    // Fetch departments for filter dropdown
    (async () => {
      try {
        const { depts } = await getAllDepartments();
        setDepartments(depts || []);
      } catch {
        setDepartments([]);
      }
    })();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setShowFilters(false);
      else setShowFilters(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setShowStatusDropdown(false);
      }
    }
    if (showStatusDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showStatusDropdown]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (deptDropdownRef.current && !deptDropdownRef.current.contains(event.target)) {
        setShowDeptDropdown(false);
      }
    }
    if (showDeptDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDeptDropdown]);

  const handleStatusChange = (status) => {
    setSelectedStatuses(prev => {
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

  const handleDepartmentChange = (dept) => {
    setSelectedDepartments(prev =>
      prev.includes(dept)
        ? prev.filter(d => d !== dept)
        : [...prev.filter(d => d !== 'all'), dept]
    );
  };

  const filterParams = {
    startDate,
    endDate,
    status: selectedStatuses,
    departments: selectedDepartments,
    includeComments
  };

  const handleGenerateReport = async () => {
    try {
      setIsGenerating(true);
      const blob = await generateTicketReport(filterParams);
      
      // Create and trigger download
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
      console.error('Report generation failed:', error);
      toast.error(error.message || 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateExcel = async () => {
    setIsGeneratingExcel(true);
    try {
      const blob = await exportTicketReportExcel(filterParams);
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
      console.error('Excel report generation failed:', error);
      toast.error(error.message || 'Failed to generate Excel report');
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedStatuses(['all']);
    setSelectedDepartments([]);
    setIncludeComments(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center py-4 relative overflow-x-hidden">
      {/* Decorative Blurred Blob */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[420px] h-[220px] bg-gradient-to-tr from-purple-200 via-blue-200 to-transparent rounded-full blur-3xl opacity-60 z-0 pointer-events-none" />
      <div className="w-full max-w-2xl mx-auto relative z-10">
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={() => setShowFilters(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-purple-200 bg-white text-purple-700 hover:bg-purple-50 shadow-sm transition font-semibold"
          >
            <Filter size={18} />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
            {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
        <div className="flex flex-col items-center mb-2">
          <div className="w-14 h-14 flex items-center justify-center bg-purple-100 rounded-xl shadow">
            <FileText className="text-purple-600" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Reports</h1>
          <span className="text-gray-400 text-xs">Last generated: {new Date().toLocaleDateString()}</span>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-purple-100 hover:shadow-2xl transition-all duration-200 relative overflow-hidden">
          {showFilters && (
            <div className="mb-6 transition-all duration-300">
              <div className="backdrop-blur-md bg-white/70 border border-purple-100 rounded-3xl shadow-2xl px-8 py-6 flex flex-col gap-6 md:flex-row md:items-end md:gap-8 relative">
                <div className="flex flex-wrap gap-6 items-end w-full">
                  <div className="flex flex-col gap-2 min-w-[160px]">
                    <label className="text-xs font-semibold text-gray-700 mb-0 flex items-center gap-1"><Calendar size={15}/> Start Date</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-purple-300 focus:border-purple-400 transition w-full bg-white/80 shadow-sm" />
                  </div>
                  <div className="flex flex-col gap-2 min-w-[160px]">
                    <label className="text-xs font-semibold text-gray-700 mb-0 flex items-center gap-1"><Calendar size={15}/> End Date</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-purple-300 focus:border-purple-400 transition w-full bg-white/80 shadow-sm" />
                  </div>
                  <div className="flex flex-col gap-2 min-w-[180px] relative" ref={statusDropdownRef}>
                    <label className="text-xs font-semibold text-gray-700 mb-0 flex items-center gap-1"><Layers size={15}/> Status</label>
                    <button type="button" onClick={()=>setShowStatusDropdown(v=>!v)} className="border border-gray-300 rounded-xl px-4 py-2 bg-white/90 text-left flex justify-between items-center w-full focus:ring-2 focus:ring-purple-300 shadow-sm transition">
                      <span>{selectedStatuses.length === 0 ? 'Select status' : selectedStatuses.map(s => s.replace('_',' ')).join(', ')}</span>
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {showStatusDropdown && (
                      <div className="absolute z-30 mt-2 w-full bg-white/95 border border-purple-100 rounded-xl shadow-xl py-2 animate-fade-in-down transition-all">
                        {['all', 'pending', 'in_progress', 'resolved', 'revoked'].map(s => (
                          <button key={s} type="button" onClick={()=>handleStatusChange(s)} className={`flex items-center w-full px-4 py-2 text-sm hover:bg-purple-50 rounded-lg transition ${selectedStatuses.includes(s) ? 'font-semibold text-purple-700 bg-purple-50' : 'text-gray-700'}`}>{selectedStatuses.includes(s) && <Check size={16} className="mr-2 text-purple-600"/>}{s.replace('_',' ')}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 min-w-[180px] relative" ref={deptDropdownRef}>
                    <label className="text-xs font-semibold text-gray-700 mb-0 flex items-center gap-1"><Layers size={15}/> Department</label>
                    <button type="button" onClick={()=>setShowDeptDropdown(v=>!v)} className="border border-gray-300 rounded-xl px-4 py-2 bg-white/90 text-left flex justify-between items-center w-full focus:ring-2 focus:ring-blue-300 shadow-sm transition">
                      <span>{selectedDepartments.length === 0 ? 'Select department' : selectedDepartments.join(', ')}</span>
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {showDeptDropdown && (
                      <div className="absolute z-30 mt-2 w-full bg-white/95 border border-blue-100 rounded-xl shadow-xl py-2 animate-fade-in-down transition-all">
                        {departments.map(dept => (
                          <button key={dept._id} type="button" onClick={()=>handleDepartmentChange(dept.name)} className={`flex items-center w-full px-4 py-2 text-sm hover:bg-blue-50 rounded-lg transition ${selectedDepartments.includes(dept.name) ? 'font-semibold text-blue-700 bg-blue-50' : 'text-gray-700'}`}>{selectedDepartments.includes(dept.name) && <Check size={16} className="mr-2 text-blue-600"/>}{dept.name}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 min-w-[140px]">
                    <label className="text-xs font-semibold text-gray-700 mb-0 flex items-center gap-1"><MessageCircle size={15}/> Include Comments</label>
                    <button type="button" onClick={()=>setIncludeComments(v=>!v)} className={`w-14 h-8 flex items-center rounded-full p-1 transition border-2 ${includeComments ? 'bg-green-400 border-green-500' : 'bg-gray-200 border-gray-300'}`} aria-pressed={includeComments}>
                      <span className={`w-6 h-6 bg-white rounded-full shadow transform transition-transform ${includeComments ? 'translate-x-6' : ''}`}></span>
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 min-w-[120px]">
                    <label className="invisible">Reset</label>
                    <button type="button" onClick={resetFilters} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 bg-white/80 text-gray-600 hover:bg-gray-100 transition text-xs font-semibold shadow-sm">
                      <RefreshCcw size={16} /> Reset
                    </button>
                  </div>
                </div>
              </div>
              <hr className="my-4 border-gray-200" />
            </div>
          )}
          <hr className="my-4 border-gray-200" />
          {/* Ribbon/Bookmark Tag */}
          <h3 className="text-xl font-semibold text-gray-800 mb-1 flex items-center gap-2">
            <BarChart2 className="text-blue-400" size={22} />
            Ticket Summary Report
          </h3>
          <p className="text-gray-600 text-sm mb-3">Comprehensive report of all tickets across departments</p>
          <div className="bg-purple-50 rounded-xl p-3 mb-4">
            <span className="text-gray-600 font-medium text-sm">Report includes:</span>
            <ul className="text-sm text-gray-700 space-y-1 mt-2">
              <li className="flex items-center">
                <span className="inline-block w-2 h-2 rounded-full bg-purple-500 mr-2" />Department-wise breakdown
              </li>
              <li className="flex items-center">
                <span className="inline-block w-2 h-2 rounded-full bg-purple-500 mr-2" />Ticket status distribution
              </li>
              <li className="flex items-center">
                <span className="inline-block w-2 h-2 rounded-full bg-purple-500 mr-2" />Resolution metrics
              </li>
            </ul>
          </div>
          <hr className="my-4 border-gray-200" />
          <div className="flex flex-col gap-2">
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
      </div>
    </div>
  );
};

export default Reports;