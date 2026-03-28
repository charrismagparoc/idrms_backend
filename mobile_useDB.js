// src/hooks/useDB.js  (Mobile App)
// Uses Django REST Framework backend
// Residents: ADD via mobile only. Web can only view/edit.

import { useState, useEffect, useCallback } from 'react';
import { ZONE_COORDS } from '../data/constants';

// Change to your computer's IP when using a physical device
// Android emulator: http://10.0.2.2:8000/api
// Physical device:  http://<your-ip>:8000/api
// Desktop/simulator: http://localhost:8000/api
const API_URL = 'http://10.0.2.2:8000/api';

const now = () => new Date().toISOString();

async function apiCall(endpoint, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_URL}${endpoint}`, opts);
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || `Error ${res.status}`);
  return data;
}

function gps(zone) {
  const b = ZONE_COORDS[zone] || { lat: 8.492, lng: 124.650 };
  return {
    lat: b.lat + (Math.random() - 0.5) * 0.004,
    lng: b.lng + (Math.random() - 0.5) * 0.004,
  };
}

// Normalizers
const ni = r => ({ ...r, dateReported: r.date_reported, createdAt: r.created_at });
const ne = r => ({ ...r, facilitiesAvailable: r.facilities_available || [], contactPerson: r.contact_person });
const nr = r => ({
  ...r,
  householdMembers:  r.household_members || 1,
  evacuationStatus:  r.evacuation_status,
  vulnerabilityTags: r.vulnerability_tags || [],
  addedBy:           r.added_by,
  createdAt:         r.created_at,
  updatedAt:         r.updated_at,
});
const na = r => ({ ...r, userName: r.user_name || 'System', createdAt: r.created_at || now(), urgent: !!r.urgent });

export function useDB() {
  const [incidents,   setI] = useState([]);
  const [alerts,      setA] = useState([]);
  const [evacCenters, setE] = useState([]);
  const [residents,   setR] = useState([]);
  const [resources,   setS] = useState([]);
  const [users,       setU] = useState([]);
  const [activityLog, setL] = useState([]);
  const [loading,     setLoad] = useState(true);

  const reload = useCallback(async () => {
    setLoad(true);
    try {
      const [ri, ra, re, rr, rs, ru, rl] = await Promise.allSettled([
        apiCall('/incidents/'),
        apiCall('/alerts/'),
        apiCall('/evacuation-centers/'),
        apiCall('/residents/'),
        apiCall('/resources/'),
        apiCall('/users/'),
        apiCall('/activity-log/'),
      ]);
      const g = x => x.status === 'fulfilled' ? (Array.isArray(x.value) ? x.value : (x.value?.results || [])) : [];
      setI(g(ri).map(ni));
      setA(g(ra));
      setE(g(re).map(ne));
      setR(g(rr).map(nr));
      setS(g(rs));
      setU(g(ru));
      setL(g(rl).map(na));
    } catch (err) {
      console.warn('Backend error:', err.message);
      setU([{ id: 'local1', name: 'Admin', email: 'admin@kauswagan.gov.ph', role: 'Admin', status: 'Active' }]);
    } finally {
      setLoad(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const log = useCallback((action, type, user, urgent) => {
    setL(p => [{ id: String(Date.now()), action, type, userName: user || 'System', urgent: !!urgent, createdAt: now() }, ...p].slice(0, 150));
    apiCall('/activity-log/', 'POST', { action, type, user_name: user || 'System', urgent: !!urgent }).catch(() => {});
  }, []);

  // ─── AUTH ────────────────────────────────────────────────────────────────
  const loginUser = useCallback(async (email, password) => {
    try {
      const data = await apiCall('/auth/login/', 'POST', { email: email.trim(), password });
      if (data.ok) {
        log(`Signed in: ${data.user.name}`, 'Auth', data.user.name);
        return { ok: true, user: data.user };
      }
      return { ok: false, msg: data.msg || 'Login failed' };
    } catch (err) {
      return { ok: false, msg: 'Cannot connect to server. Check your network.' };
    }
  }, [log]);

  // ─── RESIDENTS (mobile: ADD allowed) ─────────────────────────────────────
  const addResident = useCallback(async (d, user) => {
    const p = gps(d.zone);
    const rec = await apiCall('/residents/', 'POST', {
      name:              d.name,
      zone:              d.zone,
      address:           d.address || '',
      household_members: parseInt(d.householdMembers) || 1,
      contact:           d.contact || '',
      evacuation_status: d.evacuationStatus || 'Safe',
      vulnerability_tags: d.vulnerabilityTags || [],
      notes:             d.notes || '',
      added_by:          user || 'Mobile',
      source:            'mobile',
      lat:               p.lat,
      lng:               p.lng,
    });
    setR(prev => [nr(rec), ...prev]);
    log(`Resident added: ${d.name}`, 'Resident', user);
    return rec;
  }, [log]);

  const updateResident = useCallback(async (id, d, user) => {
    const rec = await apiCall(`/residents/${id}/`, 'PATCH', {
      name:              d.name,
      zone:              d.zone,
      address:           d.address || '',
      household_members: parseInt(d.householdMembers) || 1,
      contact:           d.contact || '',
      evacuation_status: d.evacuationStatus || 'Safe',
      vulnerability_tags: d.vulnerabilityTags || [],
      notes:             d.notes || '',
    });
    setR(prev => prev.map(r => r.id === id ? nr(rec) : r));
    log(`Resident updated: ${d.name}`, 'Resident', user);
  }, [log]);

  const deleteResident = useCallback(async (id, name, user) => {
    await apiCall(`/residents/${id}/`, 'DELETE');
    setR(prev => prev.filter(r => r.id !== id));
    log(`Resident deleted: ${name || ''}`, 'Resident', user, true);
  }, [log]);

  // ─── INCIDENTS ───────────────────────────────────────────────────────────
  const addIncident = useCallback(async (d, user) => {
    const p = gps(d.zone);
    const rec = await apiCall('/incidents/', 'POST', {
      type: d.type, zone: d.zone, location: d.location || '',
      severity: d.severity, status: d.status || 'Pending',
      description: d.description || '', reporter: d.reporter || '',
      source: 'mobile', lat: p.lat, lng: p.lng,
    });
    setI(prev => [ni(rec), ...prev]);
    log(`Incident: ${d.type} in ${d.zone}`, 'Incident', user, d.severity === 'High');
  }, [log]);

  const updateIncident = useCallback(async (id, d, user) => {
    const rec = await apiCall(`/incidents/${id}/`, 'PATCH', d);
    setI(prev => prev.map(r => r.id === id ? ni(rec) : r));
    log('Incident updated', 'Incident', user);
  }, [log]);

  const deleteIncident = useCallback(async (id, label, user) => {
    await apiCall(`/incidents/${id}/`, 'DELETE');
    setI(prev => prev.filter(r => r.id !== id));
    log(`Incident deleted: ${label || ''}`, 'Incident', user, true);
  }, [log]);

  // ─── ALERTS ──────────────────────────────────────────────────────────────
  const addAlert = useCallback(async (d, user) => {
    const rec = await apiCall('/alerts/', 'POST', {
      title:            d.level + ' — ' + d.zone,
      message:          d.message,
      level:            d.level,
      zone:             d.zone,
      sent_by:          user || 'Mobile',
      recipients_count: d.recipients_count || 0,
    });
    setA(prev => [rec, ...prev]);
    log(`${d.level} alert to ${d.zone}`, 'Alert', user, d.level === 'Danger');
  }, [log]);

  const deleteAlert = useCallback(async (id, user) => {
    await apiCall(`/alerts/${id}/`, 'DELETE');
    setA(prev => prev.filter(r => r.id !== id));
    log('Alert deleted', 'Alert', user);
  }, [log]);

  // ─── EVAC ────────────────────────────────────────────────────────────────
  const addEvac = useCallback(async (d, user) => {
    const p = gps(d.zone);
    const rec = await apiCall('/evacuation-centers/', 'POST', { ...d, lat: p.lat, lng: p.lng });
    setE(prev => [...prev, ne(rec)]);
    log(`Evac center added: ${d.name}`, 'Evacuation', user);
  }, [log]);

  const updateEvac = useCallback(async (id, d, user) => {
    const rec = await apiCall(`/evacuation-centers/${id}/`, 'PATCH', d);
    setE(prev => prev.map(r => r.id === id ? ne(rec) : r));
    log(`Evac updated: ${d.name}`, 'Evacuation', user);
  }, [log]);

  const deleteEvac = useCallback(async (id, name, user) => {
    await apiCall(`/evacuation-centers/${id}/`, 'DELETE');
    setE(prev => prev.filter(r => r.id !== id));
    log(`Evac deleted: ${name || ''}`, 'Evacuation', user, true);
  }, [log]);

  // ─── RESOURCES ───────────────────────────────────────────────────────────
  const addResource = useCallback(async (d, user) => {
    const rec = await apiCall('/resources/', 'POST', d);
    setS(prev => [...prev, rec]);
    log(`Resource added: ${d.name}`, 'Resource', user);
  }, [log]);

  const updateResource = useCallback(async (id, d, user) => {
    const rec = await apiCall(`/resources/${id}/`, 'PATCH', d);
    setS(prev => prev.map(r => r.id === id ? rec : r));
    log(`Resource updated: ${d.name || ''}`, 'Resource', user);
  }, [log]);

  const deleteResource = useCallback(async (id, name, user) => {
    await apiCall(`/resources/${id}/`, 'DELETE');
    setS(prev => prev.filter(r => r.id !== id));
    log(`Resource deleted: ${name || ''}`, 'Resource', user, true);
  }, [log]);

  // ─── USERS ───────────────────────────────────────────────────────────────
  const addUser = useCallback(async (d) => {
    const rec = await apiCall('/users/', 'POST', d);
    setU(prev => [...prev, rec]);
  }, []);

  const updateUser = useCallback(async (id, d) => {
    const payload = { name: d.name, email: d.email, role: d.role, status: d.status };
    if (d.password) payload.password = d.password;
    const rec = await apiCall(`/users/${id}/`, 'PATCH', payload);
    setU(prev => prev.map(r => r.id === id ? rec : r));
  }, []);

  const deleteUser = useCallback(async (id) => {
    await apiCall(`/users/${id}/`, 'DELETE');
    setU(prev => prev.filter(r => r.id !== id));
  }, []);

  return {
    loading, reload,
    incidents, alerts, evacCenters, residents, resources, users, activityLog,
    loginUser,
    addIncident, updateIncident, deleteIncident,
    addAlert, deleteAlert,
    addEvac, updateEvac, deleteEvac,
    addResident, updateResident, deleteResident,
    addResource, updateResource, deleteResource,
    addUser, updateUser, deleteUser,
  };
}
