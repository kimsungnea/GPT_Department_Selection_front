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
  const transitPolylineRef = useRef(null);
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

  // Google Polyline 디코딩 함수
  const decodePolyline = (encoded) => {
    const coordinates = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let b;
      let shift = 0;
      let result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const deltaLat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lat += deltaLat;

      shift = 0;
      result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const deltaLng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lng += deltaLng;

      coordinates.push({
        lat: lat / 1e5,
        lng: lng / 1e5
      });
    }

    return coordinates;
  };

  // Google 대중교통 경로 검색 함수 (에러 처리 강화)
  const getTransitRoute = async (hospital) => {
    // Google Routes API 키가 없으면 스킵
    if (!process.env.REACT_APP_GOOGLE_ROUTES_API_KEY) {
      console.log('Google Routes API 키가 설정되지 않았습니다.');
      return { success: false, error: 'API 키 없음' };
    }

    try {
      setIsLoadingTransit(true);
      
      const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.REACT_APP_GOOGLE_ROUTES_API_KEY,
          'X-Goog-FieldMask': 'routes.legs.steps.transitDetails,routes.legs.steps.polyline,routes.legs.duration,routes.legs.distanceMeters'
        },
        body: JSON.stringify({
          origin: {
            location: {
              latLng: {
                latitude: parseFloat(userLocation.lat),
                longitude: parseFloat(userLocation.lng)
              }
            }
          },
          destination: {
            location: {
              latLng: {
                latitude: parseFloat(hospital.lat),
                longitude: parseFloat(hospital.lng)
              }
            }
          },
          travelMode: "TRANSIT",
          transitPreferences: {
            routingPreference: "LESS_WALKING",
            allowedTravelModes: ["BUS", "SUBWAY", "TRAIN", "LIGHT_RAIL"]
          },
          departureTime: new Date().toISOString(),
          languageCode: "ko",
          units: "METRIC"
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];

        // 경로 좌표 추출
        const pathCoordinates = [];
        const transitSteps = [];

        leg.steps.forEach(step => {
          if (step.polyline && step.polyline.encodedPolyline) {
            const decoded = decodePolyline(step.polyline.encodedPolyline);
            pathCoordinates.push(...decoded);
          }

          if (step.transitDetails) {
            const transit = step.transitDetails;
            transitSteps.push({
              mode: transit.transitLine?.vehicle?.type || 'TRANSIT',
              lineName: transit.transitLine?.name || '',
              lineShort: transit.transitLine?.nameShort || '',
              lineColor: transit.transitLine?.color || '#4CAF50',
              departureStop: transit.stopDetails?.departureStop?.name || '',
              arrivalStop: transit.stopDetails?.arrivalStop?.name || '',
              stopCount: transit.stopCount || 0
            });
          }
        });

        // 카카오맵 좌표로 변환
        const kakaoPath = pathCoordinates.map(coord => 
          new window.kakao.maps.LatLng(coord.lat, coord.lng)
        );

        const summary = transitSteps.map(step => {
          const mode = step.mode === 'SUBWAY' ? '지하철' : 
                       step.mode === 'BUS' ? '버스' : 
                       step.mode === 'TRAIN' ? '기차' : '대중교통';
          return `${mode} ${step.lineShort || step.lineName}`;
        }).join(' → ');

        return {
          success: true,
          path: kakaoPath,
          distance: (leg.distanceMeters / 1000).toFixed(1),
          duration: Math.ceil(leg.duration.replace('s', '') / 60),
          transferCount: Math.max(0, transitSteps.length - 1),
          summary: summary || '대중교통',
          steps: transitSteps
        };
      }

      return { success: false, error: '경로를 찾을 수 없습니다.' };
    } catch (error) {
      console.error('대중교통 경로 검색 실패:', error);
      return { 
        success: false, 
        error: error.message.includes('400') ? 'API 요청 오류 - API 키를 확인해주세요' : '네트워크 오류'
      };
    } finally {
      setIsLoadingTransit(false);
    }
  };

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
    setTransitInfo(null);

    if (isFromMarker) {
      setHospitalList(prev => {
        const filtered = prev.filter(hh => hh.placeName !== hospital.placeName);
        return [hospital, ...filtered];
      });
    }

    if (!window.kakao || !mapRef.current) return;
    const kakao = window.kakao;

    try {
      // 자동차 경로 검색 (기존 코드)
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

        // 대중교통 경로도 함께 검색 (백그라운드)
        getTransitRoute(hospital).then(transitResult => {
          if (transitResult.success) {
            setTransitInfo(transitResult);
          } else {
            console.log('대중교통 경로 검색 실패:', transitResult.error);
          }
        });

        setError("");
      }
    } catch (err) {
      console.error(err);
      setError("길찾기 요청 실패");
    }
  };

  // 경로 타입 변경 함수
  const switchRoute = (routeType) => {
    if (routeType === 'car' && polylineRef.current) {
      // 대중교통 경로 숨기기
      if (transitPolylineRef.current) {
        transitPolylineRef.current.setMap(null);
      }
      // 자동차 경로 표시
      polylineRef.current.setMap(mapRef.current);
      setActiveRoute('car');
    } else if (routeType === 'transit' && transitInfo && transitInfo.path) {
      // 자동차 경로 숨기기
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
      // 대중교통 경로 표시
      if (transitPolylineRef.current) {
        transitPolylineRef.current.setMap(null);
      }
      
      const kakao = window.kakao;
      transitPolylineRef.current = new kakao.maps.Polyline({
        map: mapRef.current,
        path: transitInfo.path,
        strokeWeight: 4,
        strokeColor: '#00C851',
        strokeOpacity: 0.8,
        strokeStyle: 'shortdash',
      });
      setActiveRoute('transit');
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
                    
                    {/* 길찾기 버튼 - 기존과 동일 */}
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

                    {/* 경로 정보 표시 - 선택된 병원일 때만 */}
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
                              🔄 환승 {transitInfo.transferCount}회
                            </div>
                            {transitInfo.summary && (
                              <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                                📍 {transitInfo.summary}
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
    </div>
  );
};

export default MapPage;