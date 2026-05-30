import React, { useState, useEffect, useRef } from 'react';

// Main Golf Diary React Application - Sync trigger to push App.js to GitHub
// Common date helper matching Android format
const formatPlayDate = (dateStr) => {
  if (!dateStr) return '';
  if (dateStr.includes('/')) return dateStr; // already formatted
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[1]}/${parts[2]}/${parts[0]}`; // YYYY-MM-DD -> MM/DD/YYYY
  }
  return dateStr;
};

// Render score symbol based on standard golf scoring notation
const renderScoreSymbol = (score, par, isSelected) => {
  if (!score || score <= 0) return <span className="text-gray-300 text-xs">-</span>;
  
  const diff = score - par;
  
  if (diff === -1) {
    // Birdie: 빨간색 동그라미 안에 숫자
    return (
      <div className="w-5 h-5 rounded-full border border-red-500 bg-red-50/30 flex items-center justify-center">
        <span className="text-[10px] font-black text-red-500 leading-none">{score}</span>
      </div>
    );
  } else if (diff <= -2) {
    // Eagle or Albatross: 두줄짜리 빨간색 동그라미
    return (
      <div className="relative w-5 h-5 flex items-center justify-center">
        <div className="absolute inset-0 border border-red-500 rounded-full"></div>
        <div className="absolute inset-[2.5px] border border-red-500 rounded-full"></div>
        <span className="text-[10px] font-black text-red-500 z-10 leading-none">{score}</span>
      </div>
    );
  } else if (diff === 1) {
    // Bogey: 파란색 네모 안에 숫자
    return (
      <div className="w-5 h-5 border border-blue-500 bg-blue-50/20 rounded-[2px] flex items-center justify-center">
        <span className="text-[10px] font-black text-blue-500 leading-none">{score}</span>
      </div>
    );
  } else if (diff >= 2) {
    // Double bogey and more: 두줄짜리 네모 안에 숫자
    return (
      <div className="relative w-5 h-5 flex items-center justify-center">
        <div className="absolute inset-0 border border-blue-600 rounded-[2px]"></div>
        <div className="absolute inset-[2.5px] border border-blue-600 rounded-[2px]"></div>
        <span className="text-[10px] font-black text-blue-600 z-10 leading-none">{score}</span>
      </div>
    );
  } else {
    // Par
    return <span className={`text-xs font-bold leading-none ${isSelected ? 'text-emerald-800' : 'text-gray-700'}`}>{score}</span>;
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState('score'); // 'score', 'course', 'history'
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [selectedHistoryScore, setSelectedHistoryScore] = useState(null);

  // Load from LocalStorage if exists
  const [scores, setScores] = useState(() => {
    const saved = localStorage.getItem('golf_diary_scores');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error reading scores from localStorage", e);
      }
    }
    return [
      {
        id: 1,
        courseId: 1,
        courseName: 'Jeju Nine Bridges CC',
        date: '05/10/2026',
        holes: Array.from({ length: 18 }, (_, i) => ({
          hole: i + 1,
          iron: 3,
          putt: 2,
          iron2: 4,
          putt2: 2
        })),
        photos: []
      }
    ];
  });

  const [courses, setCourses] = useState(() => {
    const saved = localStorage.getItem('golf_diary_courses');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error reading courses from localStorage", e);
      }
    }
    return [
      {
        id: 1,
        name: 'Jeju Nine Bridges CC',
        address: 'Jeju, South Korea',
        totalPar: 72,
        ladyRating: 72.1,
        ladySlope: 130,
        blueRating: 73.5,
        blueSlope: 135,
        lat: 33.3541,
        lng: 126.3712,
        holePars: Array(18).fill(4)
      }
    ];
  });

  // Save to LocalStorage and update Refs whenever state changes
  const scoresRef = useRef(scores);
  const coursesRef = useRef(courses);
  const lastDownloadedDataStringRef = useRef(JSON.stringify({ scores, courses }));

  useEffect(() => {
    scoresRef.current = scores;
    localStorage.setItem('golf_diary_scores', JSON.stringify(scores));
  }, [scores]);

  useEffect(() => {
    coursesRef.current = courses;
    localStorage.setItem('golf_diary_courses', JSON.stringify(courses));
  }, [courses]);

  // --- NATIVE FIREBASE + ULTRA-FAST CLOUD STREAMING LIVE SYNC (DUAL ENGINE) ---
  const [firebaseUrl, setFirebaseUrl] = useState(() => {
    return localStorage.getItem('golf_diary_fb_url') || 'https://skky-golf-b3552-default-rtdb.firebaseio.com';
  });
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);
  const [syncStatus, setSyncStatus] = useState('syncing'); // 'syncing', 'synced', 'error'
  const [lastSyncedTime, setLastSyncedTime] = useState('Connecting...');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // Settings modal

  const syncChannel = 'skky_golf_live_sync_signey99';
  const isFirebaseListening = useRef(false);

  useEffect(() => {
    localStorage.setItem('golf_diary_fb_url', firebaseUrl);
  }, [firebaseUrl]);

  // Helper helper to upload cloud silently to fallback web-sync bucket
  const silentUploadToFallback = async (currentScores, currentCourses, timestamp) => {
    try {
      const payload = {
        scores: currentScores,
        courses: currentCourses,
        updatedAt: timestamp
      };
      const res = await fetch(`https://kvdb.io/K9m8b8M8PnHpMhpbUfHqpS/${syncChannel}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        localStorage.setItem('golf_diary_last_sync_timestamp', String(timestamp));
        setLastSyncedTime(new Date(timestamp).toLocaleTimeString() + ' (Live)');
        setSyncStatus('synced');
      }
    } catch (e) {
      console.error("Fallback upload failed", e);
    }
  };

  // Upload to both Firebase RTDB & Web-Sync fallback
  const uploadToCloud = async (currentScores, currentCourses, timestamp) => {
    // A. Push to the ultra-reliable Web-Sync Fallback Bucket (100% SLA)
    await silentUploadToFallback(currentScores, currentCourses, timestamp);

    // B. Push to Firebase Realtime Database
    try {
      if (window.firebase && firebaseUrl.trim()) {
        let app;
        if (!window.firebase.apps.length) {
          app = window.firebase.initializeApp({
            databaseURL: firebaseUrl,
            projectId: firebaseUrl.split('//')[1]?.split('.')[0] || 'skky-golf'
          });
        } else {
          app = window.firebase.app();
        }
        const db = window.firebase.database(app);
        await db.ref(syncChannel).set({
          scores: currentScores,
          courses: currentCourses,
          updatedAt: timestamp
        });
      }
    } catch (e) {
      console.warn("Firebase set skipped or failed", e);
    }
  };

  // Launch Dual Sync Observers
  useEffect(() => {
    let fbRef = null;
    let fallbackInterval = null;
    isFirebaseListening.current = false;

    const startDualSync = async () => {
      const tryConnectFirebase = () => {
        if (isFirebaseListening.current) return;
        if (window.firebase && firebaseUrl.trim()) {
          try {
            let app;
            if (!window.firebase.apps.length) {
              app = window.firebase.initializeApp({
                databaseURL: firebaseUrl,
                projectId: firebaseUrl.split('//')[1]?.split('.')[0] || 'skky-golf'
              });
            } else {
              app = window.firebase.app();
            }

            const db = window.firebase.database(app);
            fbRef = db.ref(syncChannel);

            fbRef.on('value', (snapshot) => {
              const cloudData = snapshot.val();
              if (cloudData && cloudData.updatedAt) {
                const localTimestamp = Number(localStorage.getItem('golf_diary_last_sync_timestamp') || '0');

                if (cloudData.updatedAt > localTimestamp) {
                  console.log("[Firebase RTDB] Live sync update received!", cloudData);
                  lastDownloadedDataStringRef.current = JSON.stringify({
                    scores: cloudData.scores || [],
                    courses: cloudData.courses || []
                  });
                  if (cloudData.scores) setScores(cloudData.scores);
                  if (cloudData.courses) setCourses(cloudData.courses);
                  localStorage.setItem('golf_diary_scores', JSON.stringify(cloudData.scores));
                  localStorage.setItem('golf_diary_courses', JSON.stringify(cloudData.courses));
                  localStorage.setItem('golf_diary_last_sync_timestamp', String(cloudData.updatedAt));
                  setLastSyncedTime(new Date(cloudData.updatedAt).toLocaleTimeString() + ' (Firebase)');
                  setSyncStatus('synced');
                }
              }
            }, (err) => {
              console.warn("Firebase reference error", err);
            });

            isFirebaseListening.current = true;
            console.log("[Firebase] Registered active listener successfully.");
          } catch (err) {
            console.warn("Firebase attachment failed/skipped", err);
          }
        }
      };

      // 2. Fetch and initialize fallback sync
      const queryFallbackSync = async () => {
        tryConnectFirebase();

        try {
          const res = await fetch(`https://kvdb.io/K9m8b8M8PnHpMhpbUfHqpS/${syncChannel}`);
          if (res.ok) {
            const cloudData = await res.json();
            if (cloudData && cloudData.updatedAt) {
              const localTimestamp = Number(localStorage.getItem('golf_diary_last_sync_timestamp') || '0');

              if (cloudData.updatedAt > localTimestamp) {
                console.log("[Web Sync Fallback] Newer data loaded!", cloudData);
                lastDownloadedDataStringRef.current = JSON.stringify({
                  scores: cloudData.scores || [],
                  courses: cloudData.courses || []
                });
                if (cloudData.scores) setScores(cloudData.scores);
                if (cloudData.courses) setCourses(cloudData.courses);
                localStorage.setItem('golf_diary_scores', JSON.stringify(cloudData.scores));
                localStorage.setItem('golf_diary_courses', JSON.stringify(cloudData.courses));
                localStorage.setItem('golf_diary_last_sync_timestamp', String(cloudData.updatedAt));
                setLastSyncedTime(new Date(cloudData.updatedAt).toLocaleTimeString() + ' (Fallback)');
                setSyncStatus('synced');
              } else if (localTimestamp > cloudData.updatedAt) {
                // Upload our newer local data to fallback server to maintain backup parity
                await silentUploadToFallback(scoresRef.current, coursesRef.current, localTimestamp);
              } else {
                setSyncStatus('synced');
                setLastSyncedTime(new Date(cloudData.updatedAt).toLocaleTimeString());
              }
            }
          } else if (res.status === 404) {
            // First time bootstrapping
            const localTimestamp = Number(localStorage.getItem('golf_diary_last_sync_timestamp') || '0');
            await silentUploadToFallback(scoresRef.current, coursesRef.current, localTimestamp || Date.now());
          }
        } catch (e) {
          // quiet error handling on timer
        } finally {
          setIsInitialLoadDone(true);
        }
      };

      tryConnectFirebase();

      // Set fallback fast-polling watcher every 2.0 seconds for instant bidirectional sync
      fallbackInterval = setInterval(queryFallbackSync, 2000);
      queryFallbackSync();
    };

    startDualSync();

    return () => {
      if (fbRef) fbRef.off();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [firebaseUrl]);

  // Push local changes up automatically with a light debounce whenever local state registers a change
  useEffect(() => {
    if (!isInitialLoadDone) return;

    const currentLocalSerialized = JSON.stringify({ scores, courses });
    if (currentLocalSerialized === lastDownloadedDataStringRef.current) {
      console.log("[Sync Loop Prevented] Local state matches the last synced state.");
      return;
    }

    const changeTime = Date.now();
    const delayDebounce = setTimeout(async () => {
      setSyncStatus('syncing');
      try {
        await uploadToCloud(scores, courses, changeTime);
        lastDownloadedDataStringRef.current = currentLocalSerialized;
        localStorage.setItem('golf_diary_last_sync_timestamp', String(changeTime));
      } catch (err) {
        setSyncStatus('error');
      }
    }, 1200);

    return () => clearTimeout(delayDebounce);
  }, [scores, courses, isInitialLoadDone]);

  // --- SCOREBOARD TAB STATES ---
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [isNewCourse, setIsNewCourse] = useState(false);
  const [newCourseNameInput, setNewCourseNameInput] = useState('');
  
  // Format YYYY-MM-DD as default date for native calendar picker
  const getDefaultDate = () => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${yyyy}-${mm}-${dd}`;
  };
  const [playDate, setPlayDate] = useState(getDefaultDate());

  // Dual-Player scorecard details (1-18 holes)
  const [scoreboardHoles, setScoreboardHoles] = useState(
    Array.from({ length: 18 }, (_, i) => ({
      hole: i + 1,
      iron: 0,
      putt: 0,
      iron2: 0,
      putt2: 0
    }))
  );
  const [activeHoleIndex, setActiveHoleIndex] = useState(0);

  // --- COURSE TAB STATES ---
  const [newCourse, setNewCourse] = useState({
    name: '',
    address: '',
    ladyRating: 72.0,
    ladySlope: 113,
    blueRating: 72.0,
    blueSlope: 113,
    lat: 33.3541,
    lng: 126.3712
  });

  const [courseHolePars, setCourseHolePars] = useState(Array(18).fill(4));

  // Sync selected course's par information immediately
  useEffect(() => {
    if (selectedCourseId) {
      const course = courses.find(c => Number(c.id) === Number(selectedCourseId) || String(c.id) === String(selectedCourseId));
      if (course && course.holePars) {
        setCourseHolePars(course.holePars);
      } else {
        setCourseHolePars(Array(18).fill(4));
      }
    } else {
      setCourseHolePars(Array(18).fill(4));
    }
  }, [selectedCourseId, courses]);
  const [editingParHoleIndex, setEditingParHoleIndex] = useState(null); // null or 0..17
  const [showCourseModal, setShowCourseModal] = useState(false);

  // Virtual map tracker for simulated GPS picker
  const [mapClickedCoords, setMapClickedCoords] = useState({ lat: 33.3541, lng: 126.3712 });

  const handleMapClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Simulate mapping click coordinates to relative latitude & longitude offsets
    const simulatedLat = (33.3541 + (y / rect.height) * 0.1).toFixed(4);
    const simulatedLng = (126.3712 + (x / rect.width) * 0.1).toFixed(4);
    
    setMapClickedCoords({ lat: parseFloat(simulatedLat), lng: parseFloat(simulatedLng) });
    setNewCourse(prev => ({ ...prev, lat: parseFloat(simulatedLat), lng: parseFloat(simulatedLng) }));
  };

  const handleSaveScore = (e) => {
    e.preventDefault();
    let courseIdVal = Number(selectedCourseId);
    let courseNameVal = '';

    if (!selectedCourseId && !isNewCourse) {
      alert('Please select or write a golf course.');
      return;
    }

    if (isNewCourse) {
      if (!newCourseNameInput.trim()) {
        alert('Please enter a golf course name.');
        return;
      }
      const newCreatedCourse = {
        id: Date.now(),
        name: newCourseNameInput,
        address: 'Direct Entry Address',
        totalPar: 72,
        ladyRating: 72.0,
        ladySlope: 113,
        blueRating: 72.0,
        blueSlope: 113,
        lat: 37.5665,
        lng: 126.9780,
        holePars: Array(18).fill(4)
      };
      setCourses(prev => [...prev, newCreatedCourse]);
      courseIdVal = newCreatedCourse.id;
      courseNameVal = newCreatedCourse.name;
    } else {
      const selected = courses.find(c => c.id === courseIdVal);
      courseNameVal = selected ? selected.name : 'Unknown Course';
    }

    const scoreData = {
      id: Date.now(),
      courseId: courseIdVal,
      courseName: courseNameVal,
      date: formatPlayDate(playDate),
      holes: [...scoreboardHoles],
      photos: []
    };

    setScores(prev => [scoreData, ...prev]);
    alert('Golf score saved successfully!');
    
    // Reset scoreboard tab
    setSelectedCourseId('');
    setIsNewCourse(false);
    setNewCourseNameInput('');
    setPlayDate(getDefaultDate());
    setScoreboardHoles(
      Array.from({ length: 18 }, (_, i) => ({
        hole: i + 1,
        iron: 0,
        putt: 0,
        iron2: 0,
        putt2: 0
      }))
    );
    setActiveHoleIndex(0);
  };

  const handleStartEditCourse = (course) => {
    setEditingCourseId(course.id);
    setNewCourse({
      name: course.name,
      address: course.address,
      ladyRating: course.ladyRating || 72.0,
      ladySlope: course.ladySlope || 113,
      blueRating: course.blueRating || 72.0,
      blueSlope: course.blueSlope || 113,
      lat: course.lat || 33.3541,
      lng: course.lng || 126.3712
    });
    setCourseHolePars(course.holePars || Array(18).fill(4));
    setMapClickedCoords({ lat: course.lat || 33.3541, lng: course.lng || 126.3712 });
    setShowCourseModal(true);
  };

  const handleDeleteCourse = (courseId) => {
    if (window.confirm("Are you sure you want to delete this golf course? Existing round records will not be affected, but it will no longer appear in the options.")) {
      setCourses(prev => prev.filter(c => c.id !== courseId));
      if (Number(selectedCourseId) === courseId) {
        setSelectedCourseId('');
      }
    }
  };

  const closeCourseModal = () => {
    setShowCourseModal(false);
    setEditingCourseId(null);
    setNewCourse({
      name: '',
      address: '',
      ladyRating: 72.0,
      ladySlope: 113,
      blueRating: 72.0,
      blueSlope: 113,
      lat: 33.3541,
      lng: 126.3712
    });
    setCourseHolePars(Array(18).fill(4));
    setMapClickedCoords({ lat: 33.3541, lng: 126.3712 });
  };

  const handleSaveCourse = (e) => {
    e.preventDefault();
    if (!newCourse.name.trim()) return alert('Please enter a golf course name.');
    
    const sumTotalPar = courseHolePars.reduce((sum, val) => sum + val, 0);

    const courseData = {
      id: editingCourseId ? editingCourseId : Date.now(),
      name: newCourse.name,
      address: newCourse.address || 'Unknown Address',
      totalPar: sumTotalPar,
      ladyRating: Number(newCourse.ladyRating) || 72.0,
      ladySlope: Number(newCourse.ladySlope) || 113,
      blueRating: Number(newCourse.blueRating) || 72.0,
      blueSlope: Number(newCourse.blueSlope) || 113,
      lat: mapClickedCoords.lat,
      lng: mapClickedCoords.lng,
      holePars: [...courseHolePars]
    };

    if (editingCourseId) {
      setCourses(prev => prev.map(c => c.id === editingCourseId ? courseData : c));
      // Proactively update cached course names in historic scores so name changes propagate instantly
      setScores(prev => prev.map(s => s.courseId === editingCourseId ? { ...s, courseName: courseData.name } : s));
      alert('Golf course successfully updated.');
    } else {
      setCourses(prev => [...prev, courseData]);
      alert('New golf course successfully registered.');
    }
    
    closeCourseModal();
  };

  const handlePhotoUpload = (scoreId, event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Please upload images smaller than 2MB to ensure good localStorage performance!");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setScores(prevScores => 
          prevScores.map(score => {
            if (score.id === scoreId) {
              return { ...score, photos: [...(score.photos || []), reader.result] };
            }
            return score;
          })
        );
      };
      reader.readAsDataURL(file);
    }
  };

  // Stepper Modifier Helpers
  const modifyScoreboardHole = (field, dChange) => {
    const nextHoles = [...scoreboardHoles];
    const currentVal = nextHoles[activeHoleIndex][field] || 0;
    nextHoles[activeHoleIndex][field] = Math.max(0, currentVal + dChange);
    setScoreboardHoles(nextHoles);
  };

  // Grand totals
  const totalCombinedP1 = scoreboardHoles.reduce((sum, h) => sum + (h.iron || 0) + (h.putt || 0), 0);
  const totalCombinedP2 = scoreboardHoles.reduce((sum, h) => sum + (h.iron2 || 0) + (h.putt2 || 0), 0);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col justify-between font-sans shadow-xl relative border-x border-gray-100 pb-24">
      
      {/* Top Header App Bar */}
      <header className="text-white py-4 px-5 text-left shadow-md select-none relative animate-fade-in pr-20" style={{ backgroundColor: '#0f766e' }}>
        <h1 className="text-xl font-extrabold tracking-wide flex items-center">⛳ SkKy Golf</h1>
        <p className="text-xs text-emerald-100 mt-0.5 font-medium">시근이와 계영이의 골프 여행기</p>
        
        {/* Save button positioned in top right instead of gear settings icon */}
        {activeTab === 'score' && (
          <button 
            type="button"
            onClick={handleSaveScore}
            disabled={(!isNewCourse && !selectedCourseId) || (isNewCourse && !newCourseNameInput.trim())}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-extrabold px-3.5 py-1.5 rounded-xl text-xs shadow-md transition active:scale-95 outline-none select-none"
          >
            Save
          </button>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* --- TAB 1: SCOREBOARD --- */}
        {activeTab === 'score' && (
          <div className="space-y-4 fade-in">
            
            {/* Round Setup Form Card */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center">
                <span className="mr-2">🏌️</span> Setup Golf Round
              </h2>
              
              <div className="grid grid-cols-2 gap-3.5">
                {/* Course Selector on Left */}
                <div>
                  <label className="block text-[11px] font-bold text-emerald-800 uppercase tracking-wide mb-1">Course</label>
                  <select 
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-xs shadow-sm transition-all text-gray-700"
                    value={isNewCourse ? 'new' : selectedCourseId}
                    onChange={(e) => {
                      if (e.target.value === 'new') {
                        setIsNewCourse(true);
                        setSelectedCourseId('');
                      } else {
                        setIsNewCourse(false);
                        setSelectedCourseId(e.target.value);
                      }
                    }}
                  >
                    <option value="">-- Select --</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                    <option value="new">+ Add New</option>
                  </select>
                </div>

                {/* Date Picker Input on Right */}
                <div>
                  <label className="block text-[11px] font-bold text-emerald-800 uppercase tracking-wide mb-1">Pla Date</label>
                  <input 
                    type="date" 
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-xs text-gray-700 font-medium"
                    value={playDate}
                    onChange={(e) => setPlayDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Direct Entry Course Name */}
              {isNewCourse && (
                <div className="bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-100 space-y-1.5 animate-fadeIn mt-3.5">
                  <label className="block text-[10px] font-bold text-emerald-800 uppercase">Enter Golf Course Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Gapyeong Benest GC"
                    className="w-full p-2.5 bg-white border border-emerald-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                    value={newCourseNameInput}
                    onChange={(e) => setNewCourseNameInput(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Live Matrix Section (Split tables in UI Grid) - Positioned immediately under setup */}
            <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-sm space-y-3">
              <span className="text-xs font-extrabold text-emerald-800 flex items-center px-1">
                📊 18-Hole Live Matrix (Tap cell to navigate)
              </span>

              {/* Front Nine layout */}
              <div>
                <span className="text-[10px] font-bold text-gray-400 block mb-1 px-1">⛳ FRONT NINE (Holes 1 - 9)</span>
                <div className="border border-gray-200 rounded-xl overflow-hidden flex bg-white text-center">
                  <div className="w-12 bg-gray-50 flex flex-col justify-around text-[10px] font-bold text-gray-500 py-1 border-r border-gray-200">
                    <span className="h-5 flex items-center justify-center">Hole</span>
                    <span className="h-4 flex items-center justify-center text-red-500 font-extrabold text-[9px]">Par</span>
                    <span className="h-6 flex items-center justify-center text-emerald-600">👦 SK</span>
                    <span className="h-6 flex items-center justify-center text-teal-600">👩 KY</span>
                  </div>
                  {scoreboardHoles.slice(0, 9).map((h, k) => {
                    const isSelected = activeHoleIndex === k;
                    const p1T = h.iron + h.putt;
                    const p2T = h.iron2 + h.putt2;
                    const holePar = courseHolePars[k] || 4;
                    return (
                      <div 
                        key={k}
                        onClick={() => setActiveHoleIndex(k)}
                        className={`flex-1 py-1 flex flex-col justify-around cursor-pointer transition-all border-r last:border-r-0 border-gray-100 ${
                          isSelected ? 'bg-emerald-50' : 'hover:bg-gray-50/50'
                        }`}
                      >
                        <span className={`text-[10px] font-bold h-5 flex items-center justify-center ${isSelected ? 'text-emerald-700 font-black' : 'text-gray-400'}`}>
                          {h.hole}
                        </span>
                        <span className="text-[10px] font-black text-red-500 h-4 flex items-center justify-center">
                          {holePar}
                        </span>
                        <div className="h-6 flex items-center justify-center">
                          {renderScoreSymbol(p1T, holePar, isSelected)}
                        </div>
                        <div className="h-6 flex items-center justify-center">
                          {renderScoreSymbol(p2T, holePar, isSelected)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Back Nine layout */}
              <div>
                <span className="text-[10px] font-bold text-gray-400 block mb-1 px-1">⛳ BACK NINE (Holes 10 - 18)</span>
                <div className="border border-gray-200 rounded-xl overflow-hidden flex bg-white text-center">
                  <div className="w-12 bg-gray-50 flex flex-col justify-around text-[10px] font-bold text-gray-500 py-1 border-r border-gray-200">
                    <span className="h-5 flex items-center justify-center">Hole</span>
                    <span className="h-4 flex items-center justify-center text-red-500 font-extrabold text-[9px]">Par</span>
                    <span className="h-6 flex items-center justify-center text-emerald-600">👦 SK</span>
                    <span className="h-6 flex items-center justify-center text-teal-600">👩 KY</span>
                  </div>
                  {scoreboardHoles.slice(9, 18).map((h, k) => {
                    const globalK = k + 9;
                    const isSelected = activeHoleIndex === globalK;
                    const p1T = h.iron + h.putt;
                    const p2T = h.iron2 + h.putt2;
                    const holePar = courseHolePars[globalK] || 4;
                    return (
                      <div 
                        key={globalK}
                        onClick={() => setActiveHoleIndex(globalK)}
                        className={`flex-1 py-1 flex flex-col justify-around cursor-pointer transition-all border-r last:border-r-0 border-gray-100 ${
                          isSelected ? 'bg-emerald-50' : 'hover:bg-gray-50/50'
                        }`}
                      >
                        <span className={`text-[10px] font-bold h-5 flex items-center justify-center ${isSelected ? 'text-emerald-700 font-black' : 'text-gray-400'}`}>
                          {h.hole}
                        </span>
                        <span className="text-[10px] font-black text-red-500 h-4 flex items-center justify-center">
                          {holePar}
                        </span>
                        <div className="h-6 flex items-center justify-center">
                          {renderScoreSymbol(p1T, holePar, isSelected)}
                        </div>
                        <div className="h-6 flex items-center justify-center">
                          {renderScoreSymbol(p2T, holePar, isSelected)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Select Hole scroll bar widget */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider px-1">🎯 Select Hole to Record</label>
              <div className="flex overflow-x-auto gap-2 py-1.5 px-0.5 scrollbar-thin">
                {scoreboardHoles.map((h, k) => {
                  const isSelected = activeHoleIndex === k;
                  const isRecorded = (h.iron + h.putt > 0) || (h.iron2 + h.putt2 > 0);
                  
                  return (
                    <button
                      key={h.hole}
                      type="button"
                      onClick={() => setActiveHoleIndex(k)}
                      className={`min-w-[56px] h-10 rounded-xl flex flex-col justify-center items-center transition-all border ${
                        isSelected 
                          ? 'bg-emerald-600 text-white border-emerald-600 font-extrabold shadow' 
                          : isRecorded
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-xs">{h.hole}H</span>
                      {isRecorded && !isSelected && (
                        <span className="text-[8px] opacity-80 mt-0.5">
                          {h.iron + h.putt}/{h.iron2 + h.putt2}
                        </span>
                      )}
                      {isRecorded && isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white mt-0.5"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stepper Recording Panel */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-150 overflow-hidden flex flex-col items-center">
              
              {/* Hole Header Navigator */}
              <div className="w-full flex justify-between items-center pb-2.5 border-b border-gray-100">
                <button
                  type="button"
                  onClick={() => setActiveHoleIndex(prev => Math.max(0, prev - 1))}
                  disabled={activeHoleIndex === 0}
                  className="text-xs text-emerald-600 font-bold hover:text-emerald-800 disabled:opacity-30 p-1.5 hover:bg-gray-50 rounded-lg transition"
                >
                  ◀ Prev
                </button>
                <span className="text-lg font-black text-emerald-700 tracking-wide">
                  ⛳ HOLE {activeHoleIndex + 1}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveHoleIndex(prev => Math.min(17, prev + 1))}
                  disabled={activeHoleIndex === 17}
                  className="text-xs text-emerald-600 font-bold hover:text-emerald-800 disabled:opacity-30 p-1.5 hover:bg-gray-50 rounded-lg transition"
                >
                  Next ▶
                </button>
              </div>

              {/* SK and KY Steppers row */}
              <div className="w-full grid grid-cols-2 gap-4 mt-4 relative">
                
                {/* Vert divider line */}
                <div className="absolute top-1 bottom-1 left-1/2 w-[1px] bg-gray-100 -translate-x-1/2"></div>
                
                {/* SK COLUMN */}
                <div className="flex flex-col items-center space-y-4 pr-1">
                  <span className="text-xs font-bold text-emerald-700 flex items-center">
                    👦 SK
                  </span>

                  {/* Strokes */}
                  <div className="w-full flex flex-col items-center text-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Stroke</span>
                    <div className="flex items-center gap-1.5 bg-emerald-50/40 p-1 rounded-full border border-emerald-100/50 mt-1">
                      <button
                        type="button"
                        onClick={() => modifyScoreboardHole('iron', -1)}
                        className="w-8 h-8 rounded-full bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-100 font-bold text-sm shadow-sm flex justify-center items-center active:scale-95"
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-black text-base text-emerald-700">
                        {scoreboardHoles[activeHoleIndex].iron}
                      </span>
                      <button
                        type="button"
                        onClick={() => modifyScoreboardHole('iron', 1)}
                        className="w-8 h-8 rounded-full bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-100 font-bold text-sm shadow-sm flex justify-center items-center active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Putts */}
                  <div className="w-full flex flex-col items-center text-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Putt</span>
                    <div className="flex items-center gap-1.5 bg-emerald-50/40 p-1 rounded-full border border-emerald-100/50 mt-1">
                      <button
                        type="button"
                        onClick={() => modifyScoreboardHole('putt', -1)}
                        className="w-8 h-8 rounded-full bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-100 font-bold text-sm shadow-sm flex justify-center items-center active:scale-95"
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-black text-base text-emerald-700">
                        {scoreboardHoles[activeHoleIndex].putt}
                      </span>
                      <button
                        type="button"
                        onClick={() => modifyScoreboardHole('putt', 1)}
                        className="w-8 h-8 rounded-full bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-100 font-bold text-[15px] shadow-sm flex justify-center items-center active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <span className="text-xs font-black text-emerald-700 pt-1.5">
                    Total: {scoreboardHoles[activeHoleIndex].iron + scoreboardHoles[activeHoleIndex].putt}
                  </span>
                </div>

                {/* KY COLUMN */}
                <div className="flex flex-col items-center space-y-4 pl-1">
                  <span className="text-xs font-bold text-teal-700 flex items-center">
                    👩 KY
                  </span>

                  {/* Strokes */}
                  <div className="w-full flex flex-col items-center text-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Stroke</span>
                    <div className="flex items-center gap-1.5 bg-teal-50/40 p-1 rounded-full border border-teal-100/50 mt-1">
                      <button
                        type="button"
                        onClick={() => modifyScoreboardHole('iron2', -1)}
                        className="w-8 h-8 rounded-full bg-white text-teal-700 hover:bg-teal-50 border border-teal-100 font-bold text-sm shadow-sm flex justify-center items-center active:scale-95"
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-black text-base text-teal-700">
                        {scoreboardHoles[activeHoleIndex].iron2}
                      </span>
                      <button
                        type="button"
                        onClick={() => modifyScoreboardHole('iron2', 1)}
                        className="w-8 h-8 rounded-full bg-white text-teal-700 hover:bg-teal-50 border border-teal-100 font-bold text-sm shadow-sm flex justify-center items-center active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Putts */}
                  <div className="w-full flex flex-col items-center text-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Putt</span>
                    <div className="flex items-center gap-1.5 bg-teal-50/40 p-1 rounded-full border border-teal-100/50 mt-1">
                      <button
                        type="button"
                        onClick={() => modifyScoreboardHole('putt2', -1)}
                        className="w-8 h-8 rounded-full bg-white text-teal-700 hover:bg-teal-50 border border-teal-100 font-bold text-sm shadow-sm flex justify-center items-center active:scale-95"
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-black text-base text-teal-700">
                        {scoreboardHoles[activeHoleIndex].putt2}
                      </span>
                      <button
                        type="button"
                        onClick={() => modifyScoreboardHole('putt2', 1)}
                        className="w-8 h-8 rounded-full bg-white text-teal-700 hover:bg-teal-50 border border-teal-100 font-bold text-[15px] shadow-sm flex justify-center items-center active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <span className="text-xs font-black text-teal-700 pt-1.5">
                    Total: {scoreboardHoles[activeHoleIndex].iron2 + scoreboardHoles[activeHoleIndex].putt2}
                  </span>
                </div>

              </div>

            </div>

            {/* Grand Totals Card */}
            <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100/70 text-center shadow-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase">SK Total</span>
                  <span className="text-2xl font-black text-emerald-700 mt-0.5">{totalCombinedP1}</span>
                </div>
                <div className="flex flex-col border-l border-emerald-100">
                  <span className="text-[10px] font-bold text-teal-800 uppercase">KY Total</span>
                  <span className="text-2xl font-black text-teal-700 mt-0.5">{totalCombinedP2}</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* --- TAB 2: COURSES VIEW --- */}
        {activeTab === 'course' && (
          <div className="space-y-4 fade-in">
            
            {/* Map GPS simulator card (always present) */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-base font-bold text-gray-800 mb-1 flex items-center">
                <span className="mr-2">🗺️</span> Course Location / 골프장 지도 시뮬레이터
              </h2>
              <p className="text-[11px] text-gray-400 mb-4 font-medium leading-relaxed">
                지도 영역을 클릭하면 GPS 위치가 시뮬레이션 변경되며, 이 핀 주소를 기준으로 신규 골프장을 등록할 수 있습니다.
              </p>
              
              <div 
                onClick={handleMapClick}
                className="w-full h-36 bg-emerald-50 border border-emerald-100 rounded-xl flex flex-col items-center justify-center relative cursor-crosshair overflow-hidden group shadow-inner"
              >
                <div className="absolute inset-0 bg-opacity-15 bg-[radial-gradient(#059669_1px,transparent_1px)] [background-size:16px_16px]"></div>
                
                <div className="z-10 bg-white px-3.5 py-1.5 rounded-full shadow-md border border-gray-100 text-xs text-gray-700 flex items-center space-x-1.5 transition-all">
                  <span>📍</span> 
                  <span className="font-bold text-emerald-800">
                    Lat: {Number(mapClickedCoords?.lat || 33.3541).toFixed(4)}, Lng: {Number(mapClickedCoords?.lng || 126.3712).toFixed(4)}
                  </span>
                </div>
                <div className="absolute bottom-2 text-[9px] text-gray-400 font-bold uppercase tracking-widest text-center select-none">
                  클릭하여 핀 위치 변경하기
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setShowCourseModal(true)}
                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-4 rounded-xl text-sm transition-all shadow-md active:scale-95"
              >
                ⛳ Add Golf Course / 골프장 등록하기
              </button>
            </div>

            {/* Interactive Registration Modal Overlays */}
            {showCourseModal && (
              <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto p-5 shadow-2xl border border-gray-100 flex flex-col">
                  
                  {/* Modal Header */}
                  <div className="flex justify-between items-center pb-3 border-b border-gray-100 mb-4">
                    <h3 className="text-base font-bold text-gray-800 flex items-center">
                      <span className="mr-2">⛳</span> {editingCourseId ? 'Edit Golf Course Info' : 'Enter New Golf Course Info'}
                    </h3>
                    <button 
                      type="button"
                      onClick={closeCourseModal}
                      className="text-gray-400 hover:text-gray-650 font-bold text-lg p-1"
                    >
                      ✕
                    </button>
                  </div>

                  <p className="text-[11px] text-emerald-850 font-semibold mb-3 bg-emerald-50 p-2.5 rounded-lg text-center">
                    📍 Simulated GPS - Lat: {mapClickedCoords.lat}, Lng: {mapClickedCoords.lng}
                  </p>

                  <form onSubmit={handleSaveCourse} className="space-y-4 text-left">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">Golf Course Name *</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Nine Bridges CC" 
                        className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        value={newCourse.name}
                        onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">Golf Course Address</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Jeju, South Korea" 
                        className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        value={newCourse.address}
                        onChange={(e) => setNewCourse({ ...newCourse, address: e.target.value })}
                      />
                    </div>

                    {/* Individual Hole Par Editor Inside Modal */}
                    <div>
                      <span className="block text-[11px] font-bold text-emerald-800 uppercase mb-1">
                        ⛳ Default Par per Hole (Tap to Edit)
                      </span>
                      <div className="bg-gray-50 p-2 text-center rounded-xl border border-gray-150 grid grid-cols-9 gap-1 shadow-inner">
                        {courseHolePars.map((p, idx) => (
                          <div
                            key={idx}
                            onClick={() => setEditingParHoleIndex(idx)}
                            className="bg-white hover:bg-emerald-50 border border-gray-200 rounded p-1.5 cursor-pointer flex flex-col items-center"
                          >
                            <span className="text-[7px] text-gray-400 font-bold">H{idx+1}</span>
                            <span className="text-[11px] font-black text-emerald-700">{p}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-gray-500 mt-1.5 px-1">
                        <span>Calculated Total Par:</span>
                        <span className="font-extrabold text-emerald-700">
                          {courseHolePars.reduce((s,v)=>s+v, 0)} Par
                        </span>
                      </div>
                    </div>

                    {/* Difficulty adjusters */}
                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-150 space-y-3">
                      <span className="block text-[10px] font-bold text-gray-500 uppercase">Tee-box Ratings & Slopes (Tee Info)</span>
                      
                      {/* Lady Tee */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white p-2 rounded-lg border border-gray-200">
                          <label className="block text-[9px] font-bold text-pink-700">Lady Rating</label>
                          <div className="flex justify-between items-center font-bold mt-1">
                            <button
                              type="button"
                              onClick={() => setNewCourse(p => ({ ...p, ladyRating: Math.max(1, (p.ladyRating || 72.0) - 0.1) }))}
                              className="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded flex items-center justify-center text-xs"
                            >
                              ▼
                            </button>
                            <span className="font-black text-pink-600">{Number(newCourse?.ladyRating || 72.0).toFixed(1)}</span>
                            <button
                              type="button"
                              onClick={() => setNewCourse(p => ({ ...p, ladyRating: Math.min(150, (p.ladyRating || 72.0) + 0.1) }))}
                              className="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded flex items-center justify-center text-xs"
                            >
                              ▲
                            </button>
                          </div>
                        </div>

                        <div className="bg-white p-2 rounded-lg border border-gray-200">
                          <label className="block text-[9px] font-bold text-pink-700">Lady Slope</label>
                          <div className="flex justify-between items-center font-bold mt-1">
                            <button
                              type="button"
                              onClick={() => setNewCourse(p => ({ ...p, ladySlope: Math.max(1, p.ladySlope - 1) }))}
                              className="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded flex items-center justify-center text-xs"
                            >
                              ▼
                            </button>
                            <span className="font-black text-pink-600">{newCourse.ladySlope}</span>
                            <button
                              type="button"
                              onClick={() => setNewCourse(p => ({ ...p, ladySlope: Math.min(300, p.ladySlope + 1) }))}
                              className="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded flex items-center justify-center text-xs"
                            >
                              ▲
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Blue Tee */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white p-2 rounded-lg border border-gray-200">
                          <label className="block text-[9px] font-bold text-blue-700">Blue Rating</label>
                          <div className="flex justify-between items-center font-bold mt-1">
                            <button
                              type="button"
                              onClick={() => setNewCourse(p => ({ ...p, blueRating: Math.max(1, (p.blueRating || 72.0) - 0.1) }))}
                              className="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded flex items-center justify-center text-xs"
                            >
                              ▼
                            </button>
                            <span className="font-black text-blue-600">{Number(newCourse?.blueRating || 72.0).toFixed(1)}</span>
                            <button
                              type="button"
                              onClick={() => setNewCourse(p => ({ ...p, blueRating: Math.min(150, (p.blueRating || 72.0) + 0.1) }))}
                              className="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded flex items-center justify-center text-xs"
                            >
                              ▲
                            </button>
                          </div>
                        </div>

                        <div className="bg-white p-2 rounded-lg border border-gray-200">
                          <label className="block text-[9px] font-bold text-blue-700">Blue Slope</label>
                          <div className="flex justify-between items-center font-bold mt-1">
                            <button
                              type="button"
                              onClick={() => setNewCourse(p => ({ ...p, blueSlope: Math.max(1, p.blueSlope - 1) }))}
                              className="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded flex items-center justify-center text-xs"
                            >
                              ▼
                            </button>
                            <span className="font-black text-blue-600">{newCourse.blueSlope}</span>
                            <button
                              type="button"
                              onClick={() => setNewCourse(p => ({ ...p, blueSlope: Math.min(300, p.blueSlope + 1) }))}
                              className="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded flex items-center justify-center text-xs"
                            >
                              ▲
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Form Controls */}
                    <div className="flex gap-2.5 pt-2">
                      <button 
                        type="button"
                        onClick={closeCourseModal}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 px-4 rounded-xl text-xs transition"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition active:scale-95"
                      >
                        Register
                      </button>
                    </div>

                  </form>
                </div>
              </div>
            )}

            {/* Individual Par Select Popover */}
            {editingParHoleIndex !== null && (
              <div className="fixed inset-0 bg-black/45 z-[110] flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-5 max-w-xs w-full text-center space-y-3 shadow-2xl animate-scaleIn">
                  <span className="text-sm font-extrabold text-emerald-800 block">Select Par for Hole {editingParHoleIndex + 1}</span>
                  <p className="text-xs text-gray-400">Select standard strokes (Par 3, 4, or 5) for this hole:</p>
                  
                  <div className="flex justify-center gap-3 py-2">
                    {[3, 4, 5].map(pOption => {
                      const isSelected = courseHolePars[editingParHoleIndex] === pOption;
                      return (
                        <button
                          key={pOption}
                          type="button"
                          onClick={() => {
                            const nextPars = [...courseHolePars];
                            nextPars[editingParHoleIndex] = pOption;
                            setCourseHolePars(nextPars);
                            setEditingParHoleIndex(null);
                          }}
                          className={`w-14 h-14 rounded-xl flex items-center justify-center font-black text-lg transition ${
                            isSelected 
                              ? 'bg-emerald-600 text-white shadow' 
                              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                          }`}
                        >
                          {pOption}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditingParHoleIndex(null)}
                    className="w-full text-xs text-gray-400 hover:text-gray-600 p-1.5 font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Registered Course Cards Profile Feed */}
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold text-gray-700 px-1 uppercase tracking-wider">📍 Registered Course Profiles</h3>
              
              {courses.map(course => {
                const courseHistories = scores.filter(s => s.courseId === course.id);

                return (
                  <div key={course.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-3 relative">
                    
                    {/* Header info */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-extrabold text-gray-800 text-base leading-snug truncate">{course.name}</h4>
                          <button
                            type="button"
                            onClick={() => handleStartEditCourse(course)}
                            className="px-2 py-0.5 text-xs text-emerald-700 font-bold bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200/50 flex items-center justify-center transition"
                            title="Edit"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCourse(course.id)}
                            className="px-2 py-0.5 text-xs text-rose-700 font-bold bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200/50 flex items-center justify-center transition"
                            title="Delete"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 truncate"><strong>Address:</strong> {course.address}</p>
                        <p className="text-[10px] text-gray-400 font-semibold font-mono leading-none mt-0.5">Location: {course.lat}, {course.lng}</p>
                      </div>
                      
                      <div className="text-right text-[10px] rounded-lg bg-emerald-50/50 px-2.5 py-1.5 min-w-[105px] border border-emerald-100/30 flex flex-col gap-0.5 shadow-sm">
                        <span className="font-bold text-rose-700">Lady: {Number(course.ladyRating || 72.0).toFixed(1)} (S:{course.ladySlope || 113})</span>
                        <span className="font-bold text-blue-700">Blue: {Number(course.blueRating || 72.0).toFixed(1)} (S:{course.blueSlope || 113})</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                      <span className="font-bold text-gray-600">⛳ Total Par</span>
                      <span className="font-black text-emerald-700 text-sm">{course.totalPar || 72} Par</span>
                    </div>

                    <div className="flex justify-between items-center text-xs bg-emerald-50/30 p-3 rounded-xl border border-emerald-150/30">
                      <span className="font-bold text-emerald-800">🏆 Total Played Rounds</span>
                      <span className="font-black text-emerald-700 text-sm">{courseHistories.length} Rounds</span>
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* --- TAB 3: SHARED HISTORY MEMORIES GALLERY --- */}
        {activeTab === 'history' && (
          <div className="space-y-4 fade-in">
            <h2 className="text-lg font-bold text-gray-800 px-1 ml-1 flex items-center">
              <span className="mr-2">📸</span> Our Shared Memories
            </h2>
            
            {scores.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-dotted border-gray-200">
                <p className="font-bold text-gray-500">No game logs found.</p>
                <p className="text-xs mt-1">Submit your first score in the first tab to begin!</p>
              </div>
            ) : (
              [...scores]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map(score => {
                  const totalStrokesP1 = (score.holes || []).reduce((sum, h) => sum + (h.iron || 0) + (h.putt || 0), 0);
                  const totalStrokesP2 = (score.holes || []).reduce((sum, h) => sum + (h.iron2 || 0) + (h.putt2 || 0), 0);

                  return (
                    <div 
                      key={score.id} 
                      onClick={() => setSelectedHistoryScore(score)}
                      className="bg-white rounded-2xl shadow-sm border border-gray-150 p-4 flex justify-between items-center cursor-pointer hover:bg-emerald-50/10 active:scale-[0.99] transition-all"
                    >
                      <div>
                        <h3 className="font-extrabold text-gray-805 text-sm leading-snug">{score.courseName}</h3>
                        <p className="text-[10px] text-gray-400 font-bold mt-1">📅 {formatPlayDate(score.date)}</p>
                      </div>
                      <div className="text-right flex flex-col gap-0.5 shrink-0 select-none border-l border-gray-100 pl-3.5">
                        <span className="text-[11px] text-emerald-800 font-bold">
                          SK: <strong className="font-black text-emerald-700 text-sm">{totalStrokesP1}</strong> Str
                        </span>
                        {totalStrokesP2 > 0 && (
                          <span className="text-[11px] text-teal-800 font-bold">
                            KY: <strong className="font-black text-teal-700 text-sm">{totalStrokesP2}</strong> Str
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
            )}

            {/* Scorecard detail & photo upload popup */}
            {selectedHistoryScore && (() => {
              const activeDetailScore = scores.find(s => s.id === selectedHistoryScore.id);
              if (!activeDetailScore) return null;

              const holes = activeDetailScore.holes || [];
              const totalStrokesP1 = holes.reduce((sum, h) => sum + (h.iron || 0) + (h.putt || 0), 0);
              const totalPuttsP1 = holes.reduce((sum, h) => sum + (h.putt || 0), 0);

              const totalStrokesP2 = holes.reduce((sum, h) => sum + (h.iron2 || 0) + (h.putt2 || 0), 0);
              const totalPuttsP2 = holes.reduce((sum, h) => sum + (h.putt2 || 0), 0);

              return (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto p-5 shadow-2xl border border-gray-100 flex flex-col space-y-4">
                    
                    {/* Modal Header */}
                    <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                      <div>
                        <h3 className="text-sm font-extrabold text-emerald-800 leading-snug">
                          ⛳ {activeDetailScore.courseName}
                        </h3>
                        <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                          📅 {formatPlayDate(activeDetailScore.date)} Detailed Stats
                        </p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setSelectedHistoryScore(null)}
                        className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Photos Gallery Section */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-extrabold text-emerald-850 uppercase tracking-wider">📷 Photos & Memories</span>
                        <label className="text-[10px] text-emerald-700 font-black bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg border border-emerald-200/50 cursor-pointer transition select-none flex items-center gap-0.5">
                          <span>➕ Add Photo</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => handlePhotoUpload(activeDetailScore.id, e)} 
                          />
                        </label>
                      </div>

                      {!activeDetailScore.photos || activeDetailScore.photos.length === 0 ? (
                        <div className="text-center py-6 text-gray-300 bg-gray-50/70 border border-dotted border-gray-200 rounded-xl">
                          <p className="text-xs">No registered photos. Feel free to upload your first photo!</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 py-0.5">
                          {activeDetailScore.photos.map((photo, i) => (
                            <div key={i} className="aspect-square rounded-xl overflow-hidden bg-gray-50 border border-gray-150 relative group">
                              <img src={photo} alt="round memorial" className="w-full h-full object-cover" />
                              <button 
                                type="button"
                                onClick={() => {
                                  setScores(prev => prev.map(s => {
                                    if (s.id === activeDetailScore.id) {
                                      const u = [...s.photos];
                                      u.splice(i, 1);
                                      return { ...s, photos: u };
                                    }
                                    return s;
                                  }))
                                }}
                                className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center hover:bg-black/80 shadow"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Final Score Card Badge */}
                    <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50 text-center space-y-2.5">
                      <span className="text-[11px] font-extrabold text-emerald-850 uppercase tracking-widest block">🏆 Final Scoreboard Summary</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col text-center">
                          <span className="text-[9px] font-bold text-emerald-850 uppercase">👦 SK Score</span>
                          <span className="text-base font-black text-emerald-700 mt-0.5">{totalStrokesP1} Str <span className="text-[10px] font-normal text-emerald-600">({totalPuttsP1}P)</span></span>
                        </div>
                        <div className="flex flex-col text-center border-l border-emerald-100/80">
                          <span className="text-[9px] font-bold text-teal-850 uppercase">👩 KY Score</span>
                          <span className="text-base font-black text-teal-700 mt-0.5">
                            {totalStrokesP2 > 0 ? `${totalStrokesP2} Str (${totalPuttsP2}P)` : '-'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 18-hole detailed Scorecard Table */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-extrabold text-emerald-850 uppercase tracking-wider block">📊 Detailed Scorecard per Hole</span>
                      <div className="border border-gray-150 rounded-xl overflow-hidden flex flex-col bg-white text-center text-xs">
                        {/* Table Header */}
                        <div className="bg-emerald-600 text-white py-2 px-3 font-bold flex text-center items-center font-mono">
                          <div className="w-12 text-[10px]">Hole</div>
                          <div className="flex-1 text-[11px]">SK (Putts)</div>
                          <div className="flex-1 text-[11px]">KY (Putts)</div>
                        </div>
                        
                        {/* Scrollable list items rows */}
                        <div className="max-h-40 overflow-y-auto divide-y divide-gray-100 font-medium font-mono">
                          {holes.map((h, k) => {
                            const p1T = h.iron + h.putt;
                            const p2T = h.iron2 + h.putt2;
                            return (
                              <div key={k} className="flex py-2 px-3 hover:bg-gray-50/50 items-center justify-between text-center leading-none">
                                <div className="w-12 font-bold text-gray-400">{h.hole}H</div>
                                <div className="flex-1 font-semibold text-emerald-800">
                                  {p1T > 0 ? `${p1T} Str (${h.putt}P)` : '-'}
                                </div>
                                <div className="flex-1 font-semibold text-teal-800">
                                  {p2T > 0 ? `${p2T} Str (${h.putt2}P)` : '-'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Close Button at bottom */}
                    <button 
                      type="button"
                      onClick={() => setSelectedHistoryScore(null)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition active:scale-95 shadow"
                    >
                      Confirm / Close
                    </button>

                  </div>
                </div>
              );
            })()}
          </div>
        )}

      </main>

      {/* Styled Bottom Navigation Toolbar (Stay fixed in mobile frames) */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-150 flex justify-around py-3.5 shadow-xl z-50">
        <button 
          onClick={() => setActiveTab('score')}
          className={`flex flex-col items-center space-y-1 transition-all active:scale-95 ${activeTab === 'score' ? 'text-emerald-600 scale-105 font-bold' : 'text-gray-400 hover:text-gray-650'}`}
        >
          <span className="text-lg leading-tight">📝</span>
          <span className="text-xs font-bold leading-tight">Scoreboard</span>
        </button>
        <button 
          onClick={() => setActiveTab('course')}
          className={`flex flex-col items-center space-y-1 transition-all active:scale-95 ${activeTab === 'course' ? 'text-emerald-600 scale-105 font-bold' : 'text-gray-400 hover:text-gray-650'}`}
        >
          <span className="text-lg leading-tight">🗺️</span>
          <span className="text-xs font-bold leading-tight">Courses</span>
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center space-y-1 transition-all active:scale-105 ${activeTab === 'history' ? 'text-emerald-600 scale-105 font-bold' : 'text-gray-400 hover:text-gray-650'}`}
        >
          <span className="text-lg leading-tight">📸</span>
          <span className="text-xs font-bold leading-tight">History</span>
        </button>
      </nav>

      {/* Firebase Database Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm border border-gray-150 shadow-2xl space-y-4 animate-fade-in text-left">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="font-extrabold text-gray-800 flex items-center gap-1.5">
                <span>🔥</span> Firebase Dynamic Sync
              </h3>
              <button 
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="text-gray-400 hover:text-gray-650 text-lg font-bold p-1 outline-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Firebase Realtime DB URL</label>
                <input 
                  type="text" 
                  className="w-full text-xs font-semibold p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 text-gray-800"
                  value={firebaseUrl}
                  onChange={(e) => setFirebaseUrl(e.target.value)}
                  placeholder="https://your-project-rtdb.firebaseio.com"
                />
                <p className="text-[9px] text-gray-400 mt-1 leading-relaxed">
                  * Leaving it empty automatically reverts to default live channel.
                </p>
              </div>

              <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100 text-[10px] text-emerald-950 leading-relaxed font-semibold">
                📌 <strong>실시간 자동 동기화 안내:</strong><br/>
                휴대폰 앱과 AI Studio 화면이 동일한 데이터베이스 채널을 사용합니다. 한쪽에서 점수를 입력하거나 코스를 저장하면, 실시간으로 다른 화면이 동기화됩니다!
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              className="w-full py-3 bg-gray-800 hover:bg-gray-900 text-white font-extrabold text-xs rounded-xl shadow-md transition active:scale-95 outline-none"
            >
              닫기 (Close)
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
