'use client';

import FailureCard from '../../../components/checklist/FailureCard';
import { groupByStatus, groupByChecklist, groupByDevice } from '../utils/failureGrouping';

export default function FailureGroupedList({
  failures,
  viewMode,
  collapsedSections,
  onToggleSection,
  onViewDetail,
  onLinkToWorkOrder,
  userRole
}) {
  const cardProps = { onViewDetail, onLinkToWorkOrder, userRole };

  if (viewMode === 'status') {
    const grouped = groupByStatus(failures);
    return (
      <div className="space-y-8">
        <StatusSection
          id="withoutOT"
          title="Sin Orden de Trabajo Asignada"
          subtitle="Fallas recién reportadas esperando atención del equipo"
          icon="fa-exclamation-triangle"
          iconBg="bg-orange-100 text-orange-600"
          groups={grouped.withoutOT}
          collapsed={collapsedSections.withoutOT}
          onToggle={onToggleSection}
          emptyMessage="No hay fallas pendientes sin OT"
          cardProps={cardProps}
        />
        <StatusSection
          id="withOT"
          title="Con Orden de Trabajo Asignada"
          subtitle="Fallas en proceso de resolución, con repuesto asignado o resueltas"
          icon="fa-clipboard-check"
          iconBg="bg-blue-100 text-blue-600"
          groups={grouped.withOT}
          collapsed={collapsedSections.withOT}
          onToggle={onToggleSection}
          emptyMessage="No hay fallas con OT activa"
          cardProps={cardProps}
        />
      </div>
    );
  }

  if (viewMode === 'checklist') {
    const grouped = groupByChecklist(failures);
    return (
      <div className="space-y-4">
        {Object.entries(grouped).map(([name, list]) => (
          <AccordionGroup
            key={name}
            id={name}
            title={name}
            count={list.length}
            icon="fa-file-lines"
            iconColor="text-purple-600"
            badgeClass="bg-purple-100 text-purple-700 border-purple-200"
            collapsed={collapsedSections[name]}
            onToggle={onToggleSection}
          >
            <FailureCardGrid failures={list} {...cardProps} />
          </AccordionGroup>
        ))}
      </div>
    );
  }

  const grouped = groupByDevice(failures);
  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([name, list]) => (
        <AccordionGroup
          key={name}
          id={name}
          title={name}
          count={list.length}
          icon="fa-cogs"
          iconColor="text-pink-600"
          badgeClass="bg-pink-100 text-pink-700 border-pink-200"
          collapsed={collapsedSections[name]}
          onToggle={onToggleSection}
        >
          <FailureCardGrid failures={list} {...cardProps} />
        </AccordionGroup>
      ))}
    </div>
  );
}

function StatusSection({ id, title, subtitle, icon, iconBg, groups, collapsed, onToggle, emptyMessage, cardProps }) {
  const isEmpty = !groups.checklist.length && !groups.devices.length && !groups.independent.length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4 cursor-pointer" onClick={() => onToggle(id)}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
            <i className={`fas ${icon}`}></i>
          </div>
          <div>
            <h2 className="text-md font-bold text-gray-900">{title}</h2>
            <p className="text-gray-600 text-xs">{subtitle}</p>
          </div>
        </div>
        <i className={`fas fa-chevron-${collapsed ? 'down' : 'up'} text-gray-400 text-xs`}></i>
      </div>

      {!collapsed && (
        <div className="space-y-4">
          <SubGroup title="Reportes desde Checklist" color="purple" items={groups.checklist} cardProps={cardProps} />
          <SubGroup title="Reportes de Dispositivos Afectados" color="pink" items={groups.devices} cardProps={cardProps} />
          <SubGroup title="Reportes Independientes y Generales" color="indigo" items={groups.independent} cardProps={cardProps} />
          {isEmpty && <div className="py-6 text-center text-gray-500 text-xs">{emptyMessage}</div>}
        </div>
      )}
    </div>
  );
}

function SubGroup({ title, color, items, cardProps }) {
  if (!items.length) return null;
  const colors = {
    purple: { text: 'text-purple-700', dot: 'bg-purple-500' },
    pink: { text: 'text-pink-700', dot: 'bg-pink-500' },
    indigo: { text: 'text-indigo-700', dot: 'bg-indigo-500' }
  };
  const c = colors[color];
  return (
    <div>
      <h4 className={`text-xs font-semibold ${c.text} mb-2 flex items-center gap-1.5`}>
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}></span>
        {title} ({items.length})
      </h4>
      <FailureCardGrid failures={items} {...cardProps} />
    </div>
  );
}

function AccordionGroup({ id, title, count, icon, iconColor, badgeClass, collapsed, onToggle, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => onToggle(id)}>
        <div className="flex items-center gap-2">
          <i className={`fas ${icon} ${iconColor} text-sm`}></i>
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeClass}`}>
            {count} {count === 1 ? 'falla' : 'fallas'}
          </span>
        </div>
        <i className={`fas fa-chevron-${collapsed ? 'down' : 'up'} text-gray-400 text-xs`}></i>
      </div>
      {!collapsed && <div className="mt-4">{children}</div>}
    </div>
  );
}

function FailureCardGrid({ failures, onViewDetail, onLinkToWorkOrder, userRole }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {failures.map((failure) => (
        <FailureCard
          key={failure.id}
          failure={failure}
          onViewDetail={onViewDetail}
          onLinkToWorkOrder={onLinkToWorkOrder}
          userRole={userRole}
        />
      ))}
    </div>
  );
}
