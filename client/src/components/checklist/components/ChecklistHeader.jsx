'use client'

import React from 'react'

export default function ChecklistHeader({ pageTitle, breadcrumbItems = [], user = null }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{pageTitle}</h1>
          <nav className="text-sm text-gray-500 mt-2">
            {breadcrumbItems.map((item, index) => (
              <span key={index}>
                {index > 0 && <span className="mx-2">/</span>}
                {item.href ? (
                  <a href={item.href} className="hover:text-gray-700">
                    {item.label}
                  </a>
                ) : (
                  <span>{item.label}</span>
                )}
              </span>
            ))}
          </nav>
        </div>
        
        {/* Indicador de sesión activa */}
        {user && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl px-4 py-3 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {user.user_name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                  Sesión Activa
                </span>
                <span className="text-sm font-bold text-gray-800">
                  {user.user_name || 'Usuario'}
                </span>
                {user.role_name && (
                  <span className="text-xs text-gray-500">
                    {user.role_name}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}