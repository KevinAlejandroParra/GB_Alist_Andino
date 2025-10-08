'use client'

import React from 'react'
import PremiosHistoryTable from '../PremiosHistoryTable'
import HistorySection from '../HistorySection'

export default function ChecklistHistory({ 
  type, 
  premiosHistoryData, 
  historicalChecklists,
  expandedHistoricalChecklists,
  onToggleExpand 
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      {type === 'specific' && premiosHistoryData ? (
        <PremiosHistoryTable data={premiosHistoryData} />
      ) : (
        <HistorySection
          historicalChecklists={historicalChecklists}
          expandedHistoricalChecklists={expandedHistoricalChecklists}
          toggleHistoricalChecklist={onToggleExpand}
        />
      )}
    </div>
  )
}