'use client';

import { DONUT_COLORS } from '../utils/failureBookHelpers';

export default function FailureStatsPanel({ stats, bookStats, statsLoading, showCharts }) {
  if (!showCharts) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-gray-600">
          {statsLoading ? 'Actualizando estadísticas...' : 'Estadísticas según filtros activos'}
          {bookStats.total != null && !statsLoading && (
            <span className="ml-1 text-gray-500">({bookStats.total} fallas en vista)</span>
          )}
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <ChecklistChart items={stats.topChecklists} />
        <DeviceChart items={stats.topDevices} />
        <TechnicianChart items={stats.topTechs} />
      </div>
    </div>
  );
}

function ChecklistChart({ items }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between">
      <div>
        <h3 className="text-sm font-semibold text-purple-700 flex items-center gap-2 mb-4">
          <i className="fas fa-list-check text-purple-400"></i>
          Checklists con más Fallas
        </h3>
        {items.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-gray-500 text-xs">No hay datos disponibles</div>
        ) : (
          <svg width="100%" height="160" viewBox="0 0 320 160" className="overflow-visible">
            {items.map((item, index) => {
              const maxCount = Math.max(...items.map((c) => c.count)) || 1;
              const barWidth = 32;
              const spacing = 26;
              const x = 30 + index * (barWidth + spacing);
              const barHeight = (item.count / maxCount) * 100;
              const y = 130 - barHeight;
              return (
                <g key={item.name}>
                  <defs>
                    <linearGradient id={`gradient-bar-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#c084fc" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                  <rect x={x} y={y} width={barWidth} height={barHeight} rx={5} fill={`url(#gradient-bar-${index})`} />
                  <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fill="#6d28d9" fontSize="10" fontWeight="bold">
                    {item.count}
                  </text>
                  <text x={x + barWidth / 2} y={145} textAnchor="middle" fill="#4b5563" fontSize="8">
                    {item.name.length > 8 ? `${item.name.slice(0, 8)}..` : item.name}
                  </text>
                </g>
              );
            })}
            <line x1="15" y1="130" x2="310" y2="130" stroke="#d1d5db" strokeWidth="1" />
          </svg>
        )}
      </div>
      <Footer left="Datos del filtro actual" right="Top 5" rightClass="text-purple-600" />
    </div>
  );
}

function DeviceChart({ items }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between">
      <div>
        <h3 className="text-sm font-semibold text-pink-700 flex items-center gap-2 mb-4">
          <i className="fas fa-cube text-pink-400"></i>
          Dispositivos con más Reportes
        </h3>
        {items.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-gray-500 text-xs">No hay datos disponibles</div>
        ) : (
          <div className="flex items-center justify-around h-40">
            <svg width="120" height="120" viewBox="0 0 100 100" className="transform -rotate-90">
              {(() => {
                const total = items.reduce((sum, item) => sum + item.count, 0);
                let accumulatedPercent = 0;
                return items.map((item, index) => {
                  const percent = (item.count / total) * 100;
                  const r = 35;
                  const c = 2 * Math.PI * r;
                  const strokeDasharray = `${(percent / 100) * c} ${c}`;
                  const strokeDashoffset = -((accumulatedPercent / 100) * c);
                  accumulatedPercent += percent;
                  return (
                    <circle
                      key={item.name}
                      cx="50"
                      cy="50"
                      r={r}
                      fill="transparent"
                      stroke={DONUT_COLORS[index % DONUT_COLORS.length]}
                      strokeWidth={14}
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                    />
                  );
                });
              })()}
              <circle cx="50" cy="50" r="26" fill="#f9fafb" />
            </svg>
            <div className="flex flex-col gap-1.5 max-w-[50%]">
              {items.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2 text-[10px] text-gray-700">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}></span>
                  <span className="truncate" title={item.name}>{item.name}</span>
                  <span className="text-gray-900 font-bold ml-auto">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer left="Top dispositivos reportados" right="Visual" rightClass="text-pink-600" />
    </div>
  );
}

function TechnicianChart({ items }) {
  const medalColors = ['text-yellow-500', 'text-gray-400', 'text-amber-700', 'text-gray-500', 'text-gray-500'];
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between">
      <div>
        <h3 className="text-sm font-semibold text-blue-700 flex items-center gap-2 mb-4">
          <i className="fas fa-medal text-blue-400"></i>
          Técnicos que más han Resuelto
        </h3>
        {items.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-gray-500 text-xs">No hay resoluciones registradas</div>
        ) : (
          <div className="flex flex-col gap-3 py-1">
            {items.map((tech, index) => {
              const maxCount = Math.max(...items.map((t) => t.count)) || 1;
              const percent = (tech.count / maxCount) * 100;
              return (
                <div key={tech.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <i className={`fas fa-award text-xs ${medalColors[index] || 'text-gray-600'}`}></i>
                      <span className="font-medium text-gray-800">{tech.name}</span>
                    </div>
                    <span className="text-blue-700 font-bold text-[11px]">{tech.count} resueltas</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden border border-gray-200">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600" style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer left="Productividad (OTs Cerradas)" right="Rank" rightClass="text-blue-600" />
    </div>
  );
}

function Footer({ left, right, rightClass }) {
  return (
    <div className="border-t border-gray-100 pt-3 mt-2 text-[10px] text-gray-500 flex justify-between">
      <span>{left}</span>
      <span className={`font-medium ${rightClass}`}>{right}</span>
    </div>
  );
}
