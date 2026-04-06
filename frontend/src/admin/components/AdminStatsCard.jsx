const AdminStatsCard = ({ title, value, icon: Icon, color }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <div className={`p-3 rounded-full ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
  );
};

export default AdminStatsCard;