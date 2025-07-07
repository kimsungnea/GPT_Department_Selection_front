import React, { useRef, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CarRoute from '../../components/CarRoute';
import TransitRoute from '../../components/TransitRoute';
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
  const carRouteRef = useRef(null);
  const transitRouteRef = useRef(null);
  const userMarkerRef = useRef(null);

  const [isSummaryOpen, setIsSummaryOpen] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(true);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [eta, setEta] = useState(null);
  const [transitInfo, setTransitInfo] = useState(null);
  const [activeRoute, setActiveRoute] = useState('car');
  const [isLoadingTransit, setIsLoadingTransit] = useState(false);
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
        }, true);
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
    setError("");
    setEta(null);
    setTransitInfo(null);
    setIsLoadingTransit(true);
    setActiveRoute('car'); // 기본값을 자동차로 설정

    if (isFromMarker) {
      setHospitalList(prev => {
        const filtered = prev.filter(hh => hh.placeName !== hospital.placeName);
        return [hospital, ...filtered];
      });
    }

    if (!mapRef.current) return;

    try {
      // 먼저 기존 경로들 모두 제거
      carRouteRef.current?.clearRoute();
      transitRouteRef.current?.clearRoute();

      // 자동차 경로 검색 및 그리기
      const carResult = await carRouteRef.current.searchAndDrawRoute(
        mapRef.current, 
        userLocation, 
        hospital
      );

      if (carResult.success) {
        setEta({
          distance: carResult.distance,
          duration: carResult.duration
        });
        console.log('자동차 경로 성공:', carResult);
      } else {
        console.error('자동차 경로 실패:', carResult.error);
      }

      // 대중교통 경로 검색 (백그라운드)
      setTimeout(async () => {
        const transitResult = await transitRouteRef.current.searchAndDrawRoute(
          mapRef.current, 
          userLocation, 
          hospital
        );

        if (transitResult.success) {
          setTransitInfo(transitResult);
          console.log('대중교통 경로 성공:', transitResult);
          // 대중교통 경로는 처음에는 숨김
          transitRouteRef.current.hideRoute();
        } else {
          console.error('대중교통 경로 실패:', transitResult.error);
        }
        setIsLoadingTransit(false);
      }, 100);

      setError("");
    } catch (err) {
      console.error('길찾기 실패:', err);
      setError("길찾기 요청 실패");
      setIsLoadingTransit(false);
    }
  };

  // 경로 타입 변경 함수
  const switchRoute = (routeType) => {
    console.log('경로 전환:', routeType, { eta, transitInfo });
    
    if (routeType === 'car' && eta) {
      // 대중교통 경로 숨기기
      if (transitRouteRef.current) {
        transitRouteRef.current.hideRoute();
      }
      // 자동차 경로 표시
      if (carRouteRef.current) {
        carRouteRef.current.showRoute(mapRef.current);
      }
      setActiveRoute('car');
    } else if (routeType === 'transit' && transitInfo) {
      // 자동차 경로 숨기기
      if (carRouteRef.current) {
        carRouteRef.current.hideRoute();
      }
      // 대중교통 경로 표시
      if (transitRouteRef.current) {
        transitRouteRef.current.showRoute(mapRef.current);
      }
      setActiveRoute('transit');
    }
  };

  // 평일/주말 묶기 (기존 함수)
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
                    
                    {/* 길찾기 버튼 */}
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
                      🗺️ 길찾기
                    </button>

                    {/* 경로 정보 표시 */}
                    {isSelected && (eta || transitInfo || isLoadingTransit) && (
                      <div style={{ marginTop: '12px' }}>
                        {/* 경로 타입 선택 버튼 */}
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                          <button
                            onClick={() => switchRoute('car')}
                            style={{
                              flex: 1,
                              padding: '6px 10px',
                              border: activeRoute === 'car' ? '2px solid #007bff' : '1px solid #ddd',
                              background: activeRoute === 'car' ? '#007bff' : 'white',
                              color: activeRoute === 'car' ? 'white' : '#333',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              cursor: 'pointer'
                            }}
                            disabled={!eta}
                          >
                            🚗 자동차
                          </button>
                          <button
                            onClick={() => switchRoute('transit')}
                            style={{
                              flex: 1,
                              padding: '6px 10px',
                              border: activeRoute === 'transit' ? '2px solid #00C851' : '1px solid #ddd',
                              background: activeRoute === 'transit' ? '#00C851' : 'white',
                              color: activeRoute === 'transit' ? 'white' : '#333',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              cursor: 'pointer'
                            }}
                            disabled={!transitInfo && !isLoadingTransit}
                          >
                            🚌 대중교통 {isLoadingTransit && '⏳'}
                          </button>
                        </div>

                        {/* 대중교통 안내 메시지 */}
                        {activeRoute === 'transit' && transitInfo && (
                          <div style={{ 
                            background: '#e3f2fd',
                            padding: '8px',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            color: '#1976d2',
                            marginBottom: '8px',
                            textAlign: 'center'
                          }}>
                            🚶‍♂️ <span style={{color: '#757575'}}>회색 점선</span>: 도보구간 | 🚌 <span style={{color: '#4CAF50'}}>색깔 실선</span>: 대중교통<br/>
                            🟢승차 🔴하차 마커를 클릭해보세요!<br/>
                          </div>
                        )}

                        {/* 경로 상세 정보 */}
                        {activeRoute === 'car' && eta && (
                          <div style={{ 
                            marginTop: "6px", 
                            color: "#007bff",
                            background: '#e3f2fd',
                            padding: '8px',
                            borderRadius: '6px'
                          }}>
                            🚗 {eta.distance}km / 약 {eta.duration}분
                          </div>
                        )}

                        {activeRoute === 'transit' && isLoadingTransit && (
                          <div style={{ 
                            marginTop: "6px", 
                            color: "#666",
                            background: '#f5f5f5',
                            padding: '8px',
                            borderRadius: '6px',
                            textAlign: 'center'
                          }}>
                            🚌 대중교통 경로 검색 중...
                          </div>
                        )}

                        {activeRoute === 'transit' && transitInfo && !isLoadingTransit && (
                          <div style={{ 
                            marginTop: "6px", 
                            color: "#00C851",
                            background: '#e8f5e8',
                            padding: '8px',
                            borderRadius: '6px'
                          }}>
                            <div>🚌 {transitInfo.distance}km / 약 {transitInfo.duration}분</div>
                            <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                              🔄 환승 {transitInfo.transferCount}회 | 🚶‍♂️ 도보 {transitInfo.walkingTime}분
                            </div>
                            <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                              📊 도보구간 {transitInfo.walkingSteps}개
                            </div>
                            {transitInfo.summary && (
                              <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                                📍 {transitInfo.summary}
                              </div>
                            )}
                            {transitInfo.isEstimated && (
                              <div style={{ 
                                fontSize: '0.75rem', 
                                marginTop: '6px', 
                                color: '#f57c00',
                                background: '#fff3e0',
                                padding: '4px',
                                borderRadius: '4px',
                                border: '1px solid #ffb74d'
                              }}>
                                ⚠️ 추정 데이터입니다. 실제 시간과 다를 수 있습니다.
                              </div>
                            )}
                          </div>
                        )}

                        {activeRoute === 'transit' && !transitInfo && !isLoadingTransit && (
                          <div style={{ 
                            marginTop: "6px", 
                            color: "#f44336",
                            background: '#ffebee',
                            padding: '8px',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            textAlign: 'center'
                          }}>
                            🚌 대중교통 경로를 찾을 수 없습니다
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 경로 컴포넌트들 */}
      <CarRoute ref={carRouteRef} />
      <TransitRoute ref={transitRouteRef} />

      {/* 에러 표시 */}
      {error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#f44336',
          color: 'white',
          padding: '1rem',
          borderRadius: '8px',
          zIndex: 1000
        }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default MapPage;