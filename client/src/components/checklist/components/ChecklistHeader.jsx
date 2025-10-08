'use client'

import React from 'react'

export default function ChecklistHeader({ pageTitle, breadcrumbItems = [] }) {
  return (
    <div className="mb-6">
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
  )
}