'use client';

export default function FailureTabs({ activeTab, onTabChange, totals }) {
  const tabs = [
    { id: 'all', icon: 'fa-border-all', label: 'Todas las Fallas', count: totals.all, badgeClass: 'bg-gray-100 text-gray-600' },
    { id: 'pending', icon: 'fa-clock', label: 'Fallas Pendientes', count: totals.pending, badgeClass: 'bg-amber-100 text-amber-700' },
    { id: 'resolved', icon: 'fa-check-circle', label: 'Historial Resueltas', count: totals.resolved, badgeClass: 'bg-emerald-100 text-emerald-700' }
  ];

  return (
    <div className="flex border-b border-gray-200 bg-white rounded-t-xl px-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={`pb-2.5 px-4 text-xs font-semibold tracking-wide border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === tab.id
              ? 'border-purple-500 text-purple-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <i className={`fas ${tab.icon} text-[10px]`}></i>
          {tab.label}
          <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${tab.badgeClass}`}>{tab.count}</span>
        </button>
      ))}
    </div>
  );
}
