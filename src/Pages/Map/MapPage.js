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

  const [isSummaryOpen, setIsSummaryOpen] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(true);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [eta, setEta] = useState(null);
  const [error, setError] = useState("");
  const [hospitalList, setHospitalList] = useState(recommendedHospitals);

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

    hospitalList.forEach(h => {
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

      kakao.maps.event.addListener(marker, "click", () => {
        handleRoute({
          ...h,
          lat: Number(h.y),
          lng: Number(h.x)
        }, true); // isFromMarker = true
      });
    });

    const bounds = new kakao.maps.LatLngBounds();
    bounds.extend(center);
    hospitalList.forEach(h => {
      if (!h.y || !h.x) return;
      bounds.extend(new kakao.maps.LatLng(Number(h.y), Number(h.x)));
    });
    map.setBounds(bounds);

  }, [hospitalList, userLocation, symptom, department]);

  const handleRoute = async (hospital, isFromMarker = false) => {
    setSelectedHospital(hospital);

    if (isFromMarker) {
      setHospitalList(prev => {
        const filtered = prev.filter(hh => hh.placeName !== hospital.placeName);
        return [hospital, ...filtered];
      });
    }

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
          distance: (section.distance / 1000).toFixed(1),
          duration: Math.ceil(section.duration / 60),
        });

        setError("");
      }
    } catch (err) {
      console.error(err);
      setError("길찾기 요청 실패");
    }
  };

  // 평일/주말 묶기
  const formatOpeningHours = (openingHours) => {
    if (!openingHours) return ["영업시간 정보 없음"];

    const lines = openingHours.split(" / ");
    let weekdayTimes = [];
    let weekendTimes = [];
    let sundayTime = null;

    lines.forEach(line => {
      const [day, time] = line.split(": ");
      switch (day) {
        case "Monday":
        case "Tuesday":
        case "Wednesday":
        case "Thursday":
        case "Friday":
          weekdayTimes.push(time);
          break;
        case "Saturday":
          weekendTimes.push(`토요일: ${time}`);
          break;
        case "Sunday":
          sundayTime = time;
          break;
        default:
          break;
      }
    });

    const uniqueWeekday = [...new Set(weekdayTimes)];
    let weekdayStr;
    if (uniqueWeekday.length === 1) {
      weekdayStr = `평일: ${uniqueWeekday[0]}`;
    } else {
      weekdayStr = `평일: 요일별 영업시간 다름`;
    }

    const result = [weekdayStr];
    result.push(...weekendTimes);
    if (sundayTime) {
      result.push(`일요일: ${sundayTime}`);
    }
    return result;
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
      {/* 좌측 최상단 홈버튼 */}
      <div
        className="back-to-home"
        onClick={() => navigate('/')}
      >
        <img src="/images/back.png" alt="back" style={{ width: "20px", height: "20px" }} />
      </div>

      <div id="map" style={{ width: "100%", height: "100dvh" }}></div>

      {/* 요약 패널 */}
      <div className={`map-top-overlay ${isSummaryOpen ? '' : 'closed'}`}>
        <img
          src="/images/stic2.png"
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
          src="/images/stic.png"
          className="bottom-sheet-toggle-btn"
          onClick={() => setIsSheetOpen(prev => !prev)}
          alt="toggle hospital list"
        />
        <div className="hospital-list">
          {hospitalList.length === 0 ? (
            <div className="hospital-empty">
              추천된 병원이 없습니다.<br />
              다른 증상으로 검색해보세요!
            </div>
          ) : (
            hospitalList.map((h, idx) => {
              const isSelected = selectedHospital && selectedHospital.placeName === h.placeName;
              return (
                <div
                  key={idx}
                  className={`hospital-item-card ${isSelected ? "selected" : ""}`}
                >
                  <div className="hospital-card-header">
                    <strong>{h.placeName || "이름 없음"}</strong>
                    <span>{h.distance ? `${h.distance}m` : "거리정보 없음"}</span>
                  </div>
                  <div className="hospital-card-body">
                    <div>{h.addressName || "주소 정보 없음"}</div>
                    <div>📞 {h.phone || "전화번호 준비 중"}</div>
                    <div>
                      <ul style={{ margin: 0, paddingLeft: "1rem" }}>
                        {formatOpeningHours(h.openingHours).map((line, idx2) => (
                          <li key={idx2}>{line}</li>
                        ))}
                      </ul>
                    </div>
                    <button
                      className="navigate-btn"
                      onClick={() =>
                        handleRoute({
                          ...h,
                          lat: Number(h.y),
                          lng: Number(h.x),
                        })
                      }
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
