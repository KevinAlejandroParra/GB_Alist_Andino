'use client';

import FailureCard from '../../../components/checklist/FailureCard';
import { groupByChecklist, groupByDevice } from '../utils/failureGrouping';

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
