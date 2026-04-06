import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Plus, Trash2, Save, X, Package, Pencil } from 'lucide-react';
import { getComponentSets, addComponentSet, deleteComponentSet, editComponentSet } from '../service/adminAuthService';

const initialComponent = { componentType: '' };

export default function ComponentSets() {
  const [componentSets, setComponentSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSet, setNewSet] = useState({ name: '', systemType: '', components: [ { ...initialComponent } ] });
  const [adding, setAdding] = useState(false);
  const [editingSet, setEditingSet] = useState(null); // holds the set being edited or null
  const [editForm, setEditForm] = useState(null); // holds the edit form state
  const [editing, setEditing] = useState(false);

  // Fetch all component sets
  const fetchComponentSets = async () => {
    setLoading(true);
    try {
      const sets = await getComponentSets();
      setComponentSets(sets);
    } catch {
      toast.error('Error fetching component sets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchComponentSets(); }, []);

  // Add new component set
  const handleAddSet = async (e) => {
    e.preventDefault();
    if (!newSet.name || !newSet.systemType || newSet.components.length === 0 || newSet.components.some(c => !c.componentType)) {
      toast.error('Please fill all required fields');
      return;
    }
    setAdding(true);
    try {
      const data = await addComponentSet(newSet);
      if (data.success) {
        toast.success('Component set added');
        setShowAddForm(false);
        setNewSet({ name: '', systemType: '', components: [ { ...initialComponent } ] });
        fetchComponentSets();
      } else {
        toast.error(data.message || 'Failed to add component set');
      }
    } catch {
      toast.error('Error adding component set');
    } finally {
      setAdding(false);
    }
  };

  // Delete a component set
  const handleDeleteSet = async (id) => {
    if (!window.confirm('Delete this component set?')) return;
    try {
      const data = await deleteComponentSet(id);
      if (data.success) {
        toast.success('Component set deleted');
        fetchComponentSets();
      } else {
        toast.error(data.message || 'Failed to delete');
      }
    } catch {
      toast.error('Error deleting component set');
    }
  };

  // Add/remove component fields in the add form
  const handleComponentChange = (idx, field, value) => {
    setNewSet((prev) => {
      const updated = [...prev.components];
      updated[idx][field] = value;
      return { ...prev, components: updated };
    });
  };
  const addComponentField = () => setNewSet((prev) => ({ ...prev, components: [ ...prev.components, { ...initialComponent } ] }));
  const removeComponentField = (idx) => setNewSet((prev) => ({ ...prev, components: prev.components.filter((_, i) => i !== idx) }));

  // Start editing a set
  const handleEditClick = (set) => {
    setEditingSet(set);
    setEditForm({
      name: set.name,
      systemType: set.systemType,
      components: set.components.map(c => ({ componentType: c.componentType })),
    });
  };

  // Handle edit form changes
  const handleEditFormChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };
  const handleEditComponentChange = (idx, value) => {
    setEditForm(prev => {
      const updated = [...prev.components];
      updated[idx].componentType = value;
      return { ...prev, components: updated };
    });
  };
  const addEditComponentField = () => setEditForm(prev => ({ ...prev, components: [ ...prev.components, { componentType: '' } ] }));
  const removeEditComponentField = (idx) => setEditForm(prev => ({ ...prev, components: prev.components.filter((_, i) => i !== idx) }));

  // Save edit
  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editForm.name || !editForm.systemType || editForm.components.length === 0 || editForm.components.some(c => !c.componentType)) {
      toast.error('Please fill all required fields');
      return;
    }
    setEditing(true);
    try {
      const data = await editComponentSet(editingSet._id, editForm);
      if (data.success) {
        toast.success('Component set updated');
        setEditingSet(null);
        setEditForm(null);
        fetchComponentSets();
      } else {
        toast.error(data.message || 'Failed to update component set');
      }
    } catch {
      toast.error('Error updating component set');
    } finally {
      setEditing(false);
    }
  };
  const handleEditCancel = () => {
    setEditingSet(null);
    setEditForm(null);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8">
      <div className="bg-white/90 rounded-2xl shadow-xl p-6 sm:p-10 border border-gray-200">
        <h1 className="text-3xl font-bold mb-2 text-blue-900 flex items-center gap-2">
          <Package className="inline-block text-blue-500" size={32}/> Component Sets
        </h1>
        <p className="text-gray-600 mb-6">Create, edit, and manage reusable sets of components for different system types. Useful for quick inventory setup and standardization.</p>
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="font-semibold text-lg text-gray-800">All Component Sets</span>
          <button
            onClick={() => setShowAddForm(v => !v)}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition"
          >
            <Plus size={18} /> {showAddForm ? 'Cancel' : 'Add Component Set'}
          </button>
        </div>
        <hr className="mb-6" />
        {showAddForm && (
          <form onSubmit={handleAddSet} className="bg-blue-50/60 rounded-xl shadow p-6 mb-10 border border-blue-200 space-y-4 animate-fade-in">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-xs font-semibold mb-1 text-blue-900">Set Name</label>
                <input
                  type="text"
                  value={newSet.name}
                  onChange={e => setNewSet(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
                  required
                  placeholder="e.g. Desktop Setup"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold mb-1 text-blue-900">System Type</label>
                <input
                  type="text"
                  value={newSet.systemType}
                  onChange={e => setNewSet(prev => ({ ...prev, systemType: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
                  required
                  placeholder="e.g. Desktop, Laptop"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-blue-900">Components <span className="text-gray-400">(Add at least one)</span></label>
              <div className="space-y-2">
                {newSet.components.map((comp, idx) => (
                  <div key={idx} className="flex gap-2 items-end">
                    <input
                      type="text"
                      value={comp.componentType}
                      onChange={e => handleComponentChange(idx, 'componentType', e.target.value)}
                      placeholder="Component Type (e.g., CPU)"
                      className="px-2 py-1 border rounded w-40 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
                      required
                    />
                    <button type="button" onClick={() => removeComponentField(idx)} className="text-red-500 hover:text-red-700 transition" title="Remove component"><X size={18} /></button>
                  </div>
                ))}
                <button type="button" onClick={addComponentField} className="flex items-center gap-1 text-green-700 hover:text-green-900 mt-2 text-sm font-semibold transition"><Plus size={16}/> Add Component</button>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={adding}
                className="px-6 py-2 rounded-lg bg-green-600 text-white font-semibold shadow hover:bg-green-700 flex items-center gap-2 transition"
              >
                <Save size={18}/> {adding ? 'Saving...' : 'Save Set'}
              </button>
            </div>
          </form>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm rounded-xl overflow-hidden shadow border border-gray-200">
            <thead>
              <tr className="bg-blue-100 text-blue-900">
                <th className="py-2 px-3 text-left">Name</th>
                <th className="py-2 px-3 text-left">System Type</th>
                <th className="py-2 px-3 text-left">Components</th>
                <th className="py-2 px-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400">Loading...</td></tr>
              ) : componentSets.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400">No component sets found.</td></tr>
              ) : (
                componentSets.map((set, idx) => (
                  <tr key={set._id} className={idx % 2 === 0 ? 'bg-white' : 'bg-blue-50/60'}>
                    <td className="py-2 px-3 font-semibold text-gray-800">{set.name}</td>
                    <td className="py-2 px-3">{set.systemType}</td>
                    <td className="py-2 px-3">
                      <ul className="list-disc ml-4">
                        {set.components.map((c, i) => (
                          <li key={i}>{c.componentType}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="py-2 px-3 space-x-2 flex items-center">
                      <button
                        onClick={() => handleEditClick(set)}
                        className="p-2 rounded-full hover:bg-blue-100 text-blue-600 hover:text-blue-800 transition"
                        title="Edit this set"
                        aria-label="Edit"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteSet(set._id)}
                        className="p-2 rounded-full hover:bg-red-100 text-red-500 hover:text-red-700 transition"
                        title="Delete this set"
                        aria-label="Delete"
                      >
                        <Trash2 size={18}/>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingSet && editForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg relative border border-blue-200 animate-slide-up">
            <button onClick={handleEditCancel} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 transition"><X size={22}/></button>
            <h2 className="text-2xl font-bold mb-4 text-blue-900">Edit Component Set</h2>
            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-blue-900">Set Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => handleEditFormChange('name', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
                  required
                  placeholder="e.g. Desktop Setup"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-blue-900">System Type</label>
                <input
                  type="text"
                  value={editForm.systemType}
                  onChange={e => handleEditFormChange('systemType', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
                  required
                  placeholder="e.g. Desktop, Laptop"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-blue-900">Components <span className="text-gray-400">(Add at least one)</span></label>
                <div className="space-y-2">
                  {editForm.components.map((comp, idx) => (
                    <div key={idx} className="flex gap-2 items-end">
                      <input
                        type="text"
                        value={comp.componentType}
                        onChange={e => handleEditComponentChange(idx, e.target.value)}
                        placeholder="Component Type (e.g., CPU)"
                        className="px-2 py-1 border rounded w-40 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
                        required
                      />
                      <button type="button" onClick={() => removeEditComponentField(idx)} className="text-red-500 hover:text-red-700 transition" title="Remove component"><X size={18} /></button>
                    </div>
                  ))}
                  <button type="button" onClick={addEditComponentField} className="flex items-center gap-1 text-green-700 hover:text-green-900 mt-2 text-sm font-semibold transition"><Plus size={16}/> Add Component</button>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={handleEditCancel} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition">Cancel</button>
                <button type="submit" disabled={editing} className="px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 flex items-center gap-2 transition">
                  <Save size={18}/> {editing ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 