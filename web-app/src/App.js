import React, { useState, useEffect } from 'react';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  if (dateStr.includes('/')) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[1]}/${parts[2]}/${parts[0]}`;
  }
  return dateStr;
};

export default function App() {
  const [activeTab, setActiveTab] = useState('score'); // 'score', 'course', 'history'

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
        date: '2026-05-10',
        holes: Array.from({ length: 18 }, (_, i) => ({ hole: i + 1, iron: 3, putt: 2 })),
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
      }
    ];
  });

  // Save to LocalStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('golf_diary_scores', JSON.stringify(scores));
  }, [scores]);

  useEffect(() => {
    localStorage.setItem('golf_diary_courses', JSON.stringify(courses));
  }, [courses]);

  // Score Form States
  const [newScore, setNewScore] = useState({
    courseId: '',
    newCourseName: '', // Direct name input fallback
    date: new Date().toISOString().split('T')[0],
    holes: Array.from({ length: 18 }, (_, i) => ({ hole: i + 1, iron: '', putt: '' }))
  });

  // Course Form States with Detailed Fields
  const [newCourse, setNewCourse] = useState({
    name: '',
    address: '',
    totalPar: 72,
    ladyRating: '',
    ladySlope: '',
    blueRating: '',
    blueSlope: '',
    lat: '33.3541',
    lng: '126.3712'
  });

  // Virtual map tracker for simulated GPS picker
  const [mapClickedCoords, setMapClickedCoords] = useState({ lat: 33.3541, lng: 126.3712 });
  const [showCourseModal, setShowCourseModal] = useState(false);

  const handleMapClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Simulate mapping click coordinates to relative latitude & longitude offsets
    const simulatedLat = (33.3541 + (y / rect.height) * 0.1).toFixed(4);
    const simulatedLng = (126.3712 + (x / rect.width) * 0.1).toFixed(4);
    
    setMapClickedCoords({ lat: parseFloat(simulatedLat), lng: parseFloat(simulatedLng) });
    setNewCourse(prev => ({ ...prev, lat: simulatedLat, lng: simulatedLng }));
  };

  const handleSaveScore = (e) => {
    e.preventDefault();
    let courseId = Number(newScore.courseId);
    let courseName = '';

    if (!newScore.courseId) {
      alert('Please select or write a golf course.');
      return;
    }

    if (newScore.courseId === 'new') {
      if (!newScore.newCourseName) {
        alert('Please enter a golf course name.');
        return;
      }
      const newCreatedCourse = {
        id: Date.now(),
        name: newScore.newCourseName,
        address: 'Direct Entry Address',
        totalPar: 72,
        ladyRating: 72.0,
        ladySlope: 113,
        blueRating: 72.0,
        blueSlope: 113,
        lat: 37.5665,
        lng: 126.9780
      };
      setCourses(prev => [...prev, newCreatedCourse]);
      courseId = newCreatedCourse.id;
      courseName = newCreatedCourse.name;
    } else {
      const selected = courses.find(c => c.id === courseId);
      courseName = selected ? selected.name : 'Unknown Course';
    }

    const processedHoles = newScore.holes.map(h => ({
      hole: h.hole,
      iron: Number(h.iron) || 0,
      putt: Number(h.putt) || 0
    }));

    const scoreData = {
      id: Date.now(),
      courseId,
      courseName,
      date: newScore.date,
      holes: processedHoles,
      photos: []
    };

    setScores(prev => [scoreData, ...prev]);
    alert('Golf score saved successfully!');
    
    // Reset inputs
    setNewScore({
      courseId: '',
      newCourseName: '',
      date: new Date().toISOString().split('T')[0],
      holes: Array.from({ length: 18 }, (_, i) => ({ hole: i + 1, iron: '', putt: '' }))
    });
  };

  const handleSaveCourse = (e) => {
    e.preventDefault();
    if (!newCourse.name) return alert('Please enter a golf course name.');
    
    const courseData = {
      id: Date.now(),
      name: newCourse.name,
      address: newCourse.address || 'Unknown Address',
      totalPar: parseInt(newCourse.totalPar) || 72,
      ladyRating: parseFloat(newCourse.ladyRating) || 72.0,
      ladySlope: parseInt(newCourse.ladySlope) || 113,
      blueRating: parseFloat(newCourse.blueRating) || 72.0,
      blueSlope: parseInt(newCourse.blueSlope) || 113,
      lat: parseFloat(newCourse.lat),
      lng: parseFloat(newCourse.lng)
    };

    setCourses(prev => [...prev, courseData]);
    setShowCourseModal(false);
    alert('New golf course successfully registered.');
    
    // Reset
    setNewCourse({
      name: '',
      address: '',
      totalPar: 72,
      ladyRating: '',
      ladySlope: '',
      blueRating: '',
      blueSlope: '',
      lat: '33.3541',
      lng: '126.3712'
    });
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

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col justify-between font-sans shadow-lg relative border-x border-gray-100 pb-20">
      
      {/* Top Header App Bar */}
      <header className="bg-emerald-700 text-white py-4 px-6 text-center shadow-md">
        <h1 className="text-xl font-extrabold tracking-wide">⛳ SKKY Golf</h1>
        <p className="text-xs text-emerald-100 mt-1 font-medium">시근이와 계영이의 골프 여행기</p>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* TAB 1: Score Input Form */}
        {activeTab === 'score' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">📝</span> Enter Today's Score
              </h2>
              
              <form onSubmit={handleSaveScore} className="space-y-4">
                
                {/* Course Selection */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Select Golf Course</label>
                  <select 
                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white shadow-sm transition-all"
                    value={newScore.courseId}
                    onChange={(e) => setNewScore({ ...newScore, courseId: e.target.value })}
                    required
                  >
                    <option value="">-- Choose a course --</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                    <option value="new">+ Quick Add New Golf Course</option>
                  </select>
                </div>

                {/* Quick Add Form Name */}
                {newScore.courseId === 'new' && (
                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-2">
                    <label className="block text-xs font-semibold text-emerald-800 uppercase">Quick Golf Course Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Gapyeong Benest GC"
                      className="w-full p-3 bg-white border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                      value={newScore.newCourseName || ''}
                      onChange={(e) => setNewScore({ ...newScore, newCourseName: e.target.value })}
                      required
                    />
                  </div>
                )}

                {/* Date Input */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Play Date</label>
                  <input 
                    type="date" 
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    value={newScore.date}
                    onChange={(e) => setNewScore({ ...newScore, date: e.target.value })}
                    required
                  />
                </div>

                {/* 18-Hole Dynamic Table */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">18-Hole Details</label>
                  <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm max-h-[350px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead className="bg-emerald-50/60 sticky top-0 backdrop-blur-sm">
                        <tr>
                          <th className="p-2 border-b border-gray-100 text-center font-bold text-emerald-800">Hole</th>
                          <th className="p-2 border-b border-gray-100 text-center font-bold text-emerald-800">Iron Shot</th>
                          <th className="p-2 border-b border-gray-100 text-center font-bold text-emerald-800">Putt</th>
                          <th className="p-2 border-b border-gray-100 text-center font-bold text-emerald-800">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {newScore.holes.map((h, idx) => {
                          const total = (Number(h.iron) || 0) + (Number(h.putt) || 0);
                          return (
                            <tr key={h.hole} className="hover:bg-gray-50/75 border-b border-gray-100 last:border-0 transition-all">
                              <td className="p-2 text-center font-bold text-gray-700">{h.hole}H</td>
                              <td className="p-1">
                                <input 
                                  type="number" 
                                  placeholder="0"
                                  min="0"
                                  className="w-full p-1.5 text-center border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                                  value={h.iron}
                                  onChange={(e) => {
                                    const updatedHoles = [...newScore.holes];
                                    updatedHoles[idx].iron = e.target.value;
                                    setNewScore({ ...newScore, holes: updatedHoles });
                                  }}
                                />
                              </td>
                              <td className="p-1">
                                <input 
                                  type="number" 
                                  placeholder="0"
                                  min="0"
                                  className="w-full p-1.5 text-center border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                                  value={h.putt}
                                  onChange={(e) => {
                                    const updatedHoles = [...newScore.holes];
                                    updatedHoles[idx].putt = e.target.value;
                                    setNewScore({ ...newScore, holes: updatedHoles });
                                  }}
                                />
                              </td>
                              <td className="p-2 text-center font-extrabold text-emerald-600">
                                {total > 0 ? total : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-4 rounded-xl transition duration-150 transform active:scale-95 shadow-md shadow-emerald-700/20"
                >
                  Save Score Record
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: Course Information & Advanced Custom Options */}
        {activeTab === 'course' && (
          <div className="space-y-4 animate-fadeIn">
            
            {/* Fake GPS Picker Map Area 항상 보이기 */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-base font-bold text-gray-800 mb-1 flex items-center">
                <span className="mr-2">🗺️</span> Course Location / 골프장 지도 시뮬레이터
              </h2>
              <p className="text-[11px] text-gray-400 mb-4 font-medium">지도 영역을 클릭하면 GPS 위치가 시뮬레이션 변경되며, 이 핀 주소를 기준으로 신규 골프장을 등록할 수 있습니다.</p>
              
              {/* Fake GPS Picker Map Area */}
              <div 
                onClick={handleMapClick}
                className="w-full h-36 bg-emerald-50 border border-emerald-100 rounded-xl flex flex-col items-center justify-center relative cursor-crosshair overflow-hidden group shadow-inner"
              >
                {/* Visual grid dots for simulation */}
                <div className="absolute inset-0 bg-opacity-10 bg-[radial-gradient(#107c41_1px,transparent_1px)] [background-size:16px_16px]"></div>
                
                {/* Map Pins overlay */}
                <div className="z-10 bg-white px-3 py-1.5 rounded-full shadow-md border border-gray-100 text-xs text-gray-700 flex items-center space-x-1.5 transition-all transform group-hover:scale-105">
                  <span>📍</span> 
                  <span className="font-bold text-emerald-800">Lat: {mapClickedCoords.lat}, Lng: {mapClickedCoords.lng}</span>
                </div>
                <div className="absolute bottom-1.5 text-[10px] text-gray-400 font-semibold uppercase tracking-widest text-center">클릭하여 핀 위치 변경하기</div>
              </div>

              {/* Add Golf Course Button */}
              <button 
                onClick={() => setShowCourseModal(true)}
                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-4 rounded-xl text-sm transition duration-150 transform active:scale-95 shadow-md shadow-emerald-700/20"
              >
                ⛳ Add Golf Course / 골프장 등록하기
              </button>
            </div>

            {/* Registration Modal Overlay */}
            {showCourseModal && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto p-5 shadow-2xl border border-gray-100 flex flex-col">
                  <div className="flex justify-between items-center pb-3 border-b border-gray-100 mb-4">
                    <h3 className="text-base font-bold text-gray-800 flex items-center">
                      <span className="mr-2">⛳</span> 등록할 골프장 정보 입력
                    </h3>
                    <button 
                      onClick={() => setShowCourseModal(false)}
                      className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <p className="text-xs text-emerald-800 font-semibold mb-3 bg-emerald-50 p-2.5 rounded-lg text-center">
                    📍 Selected GPS Lat: {mapClickedCoords.lat}, Lng: {mapClickedCoords.lng}
                  </p>

                  <form onSubmit={handleSaveCourse} className="space-y-4 text-left">
                    {/* Course Name */}
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">골프장 이름 (Golf Course Name)</label>
                      <input 
                        type="text" 
                        placeholder="예: Nine Bridges CC" 
                        className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        value={newCourse.name}
                        onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                        required
                      />
                    </div>

                    {/* Custom Address Input */}
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">골프장 주소 (Course Address)</label>
                      <input 
                        type="text" 
                        placeholder="예: 제주 안덕면 광평리" 
                        className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        value={newCourse.address}
                        onChange={(e) => setNewCourse({ ...newCourse, address: e.target.value })}
                      />
                    </div>

                    {/* Total Par Parameter */}
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">골프장 총 Par (Total Course Par)</label>
                      <input 
                        type="number" 
                        placeholder="72" 
                        className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        value={newCourse.totalPar}
                        onChange={(e) => setNewCourse({ ...newCourse, totalPar: e.target.value })}
                      />
                    </div>

                    {/* Tee Box Configuration Inputs Display */}
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-3">
                      <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">티박스 난이도 정보 (Tee Info)</h3>
                      
                      {/* Lady Tee Config */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-pink-700 uppercase">Lady 레이팅</label>
                          <input 
                            type="number" 
                            step="0.1"
                            placeholder="72.1" 
                            className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-pink-500"
                            value={newCourse.ladyRating}
                            onChange={(e) => setNewCourse({ ...newCourse, ladyRating: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-pink-700 uppercase">Lady 슬롭</label>
                          <input 
                            type="number" 
                            placeholder="113" 
                            className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-pink-500"
                            value={newCourse.ladySlope}
                            onChange={(e) => setNewCourse({ ...newCourse, ladySlope: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Blue Tee Config */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-blue-700 uppercase">Blue 레이팅</label>
                          <input 
                            type="number" 
                            step="0.1"
                            placeholder="73.5" 
                            className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={newCourse.blueRating}
                            onChange={(e) => setNewCourse({ ...newCourse, blueRating: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-blue-700 uppercase">Blue 슬롭</label>
                          <input 
                            type="number" 
                            placeholder="113" 
                            className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={newCourse.blueSlope}
                            onChange={(e) => setNewCourse({ ...newCourse, blueSlope: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-2 pt-2">
                      <button 
                        type="button"
                        onClick={() => setShowCourseModal(false)}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 px-4 rounded-xl text-sm transition"
                      >
                        취소 (Cancel)
                      </button>
                      <button 
                        type="submit" 
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 px-4 rounded-xl text-sm transition"
                      >
                        등록하기 (Register)
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Courses Overview List and Personal Feed */}
            <div className="space-y-3">
              <h3 className="text-sm font-extrabold text-gray-700 px-1 uppercase tracking-wider">📍 Registered Course Profiles</h3>
              
              {courses.map(course => {
                const courseHistories = scores.filter(s => s.courseId === course.id);

                return (
                  <div key={course.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0 pr-2">
                        <h4 className="font-extrabold text-gray-800 text-base leading-tight truncate">{course.name}</h4>
                        <p className="text-xs text-gray-400 mt-1 truncate"><strong>Address:</strong> {course.address}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 font-mono">Location: {course.lat}, {course.lng}</p>
                        <p className="text-xs font-semibold text-gray-700 mt-1">Total Par: {course.totalPar}</p>
                      </div>
                      <div className="text-right text-xs rounded bg-emerald-50/50 p-2 min-w-[100px] border border-emerald-50">
                        <span className="block font-semibold text-rose-700">Lady: {course.ladyRating} (S:{course.ladySlope})</span>
                        <span className="block font-semibold text-blue-700 mt-0.5">Blue: {course.blueRating} (S:{course.blueSlope})</span>
                      </div>
                    </div>

                    {/* Historical Runs */}
                    <div className="border-t border-gray-100 pt-3">
                      <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">🏆 Play History ({courseHistories.length} games)</p>
                      {courseHistories.length === 0 ? (
                        <p className="text-xs text-gray-300">No scorecards recorded for this club yet.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-32 overflow-y-auto">
                          {courseHistories.map(h => {
                            const totalStrokes = h.holes.reduce((sum, hole) => sum + (hole.iron || 0) + (hole.putt || 0), 0);
                            const totalPutts = h.holes.reduce((sum, hole) => sum + (hole.putt || 0), 0);
                            return (
                              <div key={h.id} className="flex justify-between items-center text-xs bg-gray-50/70 p-2 rounded-xl border border-gray-100">
                                <span className="text-gray-400 font-mono font-bold">{formatDate(h.date)}</span>
                                <span className="font-bold text-gray-700">
                                  {totalStrokes} Strokes <span className="text-emerald-600 font-normal">({totalPutts} Putts)</span>
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* TAB 3: History & Shared Gallery Section */}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-fadeIn">
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
                  const totalStrokes = score.holes.reduce((sum, h) => sum + (h.iron || 0) + (h.putt || 0), 0);
                  const totalPutts = score.holes.reduce((sum, h) => sum + (h.putt || 0), 0);

                  return (
                    <div key={score.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      
                      {/* Card Header Info block */}
                      <div className="bg-gray-50/80 p-4 border-b border-gray-100 flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-gray-800 text-base leading-snug">{score.courseName}</h3>
                          <p className="text-xs text-gray-400 font-bold mt-0.5">📅 {formatDate(score.date)}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-black text-emerald-600 leading-none">{totalStrokes}</span>
                          <span className="text-xs font-bold text-gray-500 ml-1">Strokes</span>
                          <span className="block text-[10px] text-gray-400 font-semibold">{totalPutts} Total Putts</span>
                        </div>
                      </div>

                      {/* Attached Gallery and Upload Trigger */}
                      <div className="p-4 space-y-3 bg-white">
                        <div className="grid grid-cols-3 gap-2">
                          {score.photos && score.photos.map((photo, i) => (
                            <div key={i} className="aspect-square rounded-xl overflow-hidden bg-gray-50 border border-gray-150 shadow-sm relative group">
                              <img src={photo} alt="round memorial" className="w-full h-full object-cover" />
                              <button 
                                onClick={() => {
                                  // Easy deletion helper
                                  setScores(prev => prev.map(s => {
                                    if (s.id === score.id) {
                                      const u = [...s.photos];
                                      u.splice(i, 1);
                                      return { ...s, photos: u };
                                    }
                                    return s;
                                  }))
                                }}
                                className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 text-xxs flex items-center justify-center hover:bg-black/80 shadow transition-opacity opacity-0 group-hover:opacity-100"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          
                          {/* File Uploader Frame */}
                          <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-emerald-500 hover:bg-emerald-50/30 flex flex-col items-center justify-center cursor-pointer bg-gray-50/50 transition-all p-2 text-center select-none active:scale-95">
                            <span className="text-xl text-gray-400 group-hover:text-emerald-500 font-bold">+</span>
                            <span className="text-[10px] text-gray-400 font-bold">Add Photo</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => handlePhotoUpload(score.id, e)} 
                            />
                          </label>
                        </div>
                      </div>

                    </div>
                  );
                })
            )}
          </div>
        )}

      </main>

      {/* Styled Bottom Navigation Toolbar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-150 flex justify-around py-3.5 shadow-xl z-50">
        <button 
          onClick={() => setActiveTab('score')}
          className={`flex flex-col items-center space-y-1 transition-all active:scale-95 ${activeTab === 'score' ? 'text-emerald-600 scale-105 font-bold' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <span className="text-xl">📝</span>
          <span className="text-[13px] font-bold">Scoreboard</span>
        </button>
        <button 
          onClick={() => setActiveTab('course')}
          className={`flex flex-col items-center space-y-1 transition-all active:scale-95 ${activeTab === 'course' ? 'text-emerald-600 scale-105 font-bold' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <span className="text-xl">🗺️</span>
          <span className="text-[13px] font-bold">Courses</span>
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center space-y-1 transition-all active:scale-95 ${activeTab === 'history' ? 'text-emerald-600 scale-105 font-bold' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <span className="text-xl">📸</span>
          <span className="text-[13px] font-bold">History</span>
        </button>
      </nav>

    </div>
  );
}
