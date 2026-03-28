// src/hooks/useLocalData.js
// Updated to use Django REST Framework backend instead of Supabase

import { useState, useEffect, useCallback } from 'react'

const API_URL = 'http://localhost:8000/api'

const now = () => new Date().toISOString()

async function api(endpoint, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${API_URL}${endpoint}`, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `API error ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

// Field name normalizers (Django snake_case → camelCase)
const ni = r => ({ ...r, dateReported: r.date_reported, createdAt: r.created_at })
const ne = r => ({ ...r, facilitiesAvailable: r.facilities_available || [], contactPerson: r.contact_person })
const nr = r => ({
  ...r,
  householdMembers:  r.household_members || 1,
  evacuationStatus:  r.evacuation_status,
  vulnerabilityTags: r.vulnerability_tags || [],
  addedBy:           r.added_by,
  createdAt:         r.created_at,
  updatedAt:         r.updated_at,
})
const na = r => ({ ...r, userName: r.user_name || 'System', createdAt: r.created_at || now(), urgent: !!r.urgent })

export function useLocalData() {
  const [incidents,    setI] = useState([])
  const [alerts,       setA] = useState([])
  const [evacCenters,  setE] = useState([])
  const [residents,    setR] = useState([])
  const [resources,    setS] = useState([])
  const [users,        setU] = useState([])
  const [activityLog,  setL] = useState([])
  const [loading,      setLoad] = useState(true)

  const refresh = useCallback(async () => {
    setLoad(true)
    try {
      const [ri, ra, re, rr, rs, ru, rl] = await Promise.allSettled([
        api('/incidents/'),
        api('/alerts/'),
        api('/evacuation-centers/'),
        api('/residents/'),
        api('/resources/'),
        api('/users/'),
        api('/activity-log/'),
      ])
      const g = x => x.status === 'fulfilled' ? (Array.isArray(x.value) ? x.value : (x.value?.results || [])) : []
      setI(g(ri).map(ni))
      setA(g(ra))
      setE(g(re).map(ne))
      setR(g(rr).map(nr))
      setS(g(rs))
      setU(g(ru))
      setL(g(rl).map(na))
    } catch (err) {
      console.warn('Backend load error:', err.message)
    } finally {
      setLoad(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const logAction = async (action, type, userName = 'System', urgent = false) => {
    const entry = { action, type, user_name: userName, urgent }
    setL(p => [na({ ...entry, id: String(Date.now()), created_at: now() }), ...p].slice(0, 200))
    await api('/activity-log/', 'POST', entry).catch(() => {})
  }

  // ─── AUTH ──────────────────────────────────────────────────────────────────
  const loginUser = async (email, password) => {
    try {
      const data = await api('/auth/login/', 'POST', { email, password })
      return { success: data.ok, user: data.user, error: data.msg }
    } catch (e) {
      return { success: false, error: 'Cannot connect to server.' }
    }
  }

  // ─── INCIDENTS ─────────────────────────────────────────────────────────────
  const addIncident = async (d, userName) => {
    const rec = await api('/incidents/', 'POST', {
      type: d.type, zone: d.zone, location: d.location || '',
      severity: d.severity, status: d.status || 'Pending',
      description: d.description || '', reporter: d.reporter || '',
      source: 'web',
    })
    setI(p => [ni(rec), ...p])
    await logAction(`${d.type} incident reported in ${d.zone}`, 'Incident', userName, d.severity === 'High')
  }

  const updateIncident = async (id, d, userName) => {
    const rec = await api(`/incidents/${id}/`, 'PATCH', d)
    setI(p => p.map(r => r.id === id ? ni(rec) : r))
    await logAction(`Incident updated`, 'Incident', userName)
  }

  const deleteIncident = async (id, userName) => {
    await api(`/incidents/${id}/`, 'DELETE')
    setI(p => p.filter(r => r.id !== id))
    await logAction(`Incident deleted`, 'Incident', userName, true)
  }

  // ─── ALERTS ────────────────────────────────────────────────────────────────
  const addAlert = async (d, userName) => {
    const rec = await api('/alerts/', 'POST', {
      title:            d.title || `${d.level} — ${d.zone}`,
      message:          d.message,
      level:            d.level,
      zone:             d.zone,
      channel:          d.channel || 'Web',
      sent_by:          userName || 'Admin',
      recipients_count: d.recipients_count || 0,
    })
    setA(p => [rec, ...p])
    await logAction(`${d.level} alert sent to ${d.zone}`, 'Alert', userName, d.level === 'Danger')
  }

  const deleteAlert = async (id, userName) => {
    await api(`/alerts/${id}/`, 'DELETE')
    setA(p => p.filter(r => r.id !== id))
    await logAction('Alert deleted', 'Alert', userName)
  }

  // ─── EVAC CENTERS ──────────────────────────────────────────────────────────
  const addEvacCenter = async (d, userName) => {
    const rec = await api('/evacuation-centers/', 'POST', {
      name: d.name, zone: d.zone, address: d.address || '',
      capacity: d.capacity || 0, occupancy: d.occupancy || 0,
      status: d.status || 'Open',
      facilities_available: d.facilitiesAvailable || [],
      contact_person: d.contactPerson || '', contact: d.contact || '',
      lat: d.lat, lng: d.lng,
    })
    setE(p => [...p, ne(rec)])
    await logAction(`Evac center added: ${d.name}`, 'Evacuation', userName)
  }

  const updateEvacCenter = async (id, d, userName) => {
    const payload = {
      name: d.name, zone: d.zone, address: d.address || '',
      capacity: d.capacity || 0, occupancy: d.occupancy || 0,
      status: d.status || 'Open',
      facilities_available: d.facilitiesAvailable || d.facilities_available || [],
      contact_person: d.contactPerson || d.contact_person || '',
      contact: d.contact || '',
    }
    const rec = await api(`/evacuation-centers/${id}/`, 'PATCH', payload)
    setE(p => p.map(r => r.id === id ? ne(rec) : r))
    await logAction(`Evac center updated: ${d.name}`, 'Evacuation', userName)
  }

  const deleteEvacCenter = async (id, userName) => {
    await api(`/evacuation-centers/${id}/`, 'DELETE')
    setE(p => p.filter(r => r.id !== id))
    await logAction('Evac center deleted', 'Evacuation', userName, true)
  }

  // ─── RESIDENTS (web: view + edit only, no add) ─────────────────────────────
  const updateResident = async (id, d, userName) => {
    const payload = {
      name:              d.name,
      zone:              d.zone,
      address:           d.address || '',
      household_members: parseInt(d.household_members || d.householdMembers) || 1,
      contact:           d.contact || '',
      evacuation_status: d.evacuation_status || d.evacuationStatus || 'Safe',
      vulnerability_tags: d.vulnerability_tags || d.vulnerabilityTags || [],
      notes:             d.notes || '',
    }
    const rec = await api(`/residents/${id}/`, 'PATCH', payload)
    setR(p => p.map(r => r.id === id ? nr(rec) : r))
    await logAction(`Resident updated: ${d.name}`, 'Resident', userName)
  }

  const deleteResident = async (id, userName) => {
    await api(`/residents/${id}/`, 'DELETE')
    setR(p => p.filter(r => r.id !== id))
    await logAction('Resident deleted', 'Resident', userName, true)
  }

  // ─── RESOURCES ─────────────────────────────────────────────────────────────
  const addResource = async (d, userName) => {
    const rec = await api('/resources/', 'POST', {
      name: d.name, category: d.category,
      quantity: parseInt(d.quantity) || 0,
      available: parseInt(d.available) || 0,
      unit: d.unit || 'pcs', status: d.status || 'Available',
      location: d.location || '', notes: d.notes || '',
    })
    setS(p => [...p, rec])
    await logAction(`Resource added: ${d.name}`, 'Resource', userName)
  }

  const updateResource = async (id, d, userName) => {
    const rec = await api(`/resources/${id}/`, 'PATCH', {
      name: d.name, category: d.category,
      quantity: parseInt(d.quantity) || 0,
      available: parseInt(d.available) || 0,
      unit: d.unit || 'pcs', status: d.status || 'Available',
      location: d.location || '', notes: d.notes || '',
    })
    setS(p => p.map(r => r.id === id ? rec : r))
    await logAction(`Resource updated: ${d.name}`, 'Resource', userName)
  }

  const deleteResource = async (id, userName) => {
    await api(`/resources/${id}/`, 'DELETE')
    setS(p => p.filter(r => r.id !== id))
    await logAction('Resource deleted', 'Resource', userName, true)
  }

  // ─── USERS ─────────────────────────────────────────────────────────────────
  const addUser = async (d) => {
    const rec = await api('/users/', 'POST', {
      name: d.name, email: d.email, password: d.password,
      role: d.role || 'Staff', status: d.status || 'Active',
    })
    setU(p => [...p, rec])
    await logAction(`User added: ${d.name}`, 'User')
  }

  const updateUser = async (id, d) => {
    const payload = { name: d.name, email: d.email, role: d.role, status: d.status }
    if (d.password) payload.password = d.password
    const rec = await api(`/users/${id}/`, 'PATCH', payload)
    setU(p => p.map(r => r.id === id ? rec : r))
    await logAction(`User updated: ${d.name}`, 'User')
  }

  const deleteUser = async (id) => {
    await api(`/users/${id}/`, 'DELETE')
    setU(p => p.filter(r => r.id !== id))
    await logAction('User deleted', 'User', 'Admin', true)
  }

  return {
    loading, refresh,
    incidents, alerts, evacCenters, residents, resources, users, activityLog,
    loginUser,
    addIncident, updateIncident, deleteIncident,
    addAlert, deleteAlert,
    addEvacCenter, updateEvacCenter, deleteEvacCenter,
    updateResident, deleteResident,           // ← web cannot addResident
    addResource, updateResource, deleteResource,
    addUser, updateUser, deleteUser,
  }
}
