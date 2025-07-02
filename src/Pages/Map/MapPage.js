import React, { useRef, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './MapPage.css';

const MapPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    symptom,
    department,
    reason,
    recommendedHospitals,
    userLocation
  } = location.state || {};

  const mapRef = useRef(null);
  const polylineRef = useRef(null);
  const userMarkerRef = useRef(null);
  const watchIdRef = useRef(null);

  const [isSheetOpen, setIsSheetOpen] = useState(true);
  const [isSummaryOpen, setIsSummaryOpen] = useState(true);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [eta, setEta] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!symptom || !department || !userLocation) return;

    if (!window.kakao || !window.kakao.maps) return;

    const kakao = window.kakao;
    const center = new kakao.maps.LatLng(userLocation.lat, userLocation.lng);
    const container = document.getElementById('map');

    const options = { center, level: 5 }; // 초기 레벨
    const map = new kakao.maps.Map(container, options);
    mapRef.current = map;

    // 내 위치 마커
    const imageSrc = "/images/mark.PNG";
    const imageSize = new kakao.maps.Size(40, 40);
    const imageOption = { offset: new kakao.maps.Point(20, 40) };
    const userMarkerImage = new kakao.maps.MarkerImage(imageSrc, imageSize, imageOption);

    userMarkerRef.current = new kakao.maps.Marker({
      map,
      position: center,
      title: "내 위치",
      image: userMarkerImage
    });

    // 병원 마커
    recommendedHospitals?.forEach(h => {
      if (!h.x || !h.y) return;
      const pos = new kakao.maps.LatLng(Number(h.y), Number(h.x));
      const marker = new kakao.maps.Marker({
        map,
        position: pos,
        title: h.placeName,
      });
      const info = new kakao.maps.InfoWindow({
        content: `<div style="padding:6px;font-size:12px;">🏥 ${h.placeName}</div>`
      });
      info.open(map, marker);
    });

    // bounds 한 번만
    const bounds = new kakao.maps.LatLngBounds();
    bounds.extend(center);
    recommendedHospitals?.forEach(h => {
      if (!h.y || !h.x) return;
      bounds.extend(new kakao.maps.LatLng(Number(h.y), Number(h.x)));
    });
    map.setBounds(bounds);
    map.setLevel(5); // 초기 레벨 고정

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [recommendedHospitals, userLocation, symptom, department]);

  // 길찾기
  const handleRoute = async (hospital) => {
    setSelectedHospital(hospital);

    if (!window.kakao || !mapRef.current) return;
    const kakao = window.kakao;

    try {
      const response = await fetch(
        `https://apis-navi.kakaomobility.com/v1/directions?origin=${userLocation.lng},${userLocation.lat}&destination=${hospital.lng},${hospital.lat}`,
        {
          headers: {
            Authorization: `KakaoAK ${process.env.REACT_APP_KAKAO_REST_API_KEY}`
          }
        }
      );
      const data = await response.json();

      if (data.routes && data.routes[0]) {
        const section = data.routes[0].sections[0];
        const roads = section.roads;

        const linePath = [];
        roads.forEach(road => {
          for (let i = 0; i < road.vertexes.length; i += 2) {
            const lng = road.vertexes[i];
            const lat = road.vertexes[i + 1];
            linePath.push(new kakao.maps.LatLng(lat, lng));
          }
        });

        if (polylineRef.current) polylineRef.current.setMap(null);

        polylineRef.current = new kakao.maps.Polyline({
          map: mapRef.current,
          path: linePath,
          strokeWeight: 6,
          strokeColor: '#007bff',
          strokeOpacity: 0.8,
          strokeStyle: 'solid',
        });

        setEta({
          distance: (section.distance/1000).toFixed(1),
          duration: Math.ceil(section.duration/60),
        });

        setError("");
      }
    } catch (err) {
      console.error(err);
      setError("길찾기 요청 실패");
    }
  };

  // 실시간 추적
  const toggleTracking = () => {
    if (isTracking) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setIsTracking(false);
    } else {
      if (!navigator.geolocation) {
        alert("위치추적 불가");
        return;
      }
      setIsTracking(true);
      watchIdRef.current = navigator.geolocation.watchPosition((pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        if (!mapRef.current) return;
        const kakao = window.kakao;
        const newPos = new kakao.maps.LatLng(lat, lng);

        if (userMarkerRef.current) {
          userMarkerRef.current.setPosition(newPos);
        }
      });
    }
  };

  const handleToggleSheet = () => {
    setIsSheetOpen(prev => !prev);
  };

  if (!symptom || !department) {
    return (
      <div style={{ textAlign: 'center', padding: '1rem' }}>
        잘못된 접근입니다. 메인으로 돌아가세요.
        <button
          onClick={() => navigate('/')}
          style={{
            marginTop: '1rem',
            background: '#007bff',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '8px'
          }}
        >
          메인으로
        </button>
      </div>
    );
  }

  return (
    <div className="map-page-container">
      {/* 지도 */}
      <div id="map" style={{ width: "100%", height: "100dvh" }}></div>

      {/* 상단 요약 */}
      <div className={`map-top-overlay ${isSummaryOpen ? 'open' : 'closed'}`}>
        <button
          className="summary-toggle"
          onClick={() => setIsSummaryOpen(prev => !prev)}
        >
          {isSummaryOpen ? '▲ 요약 닫기' : '▼ 요약 열기'}
        </button>
        {isSummaryOpen && (
          <div className="summary-content">
            <div><span>📝</span> <strong>{symptom}</strong></div>
            <div><span>🏥</span> {department}</div>
            {reason && <div><span>🧠</span> {reason}</div>}
            {selectedHospital && eta && (
              <div style={{marginTop: "8px"}}>
                🚗 <strong>{selectedHospital.name}</strong>까지  
                {eta.distance}km / 약 {eta.duration}분
              </div>
            )}
          </div>
        )}
      </div>

      {/* 병원리스트 */}
      <div className={`bottom-sheet ${isSheetOpen ? 'open' : ''}`}>
        {isSheetOpen && (
          <div className="hospital-list">
            {recommendedHospitals.length === 0 ? (
              <div className="hospital-empty">추천된 병원이 없습니다.</div>
            ) : (
              recommendedHospitals.map((h, idx) => (
                <div key={idx} className="hospital-item">
                  <strong>{h.placeName || '이름 없음'}</strong>
                  <div>{h.addressName || '주소 없음'}</div>
                  <div>📞 {h.phone || '번호 없음'}</div>
                  <div>📍 {h.distance ? `${h.distance}m` : '거리정보 없음'}</div>
                  <button
                    className="navigate-btn"
                    onClick={() => handleRoute({
                      ...h,
                      lat: Number(h.y),
                      lng: Number(h.x)
                    })}
                  >
                    길찾기 안내
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 토글버튼 고정 */}
      <button
        className="bottom-sheet-toggle-fixed"
        onClick={handleToggleSheet}
      >
        {isSheetOpen ? '▼ 주변 병원 닫기' : '▲ 주변 병원 보기'}
      </button>

      {/* 경로 컨트롤 */}
      {selectedHospital && (
        <div className="route-controls">
          <button onClick={toggleTracking}>
            {isTracking ? "📍 추적 중지" : "📍 실시간 추적"}
          </button>
          {error && <div style={{color:"red"}}>{error}</div>}
        </div>
      )}
    </div>
  );
};

export default MapPage;
