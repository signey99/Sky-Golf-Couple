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
  if (!score || score <= 0) return <span className="text-gray-300 text-sm font-medium">-</span>;
  
  const diff = score - par;
  
  if (diff === -1) {
    // Birdie: 빨간색 동그라미 안에 숫자
    return (
      <div className="w-5.5 h-5.5 rounded-full border border-red-500 bg-red-50/30 flex items-center justify-center">
        <span className="text-[11px] font-black text-red-500 leading-none">{score}</span>
      </div>
    );
  } else if (diff <= -2) {
    // Eagle or Albatross: 두줄짜리 빨간색 동그라미
    return (
      <div className="relative w-5.5 h-5.5 flex items-center justify-center">
        <div className="absolute inset-0 border border-red-500 rounded-full"></div>
        <div className="absolute inset-[2.5px] border border-red-500 rounded-full"></div>
        <span className="text-[11px] font-black text-red-500 z-10 leading-none">{score}</span>
      </div>
    );
  } else if (diff === 1) {
    // Bogey: 파란색 네모 안에 숫자
    return (
      <div className="w-5.5 h-5.5 border border-blue-500 bg-blue-50/20 rounded-[2px] flex items-center justify-center">
        <span className="text-[11px] font-black text-blue-500 leading-none">{score}</span>
      </div>
    );
  } else if (diff >= 2) {
    // Double bogey and more: 두줄짜리 네모 안에 숫자
    return (
      <div className="relative w-5.5 h-5.5 flex items-center justify-center">
        <div className="absolute inset-0 border border-blue-600 rounded-[2px]"></div>
        <div className="absolute inset-[2.5px] border border-blue-600 rounded-[2px]"></div>
        <span className="text-[11px] font-black text-blue-600 z-10 leading-none">{score}</span>
      </div>
    );
  } else {
    // Par
    return <span className={`text-sm font-bold leading-none ${isSelected ? 'text-emerald-800' : 'text-gray-700'}`}>{score}</span>;
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
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);
  const [syncStatus, setSyncStatus] = useState('syncing'); // 'syncing', 'synced', 'error'
  const [lastSyncedTime, setLastSyncedTime] = useState('Connecting...');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // Settings modal
  const [cloudCoursesCount, setCloudCoursesCount] = useState('-');
  const [cloudScoresCount, setCloudScoresCount] = useState('-');
  const [settingsMessage, setSettingsMessage] = useState('');

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
      const res = await fetch(`https://kvdb.io/K9m8b8M8PnHpMhpbUfHqpS/${syncChannel}`);
      if (res.ok) {
        const cloudData = await res.json();
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
          setSettingsMessage('📥 Successfully downloaded cloud database to this device!');
          setTimeout(() => setSettingsMessage(''), 4500);
          return;
        }
      }
      setSettingsMessage('❌ No backup data found in the cloud.');
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
            if (cloudData) {
              if (cloudData.courses) setCloudCoursesCount(cloudData.courses.length);
              if (cloudData.scores) setCloudScoresCount(cloudData.scores.length);

              if (cloudData.updatedAt) {
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
  const [isScoreInputModalOpen, setIsScoreInputModalOpen] = useState(false);
  const [editingHoleIndex, setEditingHoleIndex] = useState(null);

  const openScoreModal = (index) => {
    setEditingHoleIndex(index);
    setIsScoreInputModalOpen(true);
  };

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
      className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col justify-between shadow-xl relative border-x border-gray-100 pb-24"
      style={{ fontFamily: '"Outfit", "Noto Sans KR", sans-serif' }}
    >
      
      {/* Top Header App Bar */}
      <header className="text-white py-4 px-5 text-left shadow-md select-none relative animate-fade-in pr-20" style={{ backgroundColor: '#0f766e' }}>
        <h1 className="text-3xl font-black tracking-wide text-[#f8fafc] flex items-center" style={{ fontFamily: '"Outfit", "Noto Sans KR", sans-serif' }}>
          {/* Custom Stylized Couple SVG Icon representing the couple */}
          <svg 
            className="w-10 h-10 mr-2.5 rounded-full border border-emerald-500 shadow-md bg-emerald-800 p-0.5 shrink-0" 
            viewBox="0 0 120 120" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="golfParkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="50%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
              <linearGradient id="manGlasses" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="50%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#facc15" />
              </linearGradient>
              <linearGradient id="womanGlasses" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="50%" stopColor="#d946ef" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>

            {/* Background emerald grass circle */}
            <circle cx="60" cy="60" r="58" fill="url(#golfParkGradient)" />

            {/* Stylized trees icon inside background */}
            <circle cx="30" cy="35" r="12" fill="#065f46" opacity="0.3" />
            <circle cx="90" cy="40" r="10" fill="#065f46" opacity="0.3" />

            {/* Male Figure (Left) */}
            <g id="man-group">
              {/* Body / Shirt */}
              <path d="M15 120 C15 90, 30 80, 52 80 C58 90, 55 105, 52 110 L15 120 Z" fill="#ffffff" />
              <path d="M40 80 L44 95 L48 80 Z" fill="#cbd5e1" />
              
              {/* Face / Chin */}
              <path d="M26 50 C26 72, 52 72, 52 50" fill="#fed7aa" />
              
              {/* Sunglasses (Green reflection sports) */}
              <path d="M25 48 Q39 53, 53 48 C51 55, 27 55, 25 48 Z" fill="url(#manGlasses)" />
              <path d="M38 48 Q39 51, 40 48" stroke="#1e293b" strokeWidth="1.5" />
              
              {/* Cap (White sports cap with black Nike swoosh) */}
              <path d="M24 45 C24 25, 54 25, 54 45 Z" fill="#ffffff" />
              <path d="M35 34 Q40 31, 44 32 Q39 35, 34 37 Z" fill="#0f172a" />
              <path d="M20 44 Q35 46, 52 46 Q55 42, 53 41 L22 41 Z" fill="#e2e8f0" />
            </g>

            {/* Female Figure (Right) */}
            <g id="woman-group">
              {/* Body / Shirt */}
              <path d="M55 120 C57 95, 80 82, 105 82 C105 100, 100 110, 105 120 Z" fill="#ffffff" />
              <path d="M72 82 L76 96 L80 82 Z" fill="#1e293b" />
              
              {/* Face */}
              <path d="M58 52 C58 74, 84 74, 84 52" fill="#ffedd5" />
              
              {/* Sunglasses (Purple sports) */}
              <path d="M57 51 Q71 55, 85 51 C83 58, 59 58, 57 51 Z" fill="url(#womanGlasses)" />
              <path d="M70 51 Q71 54, 72 51" stroke="#1e293b" strokeWidth="1.5" />
              
              {/* Visor Cap (White PING cap) */}
              <path d="M52 49 Q75 51, 88 47 Q85 41, 80 43 L54 44 Z" fill="#ffffff" />
              <path d="M52 49 Q75 51, 88 47" stroke="#cbd5e1" strokeWidth="2" />
              <path d="M58 45 C58 35, 82 35, 82 45 Z" fill="#ffffff" />
              <rect x="64" y="38" width="12" height="4" rx="1" fill="#1e293b" />
            </g>
          </svg>
          
          <span>SkKy Golf</span>
          
          {/* Subtle sync settings gear to provide access to cloud sync */}
          <button 
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="ml-2.5 text-lg opacity-85 hover:opacity-100 active:scale-90 transition duration-150 p-1 bg-[#115e59] hover:bg-[#134e4a] rounded-lg shadow-sm flex items-center justify-center border-0"
            style={{ minHeight: '32px', minWidth: '32px' }}
            title="Dynamic Sync Settings"
          >
            ⚙️
          </button>
        </h1>
        <p className="text-xl text-emerald-50 mt-1 font-bold leading-none animate-fadeIn" style={{ fontFamily: '"Nanum Pen Script", cursive' }}>시근이와 계영이의 골프 여행기</p>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* --- TAB 1: SCOREBOARD --- */}
        {activeTab === 'score' && (
          <div className="space-y-4 fade-in">
            
            {/* Decoupled Round Setup Boxes */}
            <div className="grid grid-cols-2 gap-3.5">
              {/* Course Box Card */}
              <div className="bg-transparent p-0 border-0 shadow-none flex flex-col justify-between">
                <label className="block text-xs font-black text-emerald-800 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <span>📍</span> Golf Course
                </label>
                <select 
                  className="w-full p-3.5 border border-gray-300 rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-base shadow-sm transition-all text-gray-800 font-bold"
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

              {/* Play Date Box Card */}
              <div className="bg-transparent p-0 border-0 shadow-none flex flex-col justify-between">
                <label className="block text-xs font-black text-emerald-800 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <span>📅</span> Play Date
                </label>
                <input 
                  type="date" 
                  className="w-full p-3.5 border border-gray-300 rounded-none focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-base shadow-sm text-gray-800 font-bold font-sans"
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

            {/* Live Matrix Section (Split tables in UI Grid) - Positioned immediately under setup */}
            <div className="bg-transparent p-0 rounded-none border-0 shadow-none space-y-3.5 w-full">
              <div className="flex items-center justify-between px-1 w-full">
                <span className="text-lg font-black text-emerald-800 tracking-wider uppercase">
                  Live Scoreboard
                </span>
                <button 
                  type="button"
                  onClick={handleSaveScore}
                  disabled={(!isNewCourse && !selectedCourseId) || (isNewCourse && !newCourseNameInput.trim())}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-extrabold px-3.5 py-1.5 rounded-xl text-xs shadow-md transition active:scale-95 outline-none select-none"
                >
                  Save
                </button>
              </div>

              {/* Front Nine layout */}
              <div className="w-full">
                <span className="text-xs font-black text-gray-500 block mb-1.5 px-1 tracking-wide">⛳ Front</span>
                <div className="border border-gray-300 rounded-none overflow-hidden flex bg-white text-center" style={{ width: 'calc(3rem + (100% - 3rem) * 10 / 11)' }}>
                  <div className="w-12 bg-gray-50 flex flex-col justify-around text-xs font-extrabold text-gray-500 py-1.5 border-r border-gray-300 shrink-0 select-none">
                    <span className="h-5 flex items-center justify-center text-gray-600 font-extrabold text-sm">Hole</span>
                    <span className="h-4 flex items-center justify-center text-red-600 font-black tracking-normal text-xs">Par</span>
                    <span className="h-6 flex items-center justify-center text-emerald-800 font-black text-sm">SK</span>
                    <span className="h-6 flex items-center justify-center text-teal-800 font-black text-sm">KY</span>
                  </div>
                  {/* Grid for 9 holes + OUT (10 columns total) */}
                  <div className="flex-1 grid grid-cols-10 divide-x divide-gray-200">
                    {scoreboardHoles.slice(0, 9).map((h, k) => {
                      const isClickable = (k === currentFocusedIndex);
                      const p1T = h.iron + h.putt;
                      const p2T = h.iron2 + h.putt2;
                      const holePar = courseHolePars[k] || 4;
                      return (
                        <div 
                          key={k}
                          onClick={isClickable ? () => openScoreModal(k) : undefined}
                          className={`py-1 flex flex-col justify-around transition-all ${
                            isClickable 
                              ? 'cursor-pointer bg-amber-50/30 hover:bg-amber-50/60 ring-2 ring-amber-400 ring-inset animate-pulse-slow' 
                              : 'cursor-default grayscale-[20%] opacity-85'
                          }`}
                        >
                          <span className={`text-sm font-bold h-5 flex items-center justify-center ${isClickable ? 'text-amber-800 font-black text-sm' : 'text-gray-500'}`}>
                            {h.hole}
                          </span>
                          <span className="text-xs font-black text-red-500 h-4 flex items-center justify-center">
                            {holePar}
                          </span>
                          <div className="h-6 flex items-center justify-center">
                            {renderScoreSymbol(p1T, holePar, isClickable, isClickable && p1T === 0)}
                          </div>
                          <div className="h-6 flex items-center justify-center">
                            {renderScoreSymbol(p2T, holePar, isClickable, isClickable && p2T === 0)}
                          </div>
                        </div>
                      );
                    })}
                    {/* OUT subtotal column (occupies 10th col) */}
                    <div className="bg-gray-50 flex flex-col justify-around py-1.5 text-center select-none font-bold">
                      <span className="text-sm font-black h-5 flex items-center justify-center text-gray-700 bg-gray-100/50">OUT</span>
                      <span className="text-[11px] font-black text-red-600 h-4 flex items-center justify-center">{parOut}</span>
                      <span className="text-sm font-black text-emerald-800 h-6 flex items-center justify-center bg-emerald-50/40">{p1Out > 0 ? p1Out : '-'}</span>
                      <span className="text-sm font-black text-teal-850 h-6 flex items-center justify-center bg-teal-50/40">{p2Out > 0 ? p2Out : '-'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Back Nine layout */}
              <div className="w-full">
                <span className="text-xs font-black text-gray-500 block mb-1.5 px-1 tracking-wide">⛳ Back</span>
                <div className="border border-gray-300 rounded-none overflow-hidden flex bg-white text-center w-full">
                  <div className="w-12 bg-gray-50 flex flex-col justify-around text-xs font-extrabold text-gray-500 py-1.5 border-r border-gray-300 shrink-0 select-none">
                    <span className="h-5 flex items-center justify-center text-gray-600 font-extrabold text-sm">Hole</span>
                    <span className="h-4 flex items-center justify-center text-red-600 font-black tracking-normal text-xs">Par</span>
                    <span className="h-6 flex items-center justify-center text-emerald-800 font-black text-sm">SK</span>
                    <span className="h-6 flex items-center justify-center text-teal-800 font-black text-sm">KY</span>
                  </div>
                  {/* Grid for 9 holes + IN + TOT column (11 columns total) */}
                  <div className="flex-1 grid grid-cols-11 divide-x divide-gray-200">
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
                          className={`py-1 flex flex-col justify-around transition-all ${
                            isClickable 
                              ? 'cursor-pointer bg-amber-50/30 hover:bg-amber-50/60 ring-2 ring-amber-400 ring-inset animate-pulse-slow' 
                              : 'cursor-default grayscale-[20%] opacity-85'
                          }`}
                        >
                          <span className={`text-sm font-bold h-5 flex items-center justify-center ${isClickable ? 'text-amber-800 font-black text-sm' : 'text-gray-500'}`}>
                            {h.hole}
                          </span>
                          <span className="text-xs font-black text-red-500 h-4 flex items-center justify-center">
                            {holePar}
                          </span>
                          <div className="h-6 flex items-center justify-center">
                            {renderScoreSymbol(p1T, holePar, isClickable, isClickable && p1T === 0)}
                          </div>
                          <div className="h-6 flex items-center justify-center">
                            {renderScoreSymbol(p2T, holePar, isClickable, isClickable && p2T === 0)}
                          </div>
                        </div>
                      );
                    })}
                    {/* IN subtotal column (occupies 10th col) */}
                    <div className="bg-gray-50 flex flex-col justify-around py-1.5 text-center select-none font-bold">
                      <span className="text-sm font-black h-5 flex items-center justify-center text-gray-700 bg-gray-100/50">IN</span>
                      <span className="text-[11px] font-black text-red-600 h-4 flex items-center justify-center">{parIn}</span>
                      <span className="text-sm font-black text-emerald-800 h-6 flex items-center justify-center bg-emerald-50/40">{p1In > 0 ? p1In : '-'}</span>
                      <span className="text-sm font-black text-teal-855 h-6 flex items-center justify-center bg-teal-50/40">{p2In > 0 ? p2In : '-'}</span>
                    </div>
                    {/* TOT total column (occupies 11th col) */}
                    <div className="bg-indigo-50/40 flex flex-col justify-around py-1.5 text-center select-none font-bold">
                      <span className="text-sm font-black h-5 flex items-center justify-center text-indigo-900 bg-indigo-100/40">TOT</span>
                      <span className="text-[11px] font-black text-red-655 h-4 flex items-center justify-center">{parTotal}</span>
                      <span className="text-sm font-black text-emerald-800 h-6 flex items-center justify-center bg-emerald-100/55">{p1Total > 0 ? p1Total : '-'}</span>
                      <span className="text-sm font-black text-teal-800 h-6 flex items-center justify-center bg-teal-100/55">{p2Total > 0 ? p2Total : '-'}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Score Entry Popup Modal */}
            {isScoreInputModalOpen && editingHoleIndex !== null && (
              <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-none w-full max-w-sm p-6 shadow-2xl border border-gray-300 flex flex-col space-y-4 animate-fade-in text-left">
                  
                  {/* Modal Header */}
                  <div className="flex justify-between items-center pb-2.5 border-b border-gray-200">
                    <div className="flex flex-col">
                      <h3 className="text-xl font-black text-emerald-800 tracking-wide">
                        ⛳ HOLE {editingHoleIndex + 1}
                      </h3>
                      <span className="text-sm font-extrabold text-emerald-700 uppercase">
                        Par {courseHolePars[editingHoleIndex] || 4}
                      </span>
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
                        <div className="w-28 h-10 flex justify-between items-center bg-emerald-50/40 p-1 rounded-none border border-emerald-200 mt-1">
                          <button
                            type="button"
                            onClick={() => modifyScoreboardHoleIndex(editingHoleIndex, 'iron', -1)}
                            className="w-8 h-8 rounded-none bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200 font-black text-base shadow-sm flex justify-center items-center active:scale-95"
                          >
                            −
                          </button>
                          <span className="flex-1 text-center font-black text-lg text-emerald-800">
                            {scoreboardHoles[editingHoleIndex].iron}
                          </span>
                          <button
                            type="button"
                            onClick={() => modifyScoreboardHoleIndex(editingHoleIndex, 'iron', 1)}
                            className="w-8 h-8 rounded-none bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200 font-black text-base shadow-sm flex justify-center items-center active:scale-95"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* SK Putts */}
                      <div className="w-full flex flex-col items-center text-center">
                        <span className="text-[11px] font-extrabold text-gray-500 uppercase">Putts</span>
                        <div className="w-28 h-10 flex justify-between items-center bg-emerald-50/40 p-1 rounded-none border border-emerald-200 mt-1">
                          <button
                            type="button"
                            onClick={() => modifyScoreboardHoleIndex(editingHoleIndex, 'putt', -1)}
                            className="w-8 h-8 rounded-none bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200 font-black text-base shadow-sm flex justify-center items-center active:scale-95"
                          >
                            −
                          </button>
                          <span className="flex-1 text-center font-black text-lg text-emerald-800">
                            {scoreboardHoles[editingHoleIndex].putt}
                          </span>
                          <button
                            type="button"
                            onClick={() => modifyScoreboardHoleIndex(editingHoleIndex, 'putt', 1)}
                            className="w-8 h-8 rounded-none bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200 font-black text-base shadow-sm flex justify-center items-center active:scale-95"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="w-28 h-10 flex justify-center items-center bg-emerald-50 p-1 rounded-none border border-emerald-200 mt-1 text-sm font-bold text-emerald-800 text-center">
                        Total: &nbsp;<strong className="font-extrabold text-base">{scoreboardHoles[editingHoleIndex].iron + scoreboardHoles[editingHoleIndex].putt}</strong>
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
                        <div className="w-28 h-10 flex justify-between items-center bg-teal-50/40 p-1 rounded-none border border-teal-200 mt-1">
                          <button
                            type="button"
                            onClick={() => modifyScoreboardHoleIndex(editingHoleIndex, 'iron2', -1)}
                            className="w-8 h-8 rounded-none bg-white text-teal-800 hover:bg-teal-50 border border-teal-200 font-black text-base shadow-sm flex justify-center items-center active:scale-95"
                          >
                            −
                          </button>
                          <span className="flex-1 text-center font-black text-lg text-teal-800">
                            {scoreboardHoles[editingHoleIndex].iron2}
                          </span>
                          <button
                            type="button"
                            onClick={() => modifyScoreboardHoleIndex(editingHoleIndex, 'iron2', 1)}
                            className="w-8 h-8 rounded-none bg-white text-teal-800 hover:bg-teal-50 border border-teal-200 font-black text-base shadow-sm flex justify-center items-center active:scale-95"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* KY Putts */}
                      <div className="w-full flex flex-col items-center text-center">
                        <span className="text-[11px] font-extrabold text-gray-500 uppercase">Putts</span>
                        <div className="w-28 h-10 flex justify-between items-center bg-teal-50/40 p-1 rounded-none border border-teal-200 mt-1">
                          <button
                            type="button"
                            onClick={() => modifyScoreboardHoleIndex(editingHoleIndex, 'putt2', -1)}
                            className="w-8 h-8 rounded-none bg-white text-teal-800 hover:bg-teal-50 border border-teal-200 font-black text-base shadow-sm flex justify-center items-center active:scale-95"
                          >
                            −
                          </button>
                          <span className="flex-1 text-center font-black text-lg text-teal-800">
                            {scoreboardHoles[editingHoleIndex].putt2}
                          </span>
                          <button
                            type="button"
                            onClick={() => modifyScoreboardHoleIndex(editingHoleIndex, 'putt2', 1)}
                            className="w-8 h-8 rounded-none bg-white text-teal-800 hover:bg-teal-50 border border-teal-200 font-black text-base shadow-sm flex justify-center items-center active:scale-95"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="w-28 h-10 flex justify-center items-center bg-teal-50 p-1 rounded-none border border-teal-200 mt-1 text-sm font-bold text-teal-800 text-center">
                        Total: &nbsp;<strong className="font-extrabold text-base">{scoreboardHoles[editingHoleIndex].iron2 + scoreboardHoles[editingHoleIndex].putt2}</strong>
                      </div>
                    </div>

                  </div>

                  {/* Confirm Button */}
                  <div className="pt-3 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setIsScoreInputModalOpen(false)}
                      className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-black rounded-none text-center text-base shadow transition active:scale-95"
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
                        className="bg-red-50 hover:bg-red-100 text-red-650 font-bold py-2.5 px-4 rounded-xl text-xs transition active:scale-95 border border-red-200"
                      >
                        🗑️ Delete
                      </button>
                      
                      <button 
                        type="button"
                        onClick={() => setSelectedHistoryScore(null)}
                        className="flex-grow bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition active:scale-95 shadow"
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
          <div className="bg-white rounded-none p-6 w-full max-w-sm border border-gray-300 shadow-2xl space-y-4 animate-fade-in text-left">
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
                <input 
                  type="text" 
                  className="w-full text-xs font-semibold p-2.5 border border-gray-300 rounded-none focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-gray-850"
                  value={firebaseUrl}
                  onChange={(e) => setFirebaseUrl(e.target.value)}
                  placeholder="https://your-project-rtdb.firebaseio.com"
                />
                <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                  * Leaving empty defaults to global high-speed channel.
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

    </div>
  );
}
