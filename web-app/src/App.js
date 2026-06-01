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
  if (!score || score <= 0) return <span className="text-gray-450 text-xs font-medium h-6 flex items-center justify-center">-</span>;
  
  const diff = score - par;
  const baseStyle = {
    width: '20px',
    height: '20px',
    minWidth: '20px',
    minHeight: '20px',
    maxWidth: '20px',
    maxHeight: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    aspectRatio: '1 / 1',
    flexShrink: 0
  };

  if (diff === -1) {
    // Birdie: 빨간색 동그라미 안에 숫자
    return (
      <div 
        style={baseStyle}
        className="rounded-full border border-red-500 bg-red-50/40 shadow-sm animate-fadeIn shrink-0 aspect-square"
      >
        <span className="text-[11px] font-black text-red-500 leading-none">{score}</span>
      </div>
    );
  } else if (diff <= -2) {
    // Eagle or Albatross: 두줄짜리 빨간색 동그라미
    return (
      <div 
        style={{ ...baseStyle, position: 'relative' }}
        className="shadow-sm animate-fadeIn shrink-0 aspect-square"
      >
        <div className="absolute inset-0 border border-red-500 rounded-full"></div>
        <div className="absolute inset-[1.5px] border border-red-500 rounded-full"></div>
        <span className="text-[11px] font-black text-red-500 z-10 leading-none">{score}</span>
      </div>
    );
  } else if (diff === 1) {
    // Bogey: 파란색 네모 안에 숫자
    return (
      <div 
        style={baseStyle}
        className="border border-blue-500 bg-blue-50/30 rounded-none shadow-sm animate-fadeIn shrink-0 aspect-square"
      >
        <span className="text-[11px] font-black text-blue-500 leading-none">{score}</span>
      </div>
    );
  } else if (diff >= 2) {
    // Double bogey and more: 두줄짜리 네모 안에 숫자
    return (
      <div 
        style={{ ...baseStyle, position: 'relative' }}
        className="shadow-sm animate-fadeIn shrink-0 aspect-square"
      >
        <div className="absolute inset-0 border border-blue-600 rounded-none"></div>
        <div className="absolute inset-[1.5px] border border-blue-600 rounded-none"></div>
        <span className="text-[11px] font-black text-blue-600 z-10 leading-none">{score}</span>
      </div>
    );
  } else {
    // Par
    return (
      <div style={baseStyle} className="shrink-0 aspect-square">
        <span className={`text-[13px] font-extrabold leading-none ${isSelected ? 'text-emerald-800 font-black' : 'text-gray-800'}`}>{score}</span>
      </div>
    );
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState('score'); // 'score', 'course', 'history'
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [selectedHistoryScore, setSelectedHistoryScore] = useState(null);
  const [fullscreenPhotoUrl, setFullscreenPhotoUrl] = useState(null);

  // Load from LocalStorage if exists
  const [scores, setScores] = useState(() => {
    const saved = localStorage.getItem('golf_diary_scores');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed)) {
          // Dynamically filter out 'Jeju' game record as requested
          const filtered = parsed.filter(score => score && (!score.courseName || typeof score.courseName !== 'string' || !score.courseName.toLowerCase().includes('jeju')));
          localStorage.setItem('golf_diary_scores', JSON.stringify(filtered));
          return filtered;
        }
      } catch (e) {
        console.error("Error reading scores from localStorage", e);
      }
    }
    return [];
  });

  const [courses, setCourses] = useState(() => {
    const saved = localStorage.getItem('golf_diary_courses');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed)) return parsed;
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
  const [tempFirebaseUrl, setTempFirebaseUrl] = useState(firebaseUrl);
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);
  const [syncStatus, setSyncStatus] = useState('syncing'); // 'syncing', 'synced', 'error'
  const [lastSyncedTime, setLastSyncedTime] = useState('Connecting...');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // Settings modal
  const [cloudCoursesCount, setCloudCoursesCount] = useState('-');
  const [cloudScoresCount, setCloudScoresCount] = useState('-');
  const [settingsMessage, setSettingsMessage] = useState('');

  const syncChannel = 'skky_golf_live_sync_signey99';
  const isFirebaseListening = useRef(false);

  // Sync temp input when the actual saved firebaseUrl changes or settings opens
  useEffect(() => {
    setTempFirebaseUrl(firebaseUrl);
  }, [firebaseUrl, isSettingsOpen]);

  useEffect(() => {
    localStorage.setItem('golf_diary_fb_url', firebaseUrl);
  }, [firebaseUrl]);

  // Reset main content scroll when tab changes
  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTop = 0;
    }
  }, [activeTab]);

  // Utility to prevent Firebase SDK & fetch calls from hanging indefinitely (max timeout)
  const withTimeout = (promise, ms = 3000) => {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Timeout of ${ms}ms exceeded`));
      }, ms);
    });
    return Promise.race([promise, timeoutPromise]).then(
      (res) => {
        clearTimeout(timeoutId);
        return res;
      },
      (err) => {
        clearTimeout(timeoutId);
        throw err;
      }
    );
  };

  // Helper helper to upload cloud silently to fallback web-sync bucket
  const silentUploadToFallback = async (currentScores, currentCourses, timestamp) => {
    try {
      const payload = {
        scores: currentScores,
        courses: currentCourses,
        updatedAt: timestamp
      };
      // Use text/plain;charset=UTF-8 to bypass CORS OPTIONS preflight blockages on older Android systems/proxies
      const res = await withTimeout(fetch(`https://kvdb.io/CpUkTKkoimWd11fnhp6BBA/${syncChannel}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify(payload)
      }), 4000);
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
        // Timeout writes so a dead Firebase connection does not freeze our entire upload/callbacks
        await withTimeout(db.ref(syncChannel).set({
          scores: currentScores,
          courses: currentCourses,
          updatedAt: timestamp
        }), 2500);
      }
    } catch (e) {
      console.warn("Firebase set skipped or failed", e);
    }

    // C. Push to Firebase Realtime Database via REST API (Ultra-failsafe / text/plain simple request bypass)
    try {
      if (firebaseUrl.trim()) {
        const baseUrlNormalized = firebaseUrl.trim().replace(/\/$/, "");
        const url = `${baseUrlNormalized}/${syncChannel}.json`;
        await withTimeout(fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: JSON.stringify({
            scores: currentScores,
            courses: currentCourses,
            updatedAt: timestamp
          })
        }), 3000);
      }
    } catch (e) {
      console.warn("Firebase REST upload failed", e);
    }
  };

  // Handle manual force upload to cloud
  const handleForceUpload = async () => {
    try {
      setSettingsMessage('Uploading data to cloud...');
      const timestamp = Date.now();
      localStorage.setItem('golf_diary_last_sync_timestamp', String(timestamp));
      await uploadToCloud(scores, courses, timestamp);
      
      setCloudCoursesCount(courses.length);
      setCloudScoresCount(scores.length);
      setSettingsMessage('📤 Successfully uploaded local data to cloud database!');
      setTimeout(() => setSettingsMessage(''), 4500);
    } catch (e) {
      console.error(e);
      setSettingsMessage('❌ Upload failed: ' + e.message);
    }
  };

  // Handle manual force download from cloud
  const handleForceDownload = async () => {
    try {
      setSettingsMessage('Downloading data from cloud...');
      
      let cloudData = null;
      let downloadSource = '';

      // 1. Try Firebase RTDB (using SDK if available, or REST API as immediate fallback)
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
          // SDK once() hangs forever if network unreachable or 404 URL. We cap with 2.5s timeout.
          const snapshot = await withTimeout(db.ref(syncChannel).once('value'), 2500);
          const fbData = snapshot.val();
          if (fbData && fbData.updatedAt) {
            cloudData = fbData;
            downloadSource = 'Firebase Realtime DB';
          }
        } catch (fbSdkErr) {
          console.warn("Firebase SDK download timed out/failed, trying REST API", fbSdkErr);
          // Try REST API if SDK failed
          try {
            const baseUrlNormalized = firebaseUrl.trim().replace(/\/$/, "");
            const res = await withTimeout(fetch(`${baseUrlNormalized}/${syncChannel}.json`), 2500);
            if (res.ok) {
              const fbRestData = await res.json();
              if (fbRestData && fbRestData.updatedAt) {
                cloudData = fbRestData;
                downloadSource = 'Firebase REST API';
              }
            }
          } catch (fbRestErr) {
            console.warn("Firebase REST download failed", fbRestErr);
          }
        }
      } else if (firebaseUrl.trim()) {
        // If SDK is not loaded but URL exists, try REST API immediately
        try {
          const baseUrlNormalized = firebaseUrl.trim().replace(/\/$/, "");
          const res = await withTimeout(fetch(`${baseUrlNormalized}/${syncChannel}.json`), 2500);
          if (res.ok) {
            const fbRestData = await res.json();
            if (fbRestData && fbRestData.updatedAt) {
              cloudData = fbRestData;
              downloadSource = 'Firebase REST API';
            }
          }
        } catch (fbRestErr) {
          console.warn("Firebase REST download failed", fbRestErr);
        }
      }

      // 2. If Firebase didn't return data, try Web-Sync Fallback (kvdb.io)
      if (!cloudData) {
        try {
          const res = await withTimeout(fetch(`https://kvdb.io/CpUkTKkoimWd11fnhp6BBA/${syncChannel}`), 3000);
          if (res.ok) {
            const kvData = await res.json();
            if (kvData && kvData.updatedAt) {
              cloudData = kvData;
              downloadSource = 'Web-Sync Fallback (kvdb)';
            }
          }
        } catch (kvErr) {
          console.warn("KVDB fallback download failed", kvErr);
        }
      }

      if (cloudData && cloudData.updatedAt) {
        lastDownloadedDataStringRef.current = JSON.stringify({
          scores: cloudData.scores || [],
          courses: cloudData.courses || []
        });
        setScores(cloudData.scores || []);
        setCourses(cloudData.courses || []);
        localStorage.setItem('golf_diary_scores', JSON.stringify(cloudData.scores || []));
        localStorage.setItem('golf_diary_courses', JSON.stringify(cloudData.courses || []));
        localStorage.setItem('golf_diary_last_sync_timestamp', String(cloudData.updatedAt));
        
        setCloudCoursesCount((cloudData.courses || []).length);
        setCloudScoresCount((cloudData.scores || []).length);
        
        const coursesCount = (cloudData.courses || []).length;
        const scoresCount = (cloudData.scores || []).length;
        setSettingsMessage(`📥 Successfully downloaded [${downloadSource}]! (Courses: ${coursesCount}, Rounds: ${scoresCount})`);
        setTimeout(() => setSettingsMessage(''), 6000);
        return;
      }
      
      setSettingsMessage('❌ No backup data found in the cloud (Firebase & Fallback both empty).');
    } catch (e) {
      console.error(e);
      setSettingsMessage('❌ Download failed: ' + e.message);
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
              if (cloudData) {
                if (cloudData.courses) setCloudCoursesCount(cloudData.courses.length);
                if (cloudData.scores) setCloudScoresCount(cloudData.scores.length);
                
                if (cloudData.updatedAt) {
                  const localTimestamp = Number(localStorage.getItem('golf_diary_last_sync_timestamp') || '0');
                  const isLocalEmpty = (scoresRef.current.length === 0);

                  if (cloudData.updatedAt > localTimestamp || isLocalEmpty) {
                    console.log("[Firebase RTDB] Live sync update received (forced overwrite due to empty scores or newer cloud date)!", cloudData);
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
          const res = await fetch(`https://kvdb.io/CpUkTKkoimWd11fnhp6BBA/${syncChannel}`);
          if (res.ok) {
            const cloudData = await res.json();
            if (cloudData) {
              if (cloudData.courses) setCloudCoursesCount(cloudData.courses.length);
              if (cloudData.scores) setCloudScoresCount(cloudData.scores.length);

              if (cloudData.updatedAt) {
                const localTimestamp = Number(localStorage.getItem('golf_diary_last_sync_timestamp') || '0');
                const isLocalEmpty = (scoresRef.current.length === 0);

                if (cloudData.updatedAt > localTimestamp || isLocalEmpty) {
                  console.log("[Web Sync Fallback] Newer/forced sync update loaded!", cloudData);
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
            }
          } else if (res.status === 404) {
            // First time bootstrapping
            const localTimestamp = Number(localStorage.getItem('golf_diary_last_sync_timestamp') || '0');
            // ONLY upload if the user actually has local data to avoid overriding cloud with empty state
            if (scoresRef.current.length > 0 || coursesRef.current.length > 1) {
              await silentUploadToFallback(scoresRef.current, coursesRef.current, localTimestamp || Date.now());
            }
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
  const [selectedCourseId, setSelectedCourseId] = useState(() => {
    return localStorage.getItem('golf_diary_selected_course_id') || '';
  });
  const [isNewCourse, setIsNewCourse] = useState(() => {
    return localStorage.getItem('golf_diary_is_new_course') === 'true';
  });
  const [newCourseNameInput, setNewCourseNameInput] = useState(() => {
    return localStorage.getItem('golf_diary_new_course_name_input') || '';
  });
  
  // Format YYYY-MM-DD as default date for native calendar picker
  const getDefaultDate = () => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${yyyy}-${mm}-${dd}`;
  };
  const [playDate, setPlayDate] = useState(() => {
    return localStorage.getItem('golf_diary_play_date') || getDefaultDate();
  });

  // Dual-Player scorecard details (1-18 holes)
  const [scoreboardHoles, setScoreboardHoles] = useState(() => {
    const saved = localStorage.getItem('golf_diary_scoreboard_holes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed) && parsed.length === 18) {
          return parsed;
        }
      } catch (e) {
        console.error("Error reading saved scoreboard holes", e);
      }
    }
    return Array.from({ length: 18 }, (_, i) => ({
      hole: i + 1,
      iron: 0,
      putt: 0,
      iron2: 0,
      putt2: 0
    }));
  });
  const [activeHoleIndex, setActiveHoleIndex] = useState(() => {
    const saved = localStorage.getItem('golf_diary_active_hole_index');
    return saved !== null ? Number(saved) : 0;
  });
  const [isScoreInputModalOpen, setIsScoreInputModalOpen] = useState(false);
  const [editingHoleIndex, setEditingHoleIndex] = useState(null);

  useEffect(() => {
    localStorage.setItem('golf_diary_selected_course_id', selectedCourseId);
  }, [selectedCourseId]);

  useEffect(() => {
    localStorage.setItem('golf_diary_is_new_course', String(isNewCourse));
  }, [isNewCourse]);

  useEffect(() => {
    localStorage.setItem('golf_diary_new_course_name_input', newCourseNameInput);
  }, [newCourseNameInput]);

  useEffect(() => {
    localStorage.setItem('golf_diary_play_date', playDate);
  }, [playDate]);

  useEffect(() => {
    localStorage.setItem('golf_diary_scoreboard_holes', JSON.stringify(scoreboardHoles));
  }, [scoreboardHoles]);

  useEffect(() => {
    localStorage.setItem('golf_diary_active_hole_index', String(activeHoleIndex));
  }, [activeHoleIndex]);

  const openScoreModal = (index) => {
    setEditingHoleIndex(index);
    setIsScoreInputModalOpen(true);
  };

  // --- COURSE TAB STATES ---
  const [newCourse, setNewCourse] = useState({
    name: '',
    address: '',
    phone: '', // Phone number field
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
  const [courseSearchQuery, setCourseSearchQuery] = useState('');

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
      phone: course.phone || '', // Load phone number properties
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
      phone: '', // Reset phone
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
      phone: newCourse.phone || '', // Persist phone number
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
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          
          // Downscale high resolution photos to max 1200px in either dimension
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          
          if (width > MAX_WIDTH || height > MAX_HEIGHT) {
            if (width > height) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            } else {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }
          
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Compress quality to 0.75 for super lightweight but crisp file
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
          
          setScores(prevScores => 
            prevScores.map(score => {
              if (score.id === scoreId) {
                return { ...score, photos: [...(score.photos || []), compressedDataUrl] };
              }
              return score;
            })
          );
        };
        img.src = e.target.result;
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

  const modifyScoreboardHoleIndex = (index, field, dChange) => {
    const nextHoles = [...scoreboardHoles];
    const currentVal = nextHoles[index][field] || 0;
    nextHoles[index][field] = Math.max(0, currentVal + dChange);
    setScoreboardHoles(nextHoles);
  };

  // Grand totals
  const totalCombinedP1 = scoreboardHoles.reduce((sum, h) => sum + (h.iron || 0) + (h.putt || 0), 0);
  const totalCombinedP2 = scoreboardHoles.reduce((sum, h) => sum + (h.iron2 || 0) + (h.putt2 || 0), 0);

  const parOut = courseHolePars.slice(0, 9).reduce((sum, val) => sum + val, 0);
  const p1Out = scoreboardHoles.slice(0, 9).reduce((sum, h) => sum + (h.iron || 0) + (h.putt || 0), 0);
  const p2Out = scoreboardHoles.slice(0, 9).reduce((sum, h) => sum + (h.iron2 || 0) + (h.putt2 || 0), 0);

  const parIn = courseHolePars.slice(9, 18).reduce((sum, val) => sum + val, 0);
  const p1In = scoreboardHoles.slice(9, 18).reduce((sum, h) => sum + (h.iron || 0) + (h.putt || 0), 0);
  const p2In = scoreboardHoles.slice(9, 18).reduce((sum, h) => sum + (h.iron2 || 0) + (h.putt2 || 0), 0);

  const parTotal = parOut + parIn;
  const p1Total = p1Out + p1In;
  const p2Total = p2Out + p2In;

  // Find the sequential next unrecorded hole index for both players
  const currentFocusedIndex = (() => {
    const idx = scoreboardHoles.findIndex(h => (h.iron === 0 && h.putt === 0) || (h.iron2 === 0 && h.putt2 === 0));
    return idx === -1 ? -1 : idx;
  })();

  return (
    <div 
      className="max-w-lg mx-auto h-full bg-gray-50 flex flex-col justify-between shadow-xl relative border-x border-gray-100 overflow-hidden"
      style={{ fontFamily: '"Outfit", "Noto Sans KR", sans-serif' }}
    >
      
      {/* Top Header App Bar */}
      <header className="text-white py-3 px-5 text-left shadow-md select-none relative animate-fade-in" style={{ backgroundColor: '#0f766e' }}>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <img 
              src={process.env.PUBLIC_URL + '/logo.svg'} 
              alt="SkKy Golf Logo" 
              className="w-16 h-16 object-contain rounded-xl shadow-md border border-white/10 shrink-0"
            />
            <div>
              <h1 className="text-3xl font-black tracking-wide text-[#f8fafc] leading-tight" style={{ fontFamily: '"Outfit", "Noto Sans KR", sans-serif' }}>
                SkKy Golf
              </h1>
              <p className="text-xl text-emerald-50 mt-0.5 font-bold leading-none animate-fadeIn" style={{ fontFamily: '"Nanum Pen Script", cursive' }}>시근이와 계영이의 골프 여행기</p>
            </div>
          </div>
          
          {/* Subtle sync settings gear positioned on the far right */}
          <button 
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="text-lg opacity-85 hover:opacity-100 active:scale-90 transition duration-150 p-1.5 bg-[#115e59] hover:bg-[#134e4a] rounded-xl shadow-sm flex items-center justify-center border-0 shrink-0"
            style={{ minHeight: '36px', minWidth: '36px' }}
            title="Dynamic Sync Settings"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 overflow-y-auto pb-24 space-y-4">
        
        {/* --- TAB 1: SCOREBOARD --- */}
        {activeTab === 'score' && (
          <div className="space-y-7 fade-in">
            
            {/* Live Scoreboard Header & Save Button at the very top */}
            <div className="flex items-center justify-between px-1 w-full">
              <span className="text-lg font-black text-emerald-800 tracking-wider uppercase flex items-center">
                <span className="mr-2">📝</span>Live Scoreboard
              </span>
              <button 
                type="button"
                onClick={handleSaveScore}
                disabled={(!isNewCourse && !selectedCourseId) || (isNewCourse && !newCourseNameInput.trim())}
                className="bg-emerald-600 hover:bg-emerald-505 disabled:opacity-40 text-white font-extrabold px-4 py-2 rounded-none text-xs shadow-md transition active:scale-95 outline-none select-none"
              >
                Save
              </button>
            </div>

            {/* Decoupled Round Setup Boxes (under the header) */}
            <div className="grid grid-cols-2 gap-4">
              {/* Course Box Card */}
              <div className="bg-transparent p-0 border-0 shadow-none flex flex-col justify-between">
                <label className="block text-xs font-black text-emerald-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <span>📍</span> Golf Course
                </label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm shadow-sm transition-all text-gray-800 font-bold"
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
                  {[...courses].sort((a,b) => (a.name || '').localeCompare(b.name || '', 'ko-KR')).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                  <option value="new">+ Add New</option>
                </select>
              </div>

              {/* Play Date Box Card */}
              <div className="bg-transparent p-0 border-0 shadow-none flex flex-col justify-between">
                <label className="block text-xs font-black text-emerald-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <span>📅</span> Play Date
                </label>
                <input 
                  type="date" 
                  className="w-full p-2 border border-gray-300 rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm shadow-sm text-gray-800 font-bold font-sans"
                  value={playDate}
                  onChange={(e) => setPlayDate(e.target.value)}
                />
              </div>
            </div>

            {/* Direct Entry Course Name */}
            {isNewCourse && (
              <div className="bg-white p-4 rounded-none border border-emerald-200 shadow-sm space-y-1.5 animate-fadeIn">
                <label className="block text-xs font-extrabold text-emerald-800 uppercase">Enter Golf Course Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Gapyeong Benest GC" 
                  className="w-full p-2.5 bg-white border border-emerald-300 rounded-none focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm font-semibold animate-fadeIn"
                  value={newCourseNameInput}
                  onChange={(e) => setNewCourseNameInput(e.target.value)}
                />
              </div>
            )}

            {/* Live Matrix Section (Split tables in UI Grid with spacious margins) */}
            <div className="bg-transparent p-0 rounded-none border-0 shadow-none space-y-3.5 w-full mt-6">

              {/* Front Nine layout */}
              <div className="w-full">
                <span className="text-xs font-black text-gray-500 block mb-1.5 px-1 tracking-wide">⛳ Front</span>
                <div className="border-2 border-gray-400 rounded-none overflow-hidden flex bg-white text-center shadow-sm" style={{ width: 'calc(2.5rem + (100% - 2.5rem) * 10 / 11)' }}>
                  <div className="w-10 bg-gray-50 flex flex-col justify-between text-xs font-extrabold text-gray-500 border-r-2 border-gray-400 shrink-0 select-none">
                    {/* Top Header */}
                    <div className="flex flex-col py-1 border-b-2 border-gray-400">
                      <span className="h-5 flex items-center justify-center text-gray-600 font-extrabold text-[11px]">Hole</span>
                      <span className="h-4 flex items-center justify-center text-red-600 font-black tracking-normal text-[11px]">Par</span>
                    </div>
                    {/* Bottom Header */}
                    <div className="flex flex-col py-1 bg-white">
                      <span className="h-8 flex items-center justify-center text-emerald-850 font-black text-sm">SK</span>
                      <span className="h-8 flex items-center justify-center text-teal-855 font-black text-sm">KY</span>
                    </div>
                  </div>
                  {/* Grid for 9 holes + OUT (10 columns total) */}
                  <div className="flex-1 grid grid-cols-10 divide-x divide-gray-300">
                    {scoreboardHoles.slice(0, 9).map((h, k) => {
                      const isClickable = (k === currentFocusedIndex);
                      const p1T = h.iron + h.putt;
                      const p2T = h.iron2 + h.putt2;
                      const holePar = courseHolePars[k] || 4;
                      return (
                        <div 
                          key={k}
                          onClick={isClickable ? () => openScoreModal(k) : undefined}
                          className={`flex flex-col justify-between transition-all ${
                            isClickable 
                              ? 'cursor-pointer bg-amber-50/30 hover:bg-amber-50/60 ring-2 ring-amber-400 ring-inset' 
                              : 'cursor-default grayscale-[20%] opacity-85'
                          }`}
                        >
                          {/* Top Section */}
                          <div className={`flex flex-col py-1 border-b-2 border-gray-400 ${isClickable ? 'bg-amber-50/50' : ''}`}>
                            <span className={`text-xs font-bold h-5 flex items-center justify-center ${isClickable ? 'text-amber-800 font-black' : 'text-gray-500'}`}>
                              {h.hole}
                            </span>
                            <span className="text-[11px] font-black text-red-500 h-4 flex items-center justify-center">
                              {holePar}
                            </span>
                          </div>
                          {/* Bottom Section */}
                          <div className="flex flex-col py-1">
                            <div className="h-8 flex items-center justify-center">
                              {renderScoreSymbol(p1T, holePar, isClickable, isClickable && p1T === 0)}
                            </div>
                            <div className="h-8 flex items-center justify-center">
                              {renderScoreSymbol(p2T, holePar, isClickable, isClickable && p2T === 0)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {/* OUT subtotal column (occupies 10th col) */}
                    <div className="bg-blue-50/30 flex flex-col justify-between text-center select-none font-bold">
                      {/* Top Section */}
                      <div className="flex flex-col py-1 border-b-2 border-gray-400 bg-blue-50/50 font-black">
                        <span className="text-[10px] font-black h-5 flex items-center justify-center text-blue-600">OUT</span>
                        <span className="text-[10px] font-black text-blue-500 h-4 flex items-center justify-center">{parOut}</span>
                      </div>
                      {/* Bottom Section */}
                      <div className="flex flex-col py-1 bg-blue-50/10">
                        <span className="text-xs font-black text-blue-600 h-8 flex items-center justify-center bg-blue-50/5">{p1Out > 0 ? p1Out : '-'}</span>
                        <span className="text-xs font-black text-blue-700 h-8 flex items-center justify-center bg-blue-50/5">{p2Out > 0 ? p2Out : '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Back Nine layout */}
              <div className="w-full">
                <span className="text-xs font-black text-gray-500 block mb-1.5 px-1 tracking-wide">⛳ Back</span>
                <div className="border-2 border-gray-400 rounded-none overflow-hidden flex bg-white text-center w-full shadow-sm">
                  <div className="w-10 bg-gray-50 flex flex-col justify-between text-xs font-extrabold text-gray-500 border-r-2 border-gray-400 shrink-0 select-none">
                    {/* Top Header */}
                    <div className="flex flex-col py-1 border-b-2 border-gray-400">
                      <span className="h-5 flex items-center justify-center text-gray-600 font-extrabold text-[11px]">Hole</span>
                      <span className="h-4 flex items-center justify-center text-red-600 font-black tracking-normal text-[11px]">Par</span>
                    </div>
                    {/* Bottom Header */}
                    <div className="flex flex-col py-1 bg-white">
                      <span className="h-8 flex items-center justify-center text-emerald-850 font-black text-sm">SK</span>
                      <span className="h-8 flex items-center justify-center text-teal-880 font-black text-sm">KY</span>
                    </div>
                  </div>
                  {/* Grid for 9 holes + IN + TOT column (11 columns total) */}
                  <div className="flex-1 grid grid-cols-11 divide-x divide-gray-300">
                    {scoreboardHoles.slice(9, 18).map((h, k) => {
                      const globalK = k + 9;
                      const isClickable = (globalK === currentFocusedIndex);
                      const p1T = h.iron + h.putt;
                      const p2T = h.iron2 + h.putt2;
                      const holePar = courseHolePars[globalK] || 4;
                      return (
                        <div 
                          key={globalK}
                          onClick={isClickable ? () => openScoreModal(globalK) : undefined}
                          className={`flex flex-col justify-between transition-all ${
                            isClickable 
                              ? 'cursor-pointer bg-amber-50/30 hover:bg-amber-50/60 ring-2 ring-amber-400 ring-inset' 
                              : 'cursor-default grayscale-[20%] opacity-85'
                          }`}
                        >
                          {/* Top Section */}
                          <div className={`flex flex-col py-1 border-b-2 border-gray-400 ${isClickable ? 'bg-amber-50/50' : ''}`}>
                            <span className={`text-xs font-bold h-5 flex items-center justify-center ${isClickable ? 'text-amber-800 font-black' : 'text-gray-500'}`}>
                              {h.hole}
                            </span>
                            <span className="text-[11px] font-black text-red-500 h-4 flex items-center justify-center">
                              {holePar}
                            </span>
                          </div>
                          {/* Bottom Section */}
                          <div className="flex flex-col py-1">
                            <div className="h-8 flex items-center justify-center">
                              {renderScoreSymbol(p1T, holePar, isClickable, isClickable && p1T === 0)}
                            </div>
                            <div className="h-8 flex items-center justify-center">
                              {renderScoreSymbol(p2T, holePar, isClickable, isClickable && p2T === 0)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {/* IN subtotal column (occupies 10th col) */}
                    <div className="bg-blue-50/30 flex flex-col justify-between text-center select-none font-bold">
                      {/* Top Section */}
                      <div className="flex flex-col py-1 border-b-2 border-gray-400 bg-blue-50/50 font-black">
                        <span className="text-[10px] font-black h-5 flex items-center justify-center text-blue-600">IN</span>
                        <span className="text-[10px] font-black text-blue-500 h-4 flex items-center justify-center">{parIn}</span>
                      </div>
                      {/* Bottom Section */}
                      <div className="flex flex-col py-1 bg-blue-50/10">
                        <span className="text-xs font-black text-blue-600 h-8 flex items-center justify-center bg-blue-50/5">{p1In > 0 ? p1In : '-'}</span>
                        <span className="text-xs font-black text-blue-700 h-8 flex items-center justify-center bg-blue-50/5">{p2In > 0 ? p2In : '-'}</span>
                      </div>
                    </div>
                    {/* TOT total column (occupies 11th col) */}
                    <div className="bg-red-50/30 flex flex-col justify-between text-center select-none font-bold">
                      {/* Top Section */}
                      <div className="flex flex-col py-1 border-b-2 border-gray-400 bg-red-50/50 font-black">
                        <span className="text-[10px] font-black h-5 flex items-center justify-center text-red-600 font-extrabold">TOT</span>
                        <span className="text-[10px] font-black text-red-500 h-4 flex items-center justify-center">{parTotal}</span>
                      </div>
                      {/* Bottom Section */}
                      <div className="flex flex-col py-1 bg-red-50/10">
                        <span className="text-xs font-black text-red-600 h-8 flex items-center justify-center bg-red-50/5">{p1Total > 0 ? p1Total : '-'}</span>
                        <span className="text-xs font-black text-red-700 h-8 flex items-center justify-center bg-red-50/5">{p2Total > 0 ? p2Total : '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Score Entry Popup Modal */}
            {isScoreInputModalOpen && editingHoleIndex !== null && (
              <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-none w-full max-w-md p-6 shadow-2xl border border-gray-300 flex flex-col space-y-4 animate-fade-in text-left">
                  
                  {/* Modal Header */}
                  <div className="flex justify-between items-center pb-2.5 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl filter drop-shadow">⛳</span>
                      <div className="flex flex-col text-left">
                        <h3 className="text-lg font-black text-gray-800 tracking-wide leading-none flex items-center gap-2">
                          <span>HOLE {editingHoleIndex + 1}</span>
                          <span className="text-red-500 font-extrabold">•</span>
                          <span className="text-red-600 font-black">Par {courseHolePars[editingHoleIndex] || 4}</span>
                        </h3>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setIsScoreInputModalOpen(false)}
                      className="text-gray-400 hover:text-gray-600 font-bold text-2xl p-1"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Dual columns for SK and KY inside the popup */}
                  <div className="grid grid-cols-2 gap-4 divide-x divide-gray-200">
                    
                    {/* SK column */}
                    <div className="flex flex-col items-center space-y-4 select-none pr-1">
                      <span className="text-base font-black text-emerald-800 tracking-wider">
                        SK
                      </span>

                      {/* SK Strokes */}
                      <div className="w-full flex flex-col items-center text-center">
                        <span className="text-[11px] font-extrabold text-gray-500 uppercase">Strokes</span>
                        <div className="w-32 h-12 flex justify-between items-center bg-emerald-50/40 p-1 rounded-none border border-emerald-200 mt-1">
                          <button
                            type="button"
                            onClick={() => modifyScoreboardHoleIndex(editingHoleIndex, 'iron', -1)}
                            className="w-10 h-10 rounded-none bg-white text-emerald-800 hover:bg-emerald-55 border border-emerald-200 font-black text-lg shadow-sm flex justify-center items-center active:scale-95"
                          >
                            −
                          </button>
                          <span className="flex-1 text-center font-black text-xl text-emerald-800">
                            {scoreboardHoles[editingHoleIndex].iron}
                          </span>
                          <button
                            type="button"
                            onClick={() => modifyScoreboardHoleIndex(editingHoleIndex, 'iron', 1)}
                            className="w-10 h-10 rounded-none bg-white text-emerald-800 hover:bg-emerald-55 border border-emerald-200 font-black text-lg shadow-sm flex justify-center items-center active:scale-95"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* SK Putts */}
                      <div className="w-full flex flex-col items-center text-center">
                        <span className="text-[11px] font-extrabold text-gray-500 uppercase">Putts</span>
                        <div className="w-32 h-12 flex justify-between items-center bg-emerald-50/40 p-1 rounded-none border border-emerald-200 mt-1">
                          <button
                            type="button"
                            onClick={() => modifyScoreboardHoleIndex(editingHoleIndex, 'putt', -1)}
                            className="w-10 h-10 rounded-none bg-white text-emerald-800 hover:bg-emerald-55 border border-emerald-200 font-black text-lg shadow-sm flex justify-center items-center active:scale-95"
                          >
                            −
                          </button>
                          <span className="flex-1 text-center font-black text-xl text-emerald-800">
                            {scoreboardHoles[editingHoleIndex].putt}
                          </span>
                          <button
                            type="button"
                            onClick={() => modifyScoreboardHoleIndex(editingHoleIndex, 'putt', 1)}
                            className="w-10 h-10 rounded-none bg-white text-emerald-800 hover:bg-emerald-55 border border-emerald-200 font-black text-lg shadow-sm flex justify-center items-center active:scale-95"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="w-32 h-12 flex justify-center items-center bg-emerald-50 p-1 rounded-none border border-emerald-200 mt-1 text-sm font-bold text-emerald-800 text-center">
                        Total: &nbsp;<strong className="font-extrabold text-lg">{scoreboardHoles[editingHoleIndex].iron + scoreboardHoles[editingHoleIndex].putt}</strong>
                      </div>
                    </div>

                    {/* KY column */}
                    <div className="flex flex-col items-center space-y-4 select-none pl-3">
                      <span className="text-base font-black text-teal-800 tracking-wider">
                        KY
                      </span>

                      {/* KY Strokes */}
                      <div className="w-full flex flex-col items-center text-center">
                        <span className="text-[11px] font-extrabold text-gray-500 uppercase">Strokes</span>
                        <div className="w-32 h-12 flex justify-between items-center bg-teal-50/40 p-1 rounded-none border border-teal-200 mt-1">
                          <button
                            type="button"
                            onClick={() => modifyScoreboardHoleIndex(editingHoleIndex, 'iron2', -1)}
                            className="w-10 h-10 rounded-none bg-white text-teal-800 hover:bg-teal-55 border border-teal-200 font-black text-lg shadow-sm flex justify-center items-center active:scale-95"
                          >
                            −
                          </button>
                          <span className="flex-1 text-center font-black text-xl text-teal-800">
                            {scoreboardHoles[editingHoleIndex].iron2}
                          </span>
                          <button
                            type="button"
                            onClick={() => modifyScoreboardHoleIndex(editingHoleIndex, 'iron2', 1)}
                            className="w-10 h-10 rounded-none bg-white text-teal-800 hover:bg-teal-55 border border-teal-200 font-black text-lg shadow-sm flex justify-center items-center active:scale-95"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* KY Putts */}
                      <div className="w-full flex flex-col items-center text-center">
                        <span className="text-[11px] font-extrabold text-gray-500 uppercase">Putts</span>
                        <div className="w-32 h-12 flex justify-between items-center bg-teal-50/40 p-1 rounded-none border border-teal-200 mt-1">
                          <button
                            type="button"
                            onClick={() => modifyScoreboardHoleIndex(editingHoleIndex, 'putt2', -1)}
                            className="w-10 h-10 rounded-none bg-white text-teal-800 hover:bg-teal-55 border border-teal-200 font-black text-lg shadow-sm flex justify-center items-center active:scale-95"
                          >
                            −
                          </button>
                          <span className="flex-1 text-center font-black text-xl text-teal-800">
                            {scoreboardHoles[editingHoleIndex].putt2}
                          </span>
                          <button
                            type="button"
                            onClick={() => modifyScoreboardHoleIndex(editingHoleIndex, 'putt2', 1)}
                            className="w-10 h-10 rounded-none bg-white text-teal-800 hover:bg-teal-55 border border-teal-200 font-black text-lg shadow-sm flex justify-center items-center active:scale-95"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="w-32 h-12 flex justify-center items-center bg-teal-50 p-1 rounded-none border border-teal-200 mt-1 text-sm font-bold text-teal-800 text-center">
                        Total: &nbsp;<strong className="font-extrabold text-lg">{scoreboardHoles[editingHoleIndex].iron2 + scoreboardHoles[editingHoleIndex].putt2}</strong>
                      </div>
                    </div>

                  </div>

                  {/* Confirm Button */}
                  <div className="pt-3 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setIsScoreInputModalOpen(false)}
                      className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-600 text-white font-black rounded-none text-center text-base shadow transition active:scale-95"
                    >
                      Confirm
                    </button>
                  </div>

                </div>
              </div>
            )}

          </div>
        )}

        {/* --- TAB 2: COURSES VIEW --- */}
        {activeTab === 'course' && (
          <div className="space-y-4 fade-in">
            
            <h2 className="text-lg font-black text-emerald-800 tracking-wider uppercase flex items-center px-1">
              <span className="mr-2">🗺️</span> Course Location
            </h2>

            {/* Map GPS simulator card (always present) */}
            <div className="bg-white p-5 rounded-none shadow-sm border border-gray-300">
              <div 
                onClick={handleMapClick}
                className="w-full h-48 bg-emerald-50 border border-emerald-100 rounded-none flex flex-col items-center justify-center relative cursor-crosshair overflow-hidden group shadow-inner"
              >
                <div className="absolute inset-0 bg-opacity-15 bg-[radial-gradient(#059669_1px,transparent_1px)] [background-size:16px_16px]"></div>
                
                <div className="z-10 bg-white px-3.5 py-1.5 rounded-none shadow-md border border-gray-200 text-xs text-gray-700 flex items-center space-x-1.5 transition-all">
                  <span>📍</span> 
                  <span className="font-bold text-emerald-800">
                    Lat: {Number(mapClickedCoords?.lat || 33.3541).toFixed(4)}, Lng: {Number(mapClickedCoords?.lng || 126.3712).toFixed(4)}
                  </span>
                </div>
                <div className="absolute bottom-2 text-[9px] text-gray-400 font-bold uppercase tracking-widest text-center select-none">
                  클릭하여 핀 위치 변경하기
                </div>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => setShowCourseModal(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 px-4 rounded-none text-sm transition-all shadow-md active:scale-95"
            >
              ⛳ Add Golf Course
            </button>

            {/* Interactive Registration Modal Overlays */}
            {showCourseModal && (
              <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-none w-full max-w-md max-h-[85vh] overflow-y-auto p-5 shadow-2xl border-2 border-gray-400 flex flex-col">
                  
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

                  <form onSubmit={handleSaveCourse} className="space-y-4 text-left">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">🏷️ Name *</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Nine Bridges CC" 
                        className="w-full p-2.5 border border-gray-200 rounded-none text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        value={newCourse.name}
                        onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1.5 align-middle">
                        <span className="text-gray-700 scale-110 shrink-0 flex items-center">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-4.85-7-11.5a7 7 0 1 1 14 0c0 6.65-7 11.5-7 11.5z" />
                            <circle cx="12" cy="9.5" r="2.5" />
                          </svg>
                        </span>
                        Address
                      </label>
                      <input 
                        type="text" 
                        placeholder="e.g. Jeju, South Korea" 
                        className="w-full p-2.5 border border-gray-200 rounded-none text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        value={newCourse.address}
                        onChange={(e) => setNewCourse({ ...newCourse, address: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">📞 Telephone</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 02-1234-5678" 
                        className="w-full p-2.5 border border-gray-200 rounded-none text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        value={newCourse.phone || ''}
                        onChange={(e) => setNewCourse({ ...newCourse, phone: e.target.value })}
                      />
                    </div>

                    {/* Individual Hole Par Editor Inside Modal */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="block text-[11px] font-bold text-emerald-800 uppercase">
                          ⛳ Default Par
                        </span>
                        <span className="text-[11px] font-black text-emerald-700">
                          {courseHolePars.reduce((s,v)=>s+v, 0)} Par
                        </span>
                      </div>
                      <div className="bg-gray-50 p-2 text-center rounded-none border border-gray-150 grid grid-cols-9 gap-1 shadow-inner">
                        {courseHolePars.map((p, idx) => (
                           <div
                            key={idx}
                            onClick={() => setEditingParHoleIndex(idx)}
                            className="bg-white hover:bg-emerald-50 border border-gray-200 rounded-none p-1.5 cursor-pointer flex flex-col items-center"
                          >
                            <span className="text-[7px] text-gray-400 font-bold">H{idx+1}</span>
                            <span className="text-[11px] font-black text-emerald-700">{p}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Difficulty adjusters */}
                    <div>
                      <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">📏 Course & Slope rating</span>
                      
                      {/* Lady Tee */}
                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        <div className="bg-white p-2 rounded-none border border-gray-200">
                          <label className="block text-[9px] font-bold text-pink-700">Lady Course</label>
                          <div className="flex justify-between items-center font-bold mt-1">
                            <button
                              type="button"
                              onClick={() => setNewCourse(p => ({ ...p, ladyRating: Math.max(1, (p.ladyRating || 72.0) - 0.1) }))}
                              className="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-none flex items-center justify-center text-xs"
                            >
                              ▼
                            </button>
                            <span className="font-black text-pink-600">{Number(newCourse?.ladyRating || 72.0).toFixed(1)}</span>
                            <button
                              type="button"
                              onClick={() => setNewCourse(p => ({ ...p, ladyRating: Math.min(150, (p.ladyRating || 72.0) + 0.1) }))}
                              className="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-none flex items-center justify-center text-xs"
                            >
                              ▲
                            </button>
                          </div>
                        </div>

                        <div className="bg-white p-2 rounded-none border border-gray-200">
                          <label className="block text-[9px] font-bold text-pink-700">Lady Slope</label>
                          <div className="flex justify-between items-center font-bold mt-1">
                            <button
                              type="button"
                              onClick={() => setNewCourse(p => ({ ...p, ladySlope: Math.max(1, p.ladySlope - 1) }))}
                              className="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-none flex items-center justify-center text-xs"
                            >
                              ▼
                            </button>
                            <span className="font-black text-pink-600">{newCourse.ladySlope}</span>
                            <button
                              type="button"
                              onClick={() => setNewCourse(p => ({ ...p, ladySlope: Math.min(300, p.ladySlope + 1) }))}
                              className="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-none flex items-center justify-center text-xs"
                            >
                              ▲
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Blue Tee */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white p-2 rounded-none border border-gray-200">
                          <label className="block text-[9px] font-bold text-blue-700">Blue Course</label>
                          <div className="flex justify-between items-center font-bold mt-1">
                            <button
                              type="button"
                              onClick={() => setNewCourse(p => ({ ...p, blueRating: Math.max(1, (p.blueRating || 72.0) - 0.1) }))}
                              className="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-none flex items-center justify-center text-xs"
                            >
                              ▼
                            </button>
                            <span className="font-black text-blue-600">{Number(newCourse?.blueRating || 72.0).toFixed(1)}</span>
                            <button
                              type="button"
                              onClick={() => setNewCourse(p => ({ ...p, blueRating: Math.min(150, (p.blueRating || 72.0) + 0.1) }))}
                              className="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-none flex items-center justify-center text-xs"
                            >
                              ▲
                            </button>
                          </div>
                        </div>

                        <div className="bg-white p-2 rounded-none border border-gray-200">
                          <label className="block text-[9px] font-bold text-blue-700">Blue Slope</label>
                          <div className="flex justify-between items-center font-bold mt-1">
                            <button
                              type="button"
                              onClick={() => setNewCourse(p => ({ ...p, blueSlope: Math.max(1, p.blueSlope - 1) }))}
                              className="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-none flex items-center justify-center text-xs"
                            >
                              ▼
                            </button>
                            <span className="font-black text-blue-600">{newCourse.blueSlope}</span>
                            <button
                              type="button"
                              onClick={() => setNewCourse(p => ({ ...p, blueSlope: Math.min(300, p.blueSlope + 1) }))}
                              className="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-none flex items-center justify-center text-xs"
                            >
                              ▲
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Form Controls */}
                    <div className="flex flex-col gap-2 pt-2">
                      <div className="flex gap-2.5">
                        <button 
                          type="button"
                          onClick={closeCourseModal}
                          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 px-4 rounded-none text-xs transition"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit" 
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 px-4 rounded-none text-xs transition active:scale-95"
                        >
                          {editingCourseId ? 'Save' : 'Register'}
                        </button>
                      </div>

                      {editingCourseId && (
                        <button
                          type="button"
                          onClick={() => {
                            handleDeleteCourse(editingCourseId);
                            closeCourseModal();
                          }}
                          className="w-full mt-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold py-2 px-4 rounded-none text-xs transition-all flex items-center justify-center gap-1"
                        >
                          🗑️ Delete This Course
                        </button>
                      )}
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
              <h3 className="text-lg font-black text-emerald-800 tracking-wider uppercase flex items-center px-1">📍 Course Profiles</h3>
              
              {/* Course search input */}
              <div className="px-1">
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-gray-400 text-sm select-none">
                    🔍
                  </span>
                  <input
                    type="text"
                    placeholder="Search courses by name or address..."
                    value={courseSearchQuery}
                    onChange={(e) => setCourseSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-none text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm placeholder:text-gray-400 placeholder:font-normal"
                  />
                  {courseSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCourseSearchQuery('')}
                      className="absolute right-3 text-gray-400 hover:text-gray-600 font-bold text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {[...courses]
                .filter(course => {
                  const q = courseSearchQuery.trim().toLowerCase();
                  if (!q) return true;
                  return (course.name || '').toLowerCase().includes(q) || (course.address || '').toLowerCase().includes(q);
                })
                .sort((a,b) => (a.name || '').localeCompare(b.name || '', 'ko-KR'))
                .map(course => {
                  const courseHistories = scores.filter(s => s.courseId === course.id);

                  return (
                    <div key={course.id} className="bg-white p-5 rounded-none shadow-sm border border-gray-300 space-y-3 relative animate-fadeIn">
                      
                      {/* Row 1: Course Name (left) and Edit button (right) */}
                      <div className="flex justify-between items-center gap-2">
                        <h4 className="font-extrabold text-gray-800 text-base leading-snug truncate">{course.name}</h4>
                        <button
                          type="button"
                          onClick={() => handleStartEditCourse(course)}
                          className="px-2.5 py-1 text-xs text-emerald-700 font-extrabold bg-emerald-50 hover:bg-emerald-100 rounded-none border border-emerald-200/50 flex items-center justify-center gap-1 transition active:scale-95 shrink-0 animate-none"
                          title="Edit"
                        >
                          ✏️
                        </button>
                      </div>

                      {/* Row 2: Address */}
                      <button
                        type="button"
                        onClick={() => {
                          const query = encodeURIComponent(course.name + ' ' + (course.address || ''));
                          window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                        }}
                        className="text-xs text-gray-500 font-bold flex items-center gap-1.5 hover:text-emerald-700 hover:underline transition-colors w-full text-left bg-transparent border-0 p-0 cursor-pointer min-h-[24px]"
                      >
                        <span className="text-emerald-600 scale-110 shrink-0 flex items-center bg-emerald-50 p-1 rounded-none border border-emerald-100 hover:bg-emerald-100 active:scale-95 transition-all">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-4.85-7-11.5a7 7 0 1 1 14 0c0 6.65-7 11.5-7 11.5z" />
                            <circle cx="12" cy="9.5" r="2.5" />
                          </svg>
                        </span>{' '}
                        <span className="truncate">{course.address || 'No address registered'}</span>
                      </button>

                      {/* Row 3: Telephone (left) and Total Played Rounds (right) */}
                      <div className="flex justify-between items-center text-xs text-gray-500 font-bold mt-0.5">
                        {course.phone ? (
                          <button
                            type="button"
                            onClick={() => {
                              window.open(`tel:${course.phone}`, '_self');
                            }}
                            className="flex items-center gap-1.5 hover:text-emerald-700 hover:underline text-left bg-transparent border-0 p-0 cursor-pointer min-h-[24px]"
                          >
                            <span className="text-emerald-600 bg-emerald-50 p-1 rounded-none border border-emerald-100 hover:bg-emerald-100 active:scale-95 transition-all flex items-center justify-center scale-110 w-5.5 h-5.5 shrink-0">📞</span>
                            <span className="truncate">{course.phone}</span>
                          </button>
                        ) : (
                          <p className="flex items-center gap-1.5 truncate min-h-[24px]">
                            <span className="text-gray-400 bg-gray-50 p-1 rounded-none border border-gray-200 flex items-center justify-center scale-110 w-5.5 h-5.5 shrink-0">📞</span>
                            <span className="text-gray-400 font-normal">No phone number</span>
                          </p>
                        )}
                        <span className="shrink-0 text-[11px] font-extrabold text-emerald-850 bg-emerald-50 px-2 py-0.5 rounded-none border border-emerald-100/50 flex items-center gap-0.5 select-none font-mono">🏆 {courseHistories.length} Rounds</span>
                      </div>

                      {/* Row 4: Total Par, Blue Course Rating/Slope, Lady Course Rating/Slope (completely borderless, label-less) */}
                      <div className="grid grid-cols-3 gap-2 text-xs text-center font-bold text-gray-700 mt-1">
                        <div className="flex items-center justify-center bg-gray-50/50 py-1.5 px-1 rounded-none">
                          <span className="text-emerald-800 text-xs font-black block">⛳ {course.totalPar || 72} Par</span>
                        </div>
                        <div className="flex items-center justify-center bg-gray-50/50 py-1.5 px-1 rounded-none">
                          <span className="text-blue-800 text-[11px] font-black block">🔵 {Number(course.blueRating || 72.0).toFixed(1)} / {course.blueSlope || 113}</span>
                        </div>
                        <div className="flex items-center justify-center bg-gray-50/50 py-1.5 px-1 rounded-none">
                          <span className="text-pink-850 text-[11px] font-black block">🔴 {Number(course.ladyRating || 72.0).toFixed(1)} / {course.ladySlope || 113}</span>
                        </div>
                      </div>

                    </div>
                  );
                })}

              {courses.filter(course => {
                const q = courseSearchQuery.trim().toLowerCase();
                if (!q) return true;
                return (course.name || '').toLowerCase().includes(q) || (course.address || '').toLowerCase().includes(q);
              }).length === 0 && (
                <div className="text-center py-8 text-gray-400 bg-white border border-dotted border-gray-200">
                  <p className="font-bold text-gray-500">No courses match your search.</p>
                  <p className="text-xs mt-1">Try searching with a different term!</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* --- TAB 3: SHARED HISTORY MEMORIES GALLERY --- */}
        {activeTab === 'history' && (
          <div className="space-y-4 fade-in">
            <h2 className="text-lg font-black text-emerald-800 tracking-wider uppercase flex items-center px-1">
              <span className="mr-2">📸</span> History
            </h2>
            
            {scores.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-none border border-dotted border-gray-200">
                <p className="font-bold text-gray-500">No game logs found.</p>
                <p className="text-xs mt-1">Submit your first score in the first tab to begin!</p>
              </div>
            ) : (
              [...scores]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map(score => {
                  const totalStrokesP1 = (score.holes || []).reduce((sum, h) => sum + (h.iron || 0) + (h.putt || 0), 0);
                  const totalIronsP1 = (score.holes || []).reduce((sum, h) => sum + (h.iron || 0), 0);
                  const totalPuttsP1 = (score.holes || []).reduce((sum, h) => sum + (h.putt || 0), 0);

                  const totalStrokesP2 = (score.holes || []).reduce((sum, h) => sum + (h.iron2 || 0) + (h.putt2 || 0), 0);
                  const totalIronsP2 = (score.holes || []).reduce((sum, h) => sum + (h.iron2 || 0), 0);
                  const totalPuttsP2 = (score.holes || []).reduce((sum, h) => sum + (h.putt2 || 0), 0);

                  const formattedDate = formatPlayDate(score.date);
                  const dateParts = formattedDate.split('/');
                  const displayMonthDay = dateParts.length === 3 ? `${dateParts[0]}/${dateParts[1]}` : formattedDate;
                  const displayYear = dateParts.length === 3 ? dateParts[2] : '';

                  return (
                    <div 
                      key={score.id} 
                      onClick={() => setSelectedHistoryScore(score)}
                      className="bg-white rounded-none shadow-sm border border-gray-300 p-4 flex items-center gap-3.5 cursor-pointer hover:bg-emerald-50/10 active:scale-[0.99] transition-all"
                    >
                      {/* Left: Perfectly Square Date block (matching font sizes for top/bottom, rounded-none) */}
                      <div className="w-14 h-14 flex flex-col items-center justify-center bg-emerald-50 text-emerald-850 border border-emerald-100 shrink-0 select-none text-center rounded-none shadow-inner">
                        <span className="text-xs font-black tracking-tight leading-none">{displayMonthDay}</span>
                        <span className="text-xs font-black tracking-tight text-emerald-750 mt-1 leading-none">{displayYear}</span>
                      </div>

                      {/* Right: Info Area (Course Name and Score Details below) */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-extrabold text-gray-800 text-base leading-snug truncate">{score.courseName}</h3>
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1 text-xs">
                          <span className="text-emerald-800 font-bold">
                            SK: <strong className="font-black text-emerald-700 text-sm">{totalStrokesP1}</strong> <span className="text-gray-400 font-medium">({totalIronsP1}/{totalPuttsP1})</span>
                          </span>
                          {totalStrokesP2 > 0 && (
                            <span className="text-teal-800 font-bold border-l border-gray-200 pl-2.5">
                              KY: <strong className="font-black text-teal-700 text-sm">{totalStrokesP2}</strong> <span className="text-gray-400 font-medium">({totalIronsP2}/{totalPuttsP2})</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Chevron-style indicator */}
                      <div className="text-gray-300 font-bold text-sm shrink-0 pl-1 select-none">
                        ❯
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

              const getHoleScoreP1 = (h) => (h.iron || 0) + (h.putt || 0);
              const getHoleScoreP2 = (h) => (h.iron2 || 0) + (h.putt2 || 0);

              const pOutP1 = holes.slice(0, 9).reduce((sum, h) => sum + getHoleScoreP1(h), 0);
              const pInP1 = holes.slice(9, 18).reduce((sum, h) => sum + getHoleScoreP1(h), 0);

              const pOutP2 = holes.slice(0, 9).reduce((sum, h) => sum + getHoleScoreP2(h), 0);
              const pInP2 = holes.slice(9, 18).reduce((sum, h) => sum + getHoleScoreP2(h), 0);

              const course = courses.find(c => c.id === activeDetailScore.courseId);
              const detailCoursePars = course?.holePars || Array(18).fill(4);

              const renderPlayerScorecard = (label, playerPrefix) => {
                const getHoleScore = (h) => playerPrefix === 'SK' ? ((h.iron || 0) + (h.putt || 0)) : ((h.iron2 || 0) + (h.putt2 || 0));
                
                const pOut = holes.slice(0, 9).reduce((sum, h) => sum + getHoleScore(h), 0);
                const pIn = holes.slice(9, 18).reduce((sum, h) => sum + getHoleScore(h), 0);
                
                const playerSubtextColor = playerPrefix === 'SK' ? 'text-emerald-700' : 'text-teal-700';

                return (
                  <div className="space-y-1 mt-1 mb-2 text-left">
                    {/* Front Nine */}
                    <div className="w-full">
                      <span className="text-[10px] font-bold text-gray-400 block mb-0.5 px-1 tracking-wide">Front</span>
                      <div className="border border-gray-300 rounded-none overflow-hidden flex bg-white text-center shadow-sm text-[10px] w-full">
                        <div className="w-full grid grid-cols-10 divide-x divide-gray-200">
                          {holes.slice(0, 9).map((h, k) => {
                            const pT = getHoleScore(h);
                            const holePar = detailCoursePars[k] || 4;
                            return (
                              <div key={k} className="flex flex-col justify-center items-center h-8 bg-white">
                                {renderScoreSymbol(pT, holePar, false)}
                              </div>
                            );
                          })}
                          {/* OUT subtotal column */}
                          <div className="bg-blue-50/20 flex flex-col justify-center items-center h-8 select-none font-bold">
                            <span className={`text-[11px] font-black ${playerSubtextColor}`}>{pOut > 0 ? pOut : '-'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Back Nine */}
                    <div className="w-full">
                      <span className="text-[10px] font-bold text-gray-400 block mb-0.5 px-1 tracking-wide">Back</span>
                      <div className="border border-gray-300 rounded-none overflow-hidden flex bg-white text-center shadow-sm text-[10px] w-full">
                        <div className="w-full grid grid-cols-10 divide-x divide-gray-200">
                          {holes.slice(9, 18).map((h, k) => {
                            const globalK = k + 9;
                            const pT = getHoleScore(h);
                            const holePar = detailCoursePars[globalK] || 4;
                            return (
                              <div key={globalK} className="flex flex-col justify-center items-center h-8 bg-white">
                                {renderScoreSymbol(pT, holePar, false)}
                              </div>
                            );
                          })}
                          {/* IN subtotal column */}
                          <div className="bg-blue-50/20 flex flex-col justify-center items-center h-8 select-none font-bold">
                            <span className={`text-[11px] font-black ${playerSubtextColor}`}>{pIn > 0 ? pIn : '-'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              };

              return (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
                  <div className="bg-white rounded-none w-full max-w-md max-h-[85vh] overflow-y-auto p-5 shadow-2xl border-2 border-gray-400 flex flex-col space-y-4">
                    
                    {/* Modal Header */}
                    <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                      <div>
                        <h3 className="text-base font-black text-emerald-800 leading-snug">
                          ⛳ {activeDetailScore.courseName}
                        </h3>
                        <p className="text-base font-extrabold text-gray-500 mt-1">
                          📅 {formatPlayDate(activeDetailScore.date)}
                        </p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setSelectedHistoryScore(null)}
                        className="text-gray-400 hover:text-gray-650 font-bold text-lg p-1"
                      >
                        ✕
                      </button>
                    </div>

                    {/* 18-hole detailed Scorecard Tables */}
                    <div className="space-y-4">
                      <div>
                        <span className="text-[11px] font-extrabold text-emerald-855 uppercase tracking-wider block mb-1">
                          SK — {totalStrokesP1}({pOutP1}/{pInP1})
                        </span>
                        {renderPlayerScorecard('SK', 'SK')}
                      </div>

                      {totalStrokesP2 > 0 && (
                        <div>
                          <span className="text-[11px] font-extrabold text-teal-855 uppercase tracking-wider block mb-1">
                            KY — {totalStrokesP2}({pOutP2}/{pInP2})
                          </span>
                          {renderPlayerScorecard('KY', 'KY')}
                        </div>
                      )}
                    </div>

                    {/* Photos Gallery Section */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-extrabold text-emerald-855 uppercase tracking-wider">📷 Photos & Memories</span>
                        <label className="text-[10px] text-emerald-700 font-black bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-none border border-emerald-200/50 cursor-pointer transition select-none flex items-center gap-0.5">
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
                        <div className="text-center py-6 text-gray-300 bg-gray-50/70 border border-dotted border-gray-200 rounded-none">
                          <p className="text-xs">No registered photos. Feel free to upload your first photo!</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 py-0.5">
                          {activeDetailScore.photos.map((photo, i) => (
                            <div key={i} className="aspect-square rounded-none overflow-hidden bg-gray-50 border border-gray-150 relative group">
                              <img 
                                src={photo} 
                                alt="round memorial" 
                                className="w-full h-full object-cover cursor-pointer hover:brightness-95 transition-all" 
                                onClick={() => setFullscreenPhotoUrl(photo)}
                              />
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
                                className="absolute top-1 right-1 bg-black/60 text-white rounded-none w-5 h-5 text-[10px] flex items-center justify-center hover:bg-black/80 shadow"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action buttons at bottom */}
                    <div className="flex gap-2.5">
                      <button 
                        type="button"
                        onClick={() => {
                          if (window.confirm("Are you sure you want to delete this round log permanently?")) {
                            const updated = scores.filter(s => s.id !== activeDetailScore.id);
                            setScores(updated);
                            localStorage.setItem('golf_diary_scores', JSON.stringify(updated));
                            setSelectedHistoryScore(null);
                          }
                        }}
                        className="bg-red-50 hover:bg-red-100 text-red-650 font-bold py-2.5 px-4 rounded-none text-xs transition active:scale-95 border border-red-200"
                      >
                        🗑️ Delete
                      </button>
                      
                      <button 
                        type="button"
                        onClick={() => setSelectedHistoryScore(null)}
                        className="flex-grow bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 px-4 rounded-none text-xs transition active:scale-95 shadow"
                      >
                        Confirm / Close
                      </button>
                    </div>

                  </div>
                </div>
              );
            })()}
          </div>
        )}

      </main>

      {/* Styled Bottom Navigation Toolbar (Stay fixed in mobile frames) */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-gray-150 flex justify-around py-3.5 shadow-xl z-50">
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
          <div className="bg-white rounded-none p-6 w-full max-w-md border border-gray-300 shadow-2xl space-y-4 animate-fade-in text-left">
            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
              <h3 className="font-extrabold text-emerald-800 flex items-center gap-1.5 uppercase tracking-wide">
                <span>🔥</span> Dynamic Sync Settings
              </h3>
              <button 
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="text-gray-400 hover:text-gray-650 text-lg font-bold p-1 outline-none animate-fadeIn"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 pb-2">
              <div>
                <label className="block text-[11px] font-black text-gray-500 uppercase mb-1 tracking-wider">Firebase Realtime DB URL</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="flex-1 text-xs font-semibold p-2.5 border border-gray-300 rounded-none focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-gray-850"
                    value={tempFirebaseUrl}
                    onChange={(e) => setTempFirebaseUrl(e.target.value)}
                    placeholder="https://your-project-rtdb.firebaseio.com"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFirebaseUrl(tempFirebaseUrl);
                      setSettingsMessage('💾 Realtime DB URL 설정이 정상 반영되었습니다!');
                      setTimeout(() => setSettingsMessage(''), 3000);
                    }}
                    className="px-3 bg-emerald-800 hover:bg-emerald-700 active:scale-95 transition-all text-white font-extrabold text-[11px] uppercase tracking-wider rounded-none shrink-0"
                  >
                    적용 (Apply)
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                  * URL을 완벽하게 입력한 다음 우측의 <b>[적용 (Apply)]</b> 버튼을 꼭 눌러주세요! 공란으로 두면 기본 고속 백업 채널(기본값)로 자동 설정됩니다.
                </p>
              </div>

              {/* Dynamic comparison card */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-none text-xs space-y-1.5">
                <div className="font-black text-emerald-800 text-[11px] uppercase tracking-wider">📊 SYNC STATUS (실시간 모니터)</div>
                <div className="flex justify-between font-bold text-gray-700">
                  <span>📱 이 전화기 / 기기:</span>
                  <span className="font-black text-gray-950">코스 {courses.length}개 | 라운드 {scores.length}개</span>
                </div>
                <div className="flex justify-between font-bold text-teal-800">
                  <span>☁️ 클라우드 서버:</span>
                  <span className="font-black text-teal-950">코스 {cloudCoursesCount}개 | 라운드 {cloudScoresCount}개</span>
                </div>
              </div>

              {/* Action Message Log */}
              {settingsMessage && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-250 text-[11px] text-emerald-950 font-extrabold text-center animate-pulse leading-snug">
                  {settingsMessage}
                </div>
              )}

              {/* Force sync buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleForceUpload}
                  className="py-2.5 px-2 bg-emerald-800 hover:bg-emerald-700 active:scale-[0.98] transition-all text-white font-black text-xs text-center border-0 shadow-none rounded-none"
                >
                  📤 강제 업로드<br/>
                  <span className="text-[9px] opacity-80 font-normal">(Phone → Cloud)</span>
                </button>
                <button
                  type="button"
                  onClick={handleForceDownload}
                  className="py-2.5 px-2 bg-indigo-800 hover:bg-indigo-750 active:scale-[0.98] transition-all text-white font-black text-xs text-center border-0 shadow-none rounded-none"
                >
                  📥 강제 다운로드<br/>
                  <span className="text-[9px] opacity-80 font-normal">(Cloud → Phone)</span>
                </button>
              </div>

              <div className="text-[10px] leading-relaxed text-gray-500 font-semibold mt-1 bg-gray-50/70 p-2 border border-gray-150 font-sans">
                💡 <strong>동기화 방법:</strong> 프리뷰웹에 폰에서 넣은 코스가 안보인다면, <b>전화기(에뮬레이터) 앱의 설정(우측상단 톱니바퀴)에서 <span className="text-emerald-800 font-black">📤 강제 업로드</span></b>를 클릭 후, <b>프리뷰웹에서 설정 열고 <span className="text-indigo-800 font-black">📥 강제 다운로드</span></b>를 클릭하세요!
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              className="w-full py-3 bg-gray-800 hover:bg-gray-900 text-white font-black text-sm rounded-none shadow transition active:scale-95 outline-none"
            >
              닫기 (Close)
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen Photo Modal */}
      {fullscreenPhotoUrl && (
        <div 
          className="fixed inset-0 bg-black/90 z-[200] flex flex-col items-center justify-center p-4 select-none animate-fadeIn cursor-pointer"
          onClick={() => setFullscreenPhotoUrl(null)}
        >
          {/* Close button */}
          <button 
            type="button"
            className="absolute top-4 right-4 text-white hover:text-gray-350 bg-black/40 hover:bg-black/60 w-10 h-10 rounded-full flex items-center justify-center font-black text-xl transition-all z-10"
            onClick={(e) => {
              e.stopPropagation();
              setFullscreenPhotoUrl(null);
            }}
          >
            ✕
          </button>
          {/* Fullscreen image */}
          <div className="max-w-full max-h-full flex items-center justify-center p-2">
            <img 
              src={fullscreenPhotoUrl} 
              alt="gorgeous golf memory" 
              className="max-w-full max-h-[92vh] object-contain shadow-2xl select-none"
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
        </div>
      )}

    </div>
  );
}
