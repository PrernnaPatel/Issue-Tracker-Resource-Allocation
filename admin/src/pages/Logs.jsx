import React, { useEffect, useState } from 'react';
import { getActionLogs } from '../service/adminAuthService';

const actionLabels = {
  CREATE: 'Create',
  UPDATE: 'Update',
  DELETE: 'Delete',
  BULK_UPDATE: 'Bulk Update',
  BULK_DELETE: 'Bulk Delete',
  EXPORT: 'Export',
  LOGIN: 'Login',
};

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [performedBy, setPerformedBy] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const fetchLogs = async (filters = {}) => {
    setLoading(true);
    const logs = await getActionLogs(filters);
    setLogs(logs);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleFilter = (e) => {
    e.preventDefault();
    fetchLogs({ action, performedBy, from, to });
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-indigo-800">Action Logs</h1>
      <form className="flex flex-wrap gap-4 mb-6 items-end" onSubmit={handleFilter}>
        <div>
          <label className="block text-sm font-semibold mb-1">Action</label>
          <select value={action} onChange={e => setAction(e.target.value)} className="px-3 py-2 border rounded-lg">
            <option value="">All</option>
            {Object.entries(actionLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Performed By (email or name)</label>
          <input type="text" value={performedBy} onChange={e => setPerformedBy(e.target.value)} className="px-3 py-2 border rounded-lg" placeholder="Enter email or name" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="px-3 py-2 border rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="px-3 py-2 border rounded-lg" />
        </div>
        <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700">Filter</button>
      </form>
      <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-indigo-50">
              <th className="px-4 py-3 text-left font-semibold">Date</th>
              <th className="px-4 py-3 text-left font-semibold">Action</th>
              <th className="px-4 py-3 text-left font-semibold">Performed By</th>
              <th className="px-4 py-3 text-left font-semibold">System</th>
              <th className="px-4 py-3 text-left font-semibold">Description</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8">Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8">No logs found.</td></tr>
            ) : (
              logs.map(log => (
                <tr key={log._id} className="border-b hover:bg-indigo-50">
                  <td className="px-4 py-2 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{actionLabels[log.action] || log.action}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{log.performedBy?.name || '-'}<br /><span className="text-xs text-gray-500">{log.performedBy?.email}</span></td>
                  <td className="px-4 py-2 whitespace-nowrap">{log.affectedSystem?.tag || '-'}<br /><span className="text-xs text-gray-500">{log.affectedSystem?.systemName}</span></td>
                  <td className="px-4 py-2">{log.description}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Logs; 