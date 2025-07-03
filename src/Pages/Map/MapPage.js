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
    recommendedHospitals = [],
    userLocation
  } = location.state || {};

  const mapRef = useRef(null);
  const polylineRef = useRef(null);
  const userMarkerRef = useRef(null);

  // F5 시 기본 열림
  const [isSummaryOpen, setIsSummaryOpen] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [eta, setEta] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!symptom || !department || !userLocation) return;
    if (!window.kakao || !window.kakao.maps) return;

    const kakao = window.kakao;
    const center = new kakao.maps.LatLng(userLocation.lat, userLocation.lng);
    const container = document.getElementById('map');

    const options = { center, level: 3 };
    const map = new kakao.maps.Map(container, options);
    mapRef.current = map;

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

    recommendedHospitals.forEach(h => {
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

    const bounds = new kakao.maps.LatLngBounds();
    bounds.extend(center);
    recommendedHospitals.forEach(h => {
      if (!h.y || !h.x) return;
      bounds.extend(new kakao.maps.LatLng(Number(h.y), Number(h.x)));
    });
    map.setBounds(bounds);

  }, [recommendedHospitals, userLocation, symptom, department]);

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
      <div id="map" style={{ width: "100%", height: "100dvh" }}></div>

      {/* 요약 패널 */}
      <div className={`map-top-overlay ${isSummaryOpen ? '' : 'closed'}`}>
        {/* 토글 버튼 패널 위에 겹치게 */}
        <img
          src={isSummaryOpen ? "/images/left.png" : "/images/right.png"}
          className="summary-toggle-icon"
          onClick={() => setIsSummaryOpen(prev => !prev)}
          alt="toggle summary"
        />
        <div className="summary-content">
          <div><span>📝</span> <strong>{symptom}</strong></div>
          <div><span>🏥</span> {department}</div>
          {reason && <div><span>🧠</span> {reason}</div>}
        </div>
      </div>

      {/* bottom sheet */}
      <div className={`bottom-sheet ${isSheetOpen ? 'open' : ''}`}>
        <img
          src={isSheetOpen ? "/images/up.png" : "/images/down.png"}
          className="bottom-sheet-toggle-btn"
          onClick={() => setIsSheetOpen(prev => !prev)}
          alt="toggle hospital list"
        />
        <div className="hospital-list">
          {recommendedHospitals.length === 0 ? (
            <div className="hospital-empty">
              추천된 병원이 없습니다.<br/>
              다른 증상으로 검색해보세요!
            </div>
          ) : (
            recommendedHospitals.map((h, idx) => {
              const isSelected =
                selectedHospital && selectedHospital.placeName === h.placeName;
              return (
                <div key={idx} className="hospital-item-card">
                  <div className="hospital-card-header">
                    <strong>{h.placeName || '이름 없음'}</strong>
                    <span>{h.distance ? `${h.distance}m` : '거리정보 없음'}</span>
                  </div>
                  <div className="hospital-card-body">
                    <div>{h.addressName || '주소 정보 없음'}</div>
                    <div>📞 {h.phone || '전화번호 준비 중'}</div>
                    <button
                      className="navigate-btn"
                      onClick={() => handleRoute({
                        ...h,
                        lat: Number(h.y),
                        lng: Number(h.x)
                      })}
                    >
                      🚗 길찾기
                    </button>
                    {isSelected && eta && (
                      <div style={{ marginTop: "6px", color: "#007bff" }}>
                        🚗 {eta.distance}km / 약 {eta.duration}분
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default MapPage;
