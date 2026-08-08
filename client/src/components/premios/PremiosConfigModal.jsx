'use client'

import React, { useState, useEffect, useCallback } from 'react'
import axiosInstance from '../../utils/axiosConfig'
import Swal from 'sweetalert2'

export default function PremiosConfigModal({ checklistTypeId, onClose }) {
  const [sections, setSections] = useState([])
  const [configs, setConfigs] = useState({})
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [parentRes, configRes] = await Promise.all([
        axiosInstance.get(`/api/checklists/type/${checklistTypeId}/parent-items`),
        axiosInstance.get(`/api/checklists/type/${checklistTypeId}/premios-config`),
      ])

      const sectionList = (parentRes.data.data || parentRes.data || []).map((p) => ({
        key: p.question_text,
        item_number: p.item_number,
      }))

      const configMap = {}
      for (const c of configRes.data.data || []) {
        configMap[c.section_key] = c
      }

      setSections(sectionList)
      setConfigs(configMap)
      setForm(null)
    } catch (err) {
      Swal.fire({
        title: 'Error',
        text: err.response?.data?.error || 'No se pudieron cargar las configuraciones',
        icon: 'error',
        confirmButtonText: 'Entendido',
      })
    } finally {
      setLoading(false)
    }
  }, [checklistTypeId])

  useEffect(() => {
    load()
  }, [load])

  const startEdit = (sectionKey) => {
    const existing = configs[sectionKey] || {}
    setForm({
      section_key: sectionKey,
      ratio_premios: existing.ratio_premios ?? '',
      precio_juego: existing.precio_juego ?? '',
      tipo_premio: existing.tipo_premio ?? '',
      activo: existing.activo !== false,
    })
  }

  const handleSave = async () => {
    if (!form) return
    const ratio = Number(form.ratio_premios)
    if (!form.ratio_premios || !(ratio > 0)) {
      Swal.fire({
        title: 'Dato requerido',
        text: 'El ratio "1 premio cada N jugadas" debe ser un número mayor a 0.',
        icon: 'warning',
        confirmButtonText: 'Entendido',
      })
      return
    }

    setSaving(true)
    try {
      await axiosInstance.post(`/api/checklists/type/${checklistTypeId}/premios-config`, {
        section_key: form.section_key,
        ratio_premios: ratio,
        precio_juego: form.precio_juego ? Number(form.precio_juego) : null,
        tipo_premio: form.tipo_premio || null,
        activo: form.activo,
      })
      Swal.fire({
        title: 'Guardado',
        text: 'Configuración guardada correctamente.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      })
      setForm(null)
      await load()
    } catch (err) {
      Swal.fire({
        title: 'Error',
        text: err.response?.data?.error || 'No se pudo guardar la configuración',
        icon: 'error',
        confirmButtonText: 'Entendido',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center p-4">
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl">
        <div className="p-5 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Configuración de máquinas</h3>
            <p className="text-sm text-gray-500">
              Define el ratio maestro (1 premio cada N jugadas) que usa el sistema para calcular la eficiencia.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <p className="text-center text-gray-500 py-8">Cargando...</p>
          ) : sections.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No se encontraron bloques/secciones en el checklist. Completa primero el template.
            </p>
          ) : (
            <div className="space-y-3">
              {sections.map((s) => {
                const cfg = configs[s.key]
                const editing = form?.section_key === s.key
                return (
                  <div key={s.key} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-800">
                          <span className="text-gray-400 mr-1">{s.item_number}.</span>
                          {s.key}
                        </p>
                        <p className="text-xs text-gray-500">
                          {cfg
                            ? `Ratio: 1 premio cada ${cfg.ratio_premios} jugadas · ${cfg.activo ? 'Activo' : 'Inactivo'}`
                            : 'Sin configurar — la eficiencia aparecerá como "Sin config"'}
                        </p>
                      </div>
                      <button
                        onClick={() => (editing ? setForm(null) : startEdit(s.key))}
                        className="px-3 py-1.5 text-sm font-medium border rounded-md text-indigo-600 border-indigo-200 hover:bg-indigo-50 whitespace-nowrap"
                      >
                        {editing ? 'Cancelar' : cfg ? 'Editar' : 'Configurar'}
                      </button>
                    </div>

                    {editing && (
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            1 premio cada N jugadas *
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={form.ratio_premios}
                            onChange={(e) => setForm({ ...form, ratio_premios: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Ej: 15"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Precio del juego</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.precio_juego}
                            onChange={(e) => setForm({ ...form, precio_juego: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Ej: 1000"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de premio</label>
                          <input
                            type="text"
                            value={form.tipo_premio}
                            onChange={(e) => setForm({ ...form, tipo_premio: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Ej: Muñeco"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Activo</label>
                          <button
                            onClick={() => setForm({ ...form, activo: !form.activo })}
                            className={`w-full px-3 py-2 text-sm rounded-md font-medium transition-colors ${form.activo ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-gray-200 text-gray-500 border border-gray-300'}`}
                          >
                            {form.activo ? 'Sí' : 'No'}
                          </button>
                        </div>
                        <div className="md:col-span-4">
                          <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-md hover:bg-green-700 disabled:opacity-50"
                          >
                            {saving ? 'Guardando...' : 'Guardar configuración'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
