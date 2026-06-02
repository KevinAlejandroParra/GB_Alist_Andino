'use client';

export default function FailureSearchBar({
  searchContainerRef,
  searchQuery,
  onSearchChange,
  onClear,
  showSuggestions,
  onFocus,
  hasSuggestionResults,
  groupedSuggestions,
  onSelectSuggestion,
  loadError
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 relative z-30">
      <div ref={searchContainerRef} className="relative">
        <div className="flex items-center bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-100 transition-all">
          <i className="fas fa-search text-gray-400 mr-3 text-sm"></i>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={onFocus}
            placeholder="Buscar falla, dispositivo, técnico..."
            className="w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
            autoComplete="off"
          />
          {searchQuery && (
            <button type="button" onClick={onClear} className="text-gray-400 hover:text-gray-600 ml-2">
              <i className="fas fa-times-circle"></i>
            </button>
          )}
        </div>

        {showSuggestions && searchQuery.trim().length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
            {!hasSuggestionResults ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                No hay coincidencias para &quot;{searchQuery}&quot;
              </div>
            ) : (
              <>
                {groupedSuggestions.devices.length > 0 && (
                  <SuggestionSection title="📍 Dispositivos">
                    {groupedSuggestions.devices.map((device) => (
                      <SuggestionButton
                        key={device.name}
                        onClick={() => onSelectSuggestion(device.name)}
                        label={device.name}
                        meta={`${device.active} ${device.active === 1 ? 'falla activa' : 'fallas activas'}`}
                      />
                    ))}
                  </SuggestionSection>
                )}
                {groupedSuggestions.failures.length > 0 && (
                  <SuggestionSection title="📋 Fallas">
                    {groupedSuggestions.failures.map((failure) => (
                      <SuggestionButton
                        key={failure.id}
                        onClick={() => onSelectSuggestion(failure.searchValue)}
                        label={`"${failure.label}"`}
                        meta={failure.id}
                        metaClassName="font-mono text-purple-600"
                      />
                    ))}
                  </SuggestionSection>
                )}
                {groupedSuggestions.technicians.length > 0 && (
                  <SuggestionSection title="👤 Técnicos" bordered={false}>
                    {groupedSuggestions.technicians.map((tech) => (
                      <SuggestionButton
                        key={tech.name}
                        onClick={() => onSelectSuggestion(tech.name)}
                        label={tech.name}
                        meta={[
                          tech.reported > 0 && `reportó ${tech.reported} ${tech.reported === 1 ? 'falla' : 'fallas'}`,
                          tech.resolved > 0 && `resolvió ${tech.resolved}`
                        ].filter(Boolean).join(' · ')}
                      />
                    ))}
                  </SuggestionSection>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {loadError && (
        <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          <i className="fas fa-exclamation-circle mr-1"></i>
          {loadError}
        </div>
      )}
    </div>
  );
}

function SuggestionSection({ title, children, bordered = true }) {
  return (
    <div className={bordered ? 'border-b border-gray-100' : ''}>
      <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</div>
      {children}
    </div>
  );
}

function SuggestionButton({ onClick, label, meta, metaClassName = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-4 py-2.5 hover:bg-purple-50 flex items-center justify-between gap-3 transition-colors"
    >
      <span className="text-sm text-gray-800 font-medium truncate">{label}</span>
      <span className={`text-xs text-gray-500 shrink-0 ${metaClassName}`}>{meta}</span>
    </button>
  );
}
