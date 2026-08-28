import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  MapPin, 
  Shield, 
  Bell, 
  Sparkles, 
  X, 
  Check, 
  Trash2, 
  Edit3,
  CalendarCheck,
  Info,
  Layers,
  ChevronDown
} from 'lucide-react';

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PRIORITY_ORDER = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };

export default function CalendarModal({ 
  isOpen, 
  onClose, 
  currentDivision = 'Bengaluru', 
  onTriggerAdvisory,
  initialSelectedEventId = null 
}) {
  const [activeTab, setActiveTab] = useState('official'); // 'official' | 'operational'
  
  // ── DYNAMIC TODAY'S LOCAL DATE ──
  const [currentDate, setCurrentDate] = useState(() => new Date());
  
  // ── ACTIVE MONTH (0 = Jan 2026, 11 = Dec 2026) ──
  // Initialize to current month if in 2026, or default to current date's month (e.g. August = 7)
  const [activeMonth, setActiveMonth] = useState(() => {
    const now = new Date();
    return now.getFullYear() === 2026 ? now.getMonth() : 7; // August (index 7) for 2026
  });

  const [events, setEvents] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDivision, setSelectedDivision] = useState(currentDivision || 'Bengaluru');
  
  // Modal & View States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedEventDetails, setSelectedEventDetails] = useState(null);
  const [dayDetailsDate, setDayDetailsDate] = useState(null); // When clicking +N more on a date
  const [advisoryLoading, setAdvisoryLoading] = useState(false);
  const [advisoryData, setAdvisoryData] = useState(null);
  const [viewMode, setViewMode] = useState('Month View'); // 'Month View' | 'List View'
  const [showViewDropdown, setShowViewDropdown] = useState(false);

  const [formData, setFormData] = useState({
    EventName: '',
    EventType: 'MEETING',
    EventDate: '2026-08-27',
    StartDateTime: '2026-08-27 10:00:00',
    EndDateTime: '2026-08-27 13:00:00',
    Scope: 'DIVISION',
    Division: currentDivision || 'Bengaluru',
    Location: `${currentDivision || 'Bengaluru'} Police Headquarters`,
    Description: '',
    ReminderDays: 2,
    PatrolPriority: 'HIGH',
    RecommendedAction: 'Deploy standard division patrol pickets.'
  });

  const divisions = ['Bengaluru', 'Mysuru', 'Belagavi', 'Kalaburagi', 'State HQ'];

  // ── AUTOMATIC LOCAL DATE REFRESH (MIDNIGHT UPDATE) ──
  useEffect(() => {
    const updateTodayDate = () => {
      const now = new Date();
      setCurrentDate(prev => {
        if (
          prev.getDate() !== now.getDate() ||
          prev.getMonth() !== now.getMonth() ||
          prev.getFullYear() !== now.getFullYear()
        ) {
          return now;
        }
        return prev;
      });
    };

    // Check every 30 seconds for date rollover across midnight
    const interval = setInterval(updateTodayDate, 30000);
    return () => clearInterval(interval);
  }, []);

  // ── SELECT INITIAL EVENT IF TRIGGERED FROM NOTIFICATION ──
  useEffect(() => {
    if (initialSelectedEventId && events.length > 0) {
      const found = events.find(e => String(e.ROWID) === String(initialSelectedEventId) || e.EventName === initialSelectedEventId);
      if (found) {
        setSelectedEventDetails(found);
        if (found.Scope === 'COMMON') {
          setActiveTab('official');
        } else {
          setActiveTab('operational');
        }
        if (found.EventDate) {
          const parts = found.EventDate.split('-');
          if (parts.length === 3 && parts[0] === '2026') {
            const m = parseInt(parts[1], 10) - 1;
            if (m >= 0 && m <= 11) {
              setActiveMonth(m);
            }
          }
        }
      }
    }
  }, [initialSelectedEventId, events]);

  // ── LIVE EVENT SYNCHRONIZATION (FROM CHATBOT) ──
  useEffect(() => {
    const handleRemoteEventCreated = () => {
      fetchCalendarData(selectedDivision);
    };
    window.addEventListener('ksp_calendar_event_created', handleRemoteEventCreated);
    return () => window.removeEventListener('ksp_calendar_event_created', handleRemoteEventCreated);
  }, [selectedDivision]);

  // ── INITIAL LOAD ON OPEN ──
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      setCurrentDate(now);
      const initialMonth = now.getFullYear() === 2026 ? now.getMonth() : 7; // Aug 2026 default
      setActiveMonth(initialMonth);
      setSelectedDivision(currentDivision || 'Bengaluru');
      fetchCalendarData(currentDivision || 'Bengaluru');
    }
  }, [isOpen, currentDivision]);

  const fetchCalendarData = async (division) => {
    setLoading(true);
    try {
      // 1. Fetch division-scoped events (COMMON + division's DIVISION events)
      const evRes = await fetch(`/api/calendar/events?division=${encodeURIComponent(division)}`);
      const evData = await evRes.json();
      if (evData.success) {
        setEvents(evData.events || []);
      }

      // 2. Fetch active 2-day reminders
      const remRes = await fetch(`/api/calendar/reminders?division=${encodeURIComponent(division)}`);
      const remData = await remRes.json();
      if (remData.success) {
        setReminders(remData.reminders || []);
      }
    } catch (err) {
      console.error('Error fetching calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDivisionChange = (div) => {
    setSelectedDivision(div);
    fetchCalendarData(div);
  };

  // ── 2026 MONTH NAVIGATION RESTRICTIONS ──
  const handlePrevMonth = () => {
    if (activeMonth > 0) {
      setActiveMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (activeMonth < 11) {
      setActiveMonth(prev => prev + 1);
    }
  };

  const handleGoToToday = () => {
    const now = new Date();
    const todayMonth = now.getFullYear() === 2026 ? now.getMonth() : 7;
    setActiveMonth(todayMonth);
    setCurrentDate(now);
  };

  const handleOpenCreateForDate = (dateStr) => {
    setEditingEvent(null);
    setFormData({
      EventName: '',
      EventType: 'MEETING',
      EventDate: dateStr,
      StartDateTime: `${dateStr} 10:00:00`,
      EndDateTime: `${dateStr} 13:00:00`,
      Scope: 'DIVISION',
      Division: selectedDivision,
      Location: `${selectedDivision} Police Headquarters`,
      Description: '',
      ReminderDays: 2,
      PatrolPriority: 'HIGH',
      RecommendedAction: 'Deploy division patrol units.'
    });
    setShowCreateModal(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        division: selectedDivision
      };

      let res;
      if (editingEvent) {
        res = await fetch(`/api/calendar/events/${editingEvent.ROWID}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`/api/calendar/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        fetchCalendarData(selectedDivision);
      } else {
        alert(`Error: ${data.error || 'Failed to save event'}`);
      }
    } catch (err) {
      console.error('Error saving event:', err);
      alert('Network error while saving event.');
    }
  };

  const handleDeleteEvent = async (id, eventName) => {
    if (!window.confirm(`Are you sure you want to delete '${eventName}'?`)) return;
    try {
      const res = await fetch(`/api/calendar/events/${id}?division=${encodeURIComponent(selectedDivision)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setSelectedEventDetails(null);
        setDayDetailsDate(null);
        fetchCalendarData(selectedDivision);
      } else {
        alert(`Error: ${data.error || 'Failed to delete event'}`);
      }
    } catch (err) {
      console.error('Error deleting event:', err);
    }
  };

  const handleGenerateAdvisory = async (eventName) => {
    setAdvisoryLoading(true);
    try {
      const res = await fetch(`/api/calendar/advisory?event=${encodeURIComponent(eventName)}&division=${encodeURIComponent(selectedDivision)}`);
      const data = await res.json();
      if (data.success && data.advisory) {
        setAdvisoryData(data.advisory);
      }
    } catch (err) {
      console.error('Error generating advisory:', err);
    } finally {
      setAdvisoryLoading(false);
    }
  };

  if (!isOpen) return null;

  // ── LOCAL DATE EXTRACTION ──
  const curYear = currentDate.getFullYear();
  const curMonth = currentDate.getMonth();
  const curDay = currentDate.getDate();

  // ── 2026 CALENDAR FILTER (STRICTLY CURRENT YEAR 2026) ──
  const valid2026Events = events.filter(e => {
    if (!e || !e.EventDate) return false;
    const yrStr = e.EventDate.slice(0, 4);
    return yrStr === '2026';
  });

  // Tab filter: Official (COMMON) vs Operational (DIVISION)
  const tabEvents = valid2026Events.filter(e => {
    if (activeTab === 'official') return e.Scope === 'COMMON';
    return e.Scope === 'DIVISION';
  });

  // ── MONTH GRID MATRIX CALCULATION FOR 2026 ──
  const year = 2026;
  const month = activeMonth;
  const currentMonthName = MONTH_NAMES[month];

  const firstDayOfWeekIndex = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon ...
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const calendarGrid = [];

  // 1. Previous month trailing days
  for (let i = firstDayOfWeekIndex - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const prevM = month === 0 ? 11 : month - 1;
    const prevY = month === 0 ? year - 1 : year;
    const dateStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarGrid.push({
      day: d,
      dateStr,
      isCurrentMonth: false,
      isSunday: (calendarGrid.length % 7) === 0
    });
  }

  // 2. Current month days in 2026
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayOfWeek = calendarGrid.length % 7;
    const isToday = (curYear === 2026 && curMonth === month && curDay === d);
    calendarGrid.push({
      day: d,
      dateStr,
      isCurrentMonth: true,
      isSunday: dayOfWeek === 0,
      isToday
    });
  }

  // 3. Next month trailing days to complete 35 or 42 grid cells
  const totalSlots = calendarGrid.length > 35 ? 42 : 35;
  const trailingDaysCount = totalSlots - calendarGrid.length;
  for (let d = 1; d <= trailingDaysCount; d++) {
    const nextM = month === 11 ? 0 : month + 1;
    const nextY = month === 11 ? year + 1 : year;
    const dateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarGrid.push({
      day: d,
      dateStr,
      isCurrentMonth: false,
      isSunday: (calendarGrid.length % 7) === 0
    });
  }

  // Helper for event pill styling
  const getEventPillStyle = (ev) => {
    if (ev.Scope === 'COMMON') {
      if (ev.EventType === 'GOVERNMENT_EVENT' || ev.EventType === 'HOLIDAY') {
        return {
          bg: '#f0fdf4',
          color: '#166534',
          border: '1px solid #bbf7d0',
          dot: '#22c55e',
          badgeText: 'RESTRICTED'
        };
      }
      return {
        bg: '#fef3c7',
        color: '#92400e',
        border: '1px solid #fde68a',
        dot: '#f59e0b',
        badgeText: 'GAZETTED'
      };
    } else {
      if (ev.EventType === 'VIP_VISIT') {
        return {
          bg: '#faf5ff',
          color: '#6b21a8',
          border: '1px solid #e9d5ff',
          dot: '#a855f7',
          badgeText: 'VIP VISIT'
        };
      }
      return {
        bg: '#eff6ff',
        color: '#1e40af',
        border: '1px solid #bfdbfe',
        dot: '#3b82f6',
        badgeText: 'OPERATIONAL'
      };
    }
  };

  const getPriorityBadgeStyle = (priority) => {
    switch (priority) {
      case 'CRITICAL':
        return { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5', icon: '🔴' };
      case 'HIGH':
        return { bg: '#ffedd5', text: '#c2410c', border: '#fdba74', icon: '🟠' };
      case 'MEDIUM':
        return { bg: '#fef9c3', text: '#854d0e', border: '#fde047', icon: '🟡' };
      default:
        return { bg: '#dcfce7', text: '#15803d', border: '#86efac', icon: '🟢' };
    }
  };

  // ── UPCOMING EVENTS LIST (CALCULATED DYNAMICALLY FOR 2026) ──
  const nowStr = `${curYear}-${String(curMonth + 1).padStart(2, '0')}-${String(curDay).padStart(2, '0')}`;
  const upcomingEvents = [...valid2026Events]
    .filter(ev => (ev.EventDate || '') >= nowStr)
    .sort((a, b) => (a.EventDate || '').localeCompare(b.EventDate || ''))
    .slice(0, 5);

  // If near end of year or no events ahead, show next nearest events
  const displayUpcoming = upcomingEvents.length > 0
    ? upcomingEvents
    : [...valid2026Events].sort((a, b) => (a.EventDate || '').localeCompare(b.EventDate || '')).slice(0, 4);

  // Calculate dynamic days remaining from today
  const calculateDaysRemainingText = (eventDateStr) => {
    if (!eventDateStr) return '';
    const evY = parseInt(eventDateStr.slice(0, 4), 10);
    const evM = parseInt(eventDateStr.slice(5, 7), 10) - 1;
    const evD = parseInt(eventDateStr.slice(8, 10), 10);

    const evDateObj = new Date(evY, evM, evD);
    const todayObj = new Date(curYear, curMonth, curDay);

    const diffTime = evDateObj.getTime() - todayObj.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === 2) return 'In 2 days';
    if (diffDays > 2) return `In ${diffDays} days`;
    return `${Math.abs(diffDays)} days ago`;
  };

  // ── IMPORTANT COMMON KARNATAKA EVENTS FOR 2026 (AUTHORITATIVE FROM CATALYST) ──
  const importantKarnatakaEvents = valid2026Events
    .filter(e => e.Scope === 'COMMON')
    .sort((a, b) => (a.EventDate || '').localeCompare(b.EventDate || ''));

  // Today's events
  const todaysEvents = valid2026Events.filter(e => e.EventDate === nowStr);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.70)',
      backdropFilter: 'blur(6px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '1240px',
        maxHeight: '94vh',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid #e2e8f0'
      }}>
        
        {/* ── 1. TOP HEADER / TABS (OFFICIAL VS OPERATIONAL) ── */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#ffffff'
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setActiveTab('official')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 18px',
                borderRadius: '10px',
                border: activeTab === 'official' ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                background: activeTab === 'official' ? '#eff6ff' : '#ffffff',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: activeTab === 'official' ? '0 2px 4px rgba(37, 99, 235, 0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{
                background: activeTab === 'official' ? '#2563eb' : '#f1f5f9',
                color: activeTab === 'official' ? '#ffffff' : '#64748b',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem'
              }}>
                🏛️
              </div>
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: activeTab === 'official' ? '#1d4ed8' : '#1e293b' }}>
                  Official Karnataka Calendar
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>
                  Govt. Gazetted Holidays & Festivals (2026)
                </div>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('operational')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 18px',
                borderRadius: '10px',
                border: activeTab === 'operational' ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                background: activeTab === 'operational' ? '#eff6ff' : '#ffffff',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: activeTab === 'operational' ? '0 2px 4px rgba(37, 99, 235, 0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{
                background: activeTab === 'operational' ? '#2563eb' : '#f1f5f9',
                color: activeTab === 'operational' ? '#ffffff' : '#64748b',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem'
              }}>
                🛡️
              </div>
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: activeTab === 'operational' ? '#1d4ed8' : '#1e293b' }}>
                  Police Operational Events
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>
                  {selectedDivision} Division Meetings & Security
                </div>
              </div>
            </button>
          </div>

          {/* Right Header Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => handleOpenCreateForDate(nowStr)}
              style={{
                background: '#ffffff',
                border: '1.5px solid #2563eb',
                color: '#2563eb',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.08)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#2563eb';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.color = '#2563eb';
              }}
            >
              <Plus size={16} /> Add Operational Event
            </button>

            <button
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                border: 'none',
                color: '#64748b',
                padding: '6px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Close Calendar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── 2. MAIN BODY (LEFT 2026 CALENDAR + RIGHT SIDEBAR) ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 315px',
          flex: 1,
          overflowY: 'auto',
          background: '#f8fafc'
        }}>
          
          {/* ── LEFT COLUMN: 2026 MONTH VIEW & IMPORTANT KARNATAKA EVENTS ── */}
          <div style={{
            padding: '20px 24px',
            borderRight: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            background: '#ffffff'
          }}>
            
            {/* MONTH HEADER TOOLBAR (2026 FIXED, MONTH NAVIGATION JAN-DEC) */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <h2 style={{
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  margin: 0,
                  letterSpacing: '-0.02em'
                }}>
                  {currentMonthName} 2026
                </h2>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: '#2563eb',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}>
                  YEAR 2026
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Today button */}
                <button
                  onClick={handleGoToToday}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '5px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#334155',
                    cursor: 'pointer'
                  }}
                  title="Jump to Today's Month in 2026"
                >
                  Today
                </button>

                {/* Previous / Next Month Navigation within 2026 */}
                <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', background: '#ffffff' }}>
                  <button
                    onClick={handlePrevMonth}
                    disabled={activeMonth === 0}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      padding: '5px 10px',
                      cursor: activeMonth === 0 ? 'not-allowed' : 'pointer',
                      color: activeMonth === 0 ? '#cbd5e1' : '#475569',
                      borderRight: '1px solid #cbd5e1'
                    }}
                    title={activeMonth === 0 ? "Cannot navigate before January 2026" : "Previous Month"}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  <button
                    onClick={handleNextMonth}
                    disabled={activeMonth === 11}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      padding: '5px 10px',
                      cursor: activeMonth === 11 ? 'not-allowed' : 'pointer',
                      color: activeMonth === 11 ? '#cbd5e1' : '#475569'
                    }}
                    title={activeMonth === 11 ? "Cannot navigate past December 2026" : "Next Month"}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* View Dropdown (Month View / List View) */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowViewDropdown(!showViewDropdown)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '5px 10px',
                      fontSize: '0.78rem',
                      color: '#334155',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <CalendarIcon size={14} color="#64748b" />
                    <span>{viewMode}</span>
                    <ChevronDown size={13} color="#64748b" />
                  </button>

                  {showViewDropdown && (
                    <div style={{
                      position: 'absolute',
                      right: 0,
                      top: '100%',
                      marginTop: '4px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                      zIndex: 10,
                      minWidth: '130px',
                      overflow: 'hidden'
                    }}>
                      <button
                        onClick={() => { setViewMode('Month View'); setShowViewDropdown(false); }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 12px',
                          border: 'none',
                          background: viewMode === 'Month View' ? '#eff6ff' : 'transparent',
                          color: viewMode === 'Month View' ? '#2563eb' : '#334155',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Month View
                      </button>
                      <button
                        onClick={() => { setViewMode('List View'); setShowViewDropdown(false); }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 12px',
                          border: 'none',
                          background: viewMode === 'List View' ? '#eff6ff' : 'transparent',
                          color: viewMode === 'List View' ? '#2563eb' : '#334155',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        List View
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── 3. MONTHLY CALENDAR GRID OR LIST VIEW ── */}
            {viewMode === 'Month View' ? (
              <div style={{
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                overflow: 'hidden',
                background: '#ffffff'
              }}>
                {/* Weekday Row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  borderBottom: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  textAlign: 'center',
                  padding: '8px 0',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}>
                  {WEEKDAY_NAMES.map((name, i) => (
                    <div key={i} style={{ color: i === 0 ? '#ef4444' : '#475569' }}>
                      {name}
                    </div>
                  ))}
                </div>

                {/* Day Grid Cells */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  background: '#ffffff'
                }}>
                  {calendarGrid.map((cell, idx) => {
                    // Match events for this date cell
                    const cellEvents = tabEvents
                      .filter(e => e.EventDate === cell.dateStr)
                      .sort((a, b) => {
                        const timeComp = (a.StartDateTime || '').localeCompare(b.StartDateTime || '');
                        if (timeComp !== 0) return timeComp;
                        const pA = PRIORITY_ORDER[a.PatrolPriority] || 2;
                        const pB = PRIORITY_ORDER[b.PatrolPriority] || 2;
                        return pB - pA;
                      });

                    const isToday = cell.isToday;
                    const maxDisplay = 2;
                    const displayedEvents = cellEvents.slice(0, maxDisplay);
                    const overflowCount = cellEvents.length - maxDisplay;

                    return (
                      <div
                        key={idx}
                        onClick={() => handleOpenCreateForDate(cell.dateStr)}
                        style={{
                          minHeight: '88px',
                          padding: '6px',
                          borderRight: (idx % 7 !== 6) ? '1px solid #f1f5f9' : 'none',
                          borderBottom: idx < calendarGrid.length - 7 ? '1px solid #f1f5f9' : 'none',
                          background: isToday ? '#eff6ff' : (cell.isCurrentMonth ? '#ffffff' : '#fafafa'),
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={(e) => {
                          if (!isToday && cell.isCurrentMonth) e.currentTarget.style.background = '#f8fafc';
                        }}
                        onMouseLeave={(e) => {
                          if (!isToday && cell.isCurrentMonth) e.currentTarget.style.background = '#ffffff';
                        }}
                      >
                        {/* Day Header with Today Badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {isToday ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{
                                background: '#2563eb',
                                color: '#ffffff',
                                borderRadius: '50%',
                                width: '22px',
                                height: '22px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.74rem',
                                fontWeight: 900
                              }}>
                                {cell.day}
                              </span>
                              <span style={{
                                fontSize: '0.6rem',
                                fontWeight: 800,
                                color: '#2563eb',
                                background: '#dbeafe',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                letterSpacing: '0.03em'
                              }}>
                                TODAY
                              </span>
                            </div>
                          ) : (
                            <span style={{
                              fontSize: '0.8rem',
                              fontWeight: cell.isCurrentMonth ? 700 : 400,
                              color: !cell.isCurrentMonth ? '#cbd5e1' : (cell.isSunday ? '#ef4444' : '#1e293b')
                            }}>
                              {cell.day}
                            </span>
                          )}
                        </div>

                        {/* Event Pills inside Day Cell */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '4px' }}>
                          {displayedEvents.map(ev => {
                            const style = getEventPillStyle(ev);
                            return (
                              <div
                                key={ev.ROWID || ev.EventName}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEventDetails(ev);
                                }}
                                style={{
                                  background: style.bg,
                                  color: style.color,
                                  border: style.border,
                                  borderRadius: '4px',
                                  padding: '2px 5px',
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  lineHeight: '1.2',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                                title={`${ev.EventName} (${style.badgeText}) - Click for details`}
                              >
                                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: style.dot, flexShrink: 0 }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.EventName}</span>
                              </div>
                            );
                          })}

                          {/* +N More Overflow Pill */}
                          {overflowCount > 0 && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setDayDetailsDate({ dateStr: cell.dateStr, events: cellEvents });
                              }}
                              style={{
                                fontSize: '0.62rem',
                                fontWeight: 700,
                                color: '#2563eb',
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                borderRadius: '4px',
                                padding: '1px 4px',
                                textAlign: 'center',
                                cursor: 'pointer'
                              }}
                            >
                              +{overflowCount} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* LIST VIEW */
              <div style={{
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px',
                background: '#ffffff',
                maxHeight: '400px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                {tabEvents.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px', fontSize: '0.85rem' }}>
                    No events scheduled for {currentMonthName} 2026.
                  </div>
                ) : (
                  tabEvents.map(ev => {
                    const style = getEventPillStyle(ev);
                    return (
                      <div
                        key={ev.ROWID || ev.EventName}
                        onClick={() => setSelectedEventDetails(ev)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: style.bg,
                          border: style.border,
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: style.dot }} />
                          <div>
                            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: style.color }}>{ev.EventName}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{ev.Location || 'Karnataka Statewide'}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#1e293b' }}>{ev.EventDate}</div>
                          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: style.color }}>{style.badgeText}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── 4. COLOR LEGEND BAR ── */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              padding: '4px 2px',
              fontSize: '0.72rem',
              color: '#475569',
              fontWeight: 600
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                <span>Gazetted Holiday / Festival</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
                <span>Restricted Holiday</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
                <span>Police Operational Event</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a855f7' }} />
                <span>VIP Visit / Security Review</span>
              </div>
            </div>

            {/* ── 5. IMPORTANT KARNATAKA EVENTS (2026 DATA-DRIVEN) ── */}
            <div style={{
              borderTop: '1px solid #e2e8f0',
              paddingTop: '16px',
              marginTop: '4px'
            }}>
              <h3 style={{
                fontSize: '0.9rem',
                fontWeight: 800,
                color: '#0f172a',
                margin: '0 0 12px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>Important Karnataka Events (2026)</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748b' }}>
                  ({importantKarnatakaEvents.length} Official Gazetted Events)
                </span>
              </h3>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px',
                maxHeight: '180px',
                overflowY: 'auto',
                paddingRight: '4px'
              }}>
                {importantKarnatakaEvents.map((item, idx) => {
                  const pStyle = getPriorityBadgeStyle(item.PatrolPriority);
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedEventDetails(item)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        gap: '6px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#eff6ff';
                        e.currentTarget.style.borderColor = '#93c5fd';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.borderColor = '#e2e8f0';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>
                          {item.EventName}
                        </div>
                        <span style={{
                          fontSize: '0.6rem',
                          fontWeight: 800,
                          color: pStyle.text,
                          background: pStyle.bg,
                          border: `1px solid ${pStyle.border}`,
                          padding: '1px 5px',
                          borderRadius: '4px'
                        }}>
                          {item.PatrolPriority || 'HIGH'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#64748b' }}>
                        <span>📅 {item.EventDate}</span>
                        <span style={{ color: '#2563eb', fontWeight: 600 }}>{calculateDaysRemainingText(item.EventDate)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* ── RIGHT COLUMN: UPCOMING EVENTS & TODAY'S SUMMARY ── */}
          <div style={{
            padding: '20px 18px',
            background: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            overflowY: 'auto'
          }}>
            
            {/* 1. UPCOMING EVENTS CARD */}
            <div>
              <h3 style={{
                fontSize: '0.9rem',
                fontWeight: 800,
                color: '#0f172a',
                margin: '0 0 12px 0'
              }}>
                Upcoming Events
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {displayUpcoming.map((item, idx) => {
                  const style = getEventPillStyle(item);
                  const daysRemainingText = calculateDaysRemainingText(item.EventDate);

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedEventDetails(item)}
                      style={{
                        background: style.bg,
                        border: style.border,
                        borderRadius: '10px',
                        padding: '12px 14px',
                        cursor: 'pointer',
                        transition: 'transform 0.15s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          background: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.95rem',
                          flexShrink: 0
                        }}>
                          {item.Scope === 'COMMON' ? '🛕' : '👥'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1e293b' }}>
                            {item.EventName}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', margin: '2px 0 8px 0', fontWeight: 500 }}>
                            {item.EventDate}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{
                              background: '#ffffff',
                              color: style.color,
                              border: style.border,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              letterSpacing: '0.04em'
                            }}>
                              {style.badgeText}
                            </span>
                            <span style={{ fontSize: '0.68rem', color: '#475569', fontWeight: 700 }}>
                              {daysRemainingText}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. TODAY'S SUMMARY CARD */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
            }}>
              <h3 style={{
                fontSize: '0.88rem',
                fontWeight: 800,
                color: '#0f172a',
                margin: 0
              }}>
                Today's Summary
              </h3>

              {/* Dynamic Local Date */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <CalendarIcon size={16} color="#64748b" style={{ marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>Date</div>
                  <div style={{ fontSize: '0.78rem', color: '#1e293b', fontWeight: 800 }}>
                    {currentDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* Events Today */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <CalendarCheck size={16} color="#64748b" style={{ marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>Events Today</div>
                  <div style={{ fontSize: '0.78rem', color: '#1e293b', fontWeight: 700 }}>
                    {todaysEvents.length > 0
                      ? todaysEvents.map(e => e.EventName).join(', ')
                      : 'No events today'}
                  </div>
                </div>
              </div>

              {/* Division Selector */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <Shield size={16} color="#64748b" style={{ marginTop: '2px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>Division</div>
                  <select
                    value={selectedDivision}
                    onChange={(e) => handleDivisionChange(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      color: '#1e293b',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      outline: 'none',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    {divisions.map(d => (
                      <option key={d} value={d}>
                        {d} Division
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Active Reminders */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <Bell size={16} color="#ef4444" style={{ marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>Active Reminders</div>
                  <div style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 800 }}>
                    {reminders.length > 0 ? `${reminders.length} event(s) in next 2 days` : '0 active reminders'}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── DAY FULL SCHEDULE MODAL (FOR +N MORE) ── */}
        {dayDetailsDate && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 100000
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '480px',
              padding: '20px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  📅 Schedule for {dayDetailsDate.dateStr}
                </h3>
                <button onClick={() => setDayDetailsDate(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '50vh', overflowY: 'auto' }}>
                {dayDetailsDate.events.map(ev => {
                  const style = getEventPillStyle(ev);
                  return (
                    <div
                      key={ev.ROWID || ev.EventName}
                      onClick={() => {
                        setSelectedEventDetails(ev);
                        setDayDetailsDate(null);
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: style.bg,
                        border: style.border,
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ fontSize: '0.84rem', fontWeight: 800, color: style.color }}>{ev.EventName}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                        {ev.Scope === 'COMMON' ? 'Karnataka-wide' : `${ev.Division} Division`} • Priority: {ev.PatrolPriority || 'HIGH'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── CREATE / EDIT OPERATIONAL EVENT MODAL ── */}
        {showCreateModal && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 100000
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '520px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {editingEvent ? 'Edit Police Operational Event' : 'Schedule Police Operational Event'}
                </h3>
                <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    EVENT NAME *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DGP Review Meeting / VIP Corridor Security"
                    value={formData.EventName}
                    onChange={(e) => setFormData({ ...formData, EventName: e.target.value })}
                    style={{
                      width: '100%',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#0f172a',
                      fontSize: '0.82rem'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                      EVENT TYPE
                    </label>
                    <select
                      value={formData.EventType}
                      onChange={(e) => setFormData({ ...formData, EventType: e.target.value })}
                      style={{
                        width: '100%',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: '#0f172a',
                        fontSize: '0.82rem'
                      }}
                    >
                      <option value="MEETING">MEETING</option>
                      <option value="VIP_VISIT">VIP_VISIT</option>
                      <option value="POLICE_EVENT">POLICE_EVENT</option>
                      <option value="GOVERNMENT_EVENT">GOVERNMENT_EVENT</option>
                      <option value="FESTIVAL">FESTIVAL</option>
                      <option value="OTHER">OTHER</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                      EVENT DATE (2026) *
                    </label>
                    <input
                      type="date"
                      required
                      min="2026-01-01"
                      max="2026-12-31"
                      value={formData.EventDate}
                      onChange={(e) => setFormData({ ...formData, EventDate: e.target.value })}
                      style={{
                        width: '100%',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: '#0f172a',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                      PATROL PRIORITY
                    </label>
                    <select
                      value={formData.PatrolPriority}
                      onChange={(e) => setFormData({ ...formData, PatrolPriority: e.target.value })}
                      style={{
                        width: '100%',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: '#0f172a',
                        fontSize: '0.82rem'
                      }}
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                      DIVISION
                    </label>
                    <input
                      type="text"
                      disabled
                      value={`${selectedDivision} (DIVISION Scope)`}
                      style={{
                        width: '100%',
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: '#64748b',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    LOCATION
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Commissioner Office / Infantry Road"
                    value={formData.Location}
                    onChange={(e) => setFormData({ ...formData, Location: e.target.value })}
                    style={{
                      width: '100%',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#0f172a',
                      fontSize: '0.82rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    DESCRIPTION & OPERATIONAL DIRECTIVE
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Operational notes / agenda..."
                    value={formData.Description}
                    onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
                    style={{
                      width: '100%',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#0f172a',
                      fontSize: '0.82rem',
                      resize: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      color: '#475569',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      background: '#2563eb',
                      border: 'none',
                      color: '#ffffff',
                      padding: '8px 20px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {editingEvent ? 'Update Event' : 'Save Event'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── EVENT DETAILS & AI ADVISORY POPUP MODAL ── */}
        {selectedEventDetails && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 100000
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '540px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {selectedEventDetails.EventName}
                </h3>
                <button onClick={() => setSelectedEventDetails(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: '#334155', marginBottom: '16px' }}>
                <div>📅 <strong>Date:</strong> {selectedEventDetails.EventDate} ({selectedEventDetails.EventType})</div>
                <div>🏛️ <strong>Scope:</strong> {selectedEventDetails.Scope === 'COMMON' ? 'Karnataka-wide (COMMON)' : `Division (${selectedEventDetails.Division})`}</div>
                <div>📍 <strong>Location:</strong> {selectedEventDetails.Location || 'Statewide Karnataka'}</div>
                <div>🛡️ <strong>Patrol Priority:</strong> {selectedEventDetails.PatrolPriority || 'HIGH'}</div>
                {selectedEventDetails.Description && (
                  <div>📋 <strong>Description:</strong> {selectedEventDetails.Description}</div>
                )}
                {selectedEventDetails.RecommendedAction && (
                  <div>⚡ <strong>Recommended Action:</strong> {selectedEventDetails.RecommendedAction}</div>
                )}
                <div>🔔 <strong>Reminder:</strong> {selectedEventDetails.ReminderDays || 2} Days before event</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                <button
                  onClick={() => {
                    handleGenerateAdvisory(selectedEventDetails.EventName);
                    setSelectedEventDetails(null);
                  }}
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Sparkles size={14} /> Generate AI Patrol Advisory
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {selectedEventDetails.Scope !== 'COMMON' && selectedEventDetails.ROWID && (
                    <button
                      onClick={() => handleDeleteEvent(selectedEventDetails.ROWID, selectedEventDetails.EventName)}
                      style={{
                        background: '#fee2e2',
                        border: '1px solid #fca5a5',
                        color: '#b91c1c',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedEventDetails(null)}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      color: '#475569',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── AI PATROL ADVISORY POPUP MODAL ── */}
        {advisoryData && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 100000
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '600px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              border: '1px solid #bfdbfe'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1d4ed8', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} /> Karnataka Calendar Alert & AI Patrol Advisory
                </h3>
                <button onClick={() => setAdvisoryData(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '16px',
                fontSize: '0.8rem',
                color: '#1e293b',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                maxHeight: '55vh',
                overflowY: 'auto'
              }}>
                {advisoryData.advisoryText}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button
                  onClick={() => setAdvisoryData(null)}
                  style={{
                    background: '#2563eb',
                    border: 'none',
                    color: '#ffffff',
                    padding: '8px 20px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Dismiss Advisory
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
