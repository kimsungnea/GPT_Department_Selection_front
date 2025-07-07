// src/components/TransitRoute.js
import React, { useRef, useImperativeHandle, forwardRef } from 'react';

const TransitRoute = forwardRef((props, ref) => {
  const transitPolylinesRef = useRef([]);
  const transitMarkersRef = useRef([]);

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

  // 정류소 마커 생성 함수
  const createTransitMarker = (map, location, stopName, type, step, stepIndex) => {
    const kakao = window.kakao;
    
    const iconSrc = type === 'departure' ? 
      'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
          <circle cx="14" cy="14" r="12" fill="#4CAF50" stroke="white" stroke-width="3"/>
          <text x="14" y="18" text-anchor="middle" fill="white" font-size="10" font-weight="bold">승차</text>
        </svg>
      `) :
      'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
          <circle cx="14" cy="14" r="12" fill="#f44336" stroke="white" stroke-width="3"/>
          <text x="14" y="18" text-anchor="middle" fill="white" font-size="10" font-weight="bold">하차</text>
        </svg>
      `);

    const imageSize = new kakao.maps.Size(28, 28);
    const imageOption = { offset: new kakao.maps.Point(14, 14) };
    const markerImage = new kakao.maps.MarkerImage(iconSrc, imageSize, imageOption);

    const marker = new kakao.maps.Marker({
      map: null, // 처음엔 숨김
      position: new kakao.maps.LatLng(location.lat, location.lng),
      image: markerImage,
      title: stopName
    });

    const modeIcon = step.mode === 'SUBWAY' ? '🚇' : 
                     step.mode === 'BUS' ? '🚌' : 
                     step.mode === 'TRAIN' ? '🚂' : '🚊';

    const infoContent = `
      <div style="padding: 12px; min-width: 220px; font-size: 13px; font-family: 'Malgun Gothic', sans-serif;">
        <div style="font-weight: bold; margin-bottom: 8px; color: #333; display: flex; align-items: center;">
          ${modeIcon} 
          <span style="margin-left: 6px; color: ${step.lineColor};">${step.lineName || step.lineShort}</span>
        </div>
        <div style="margin-bottom: 6px; padding: 4px 8px; background-color: ${type === 'departure' ? '#e8f5e8' : '#ffebee'}; border-radius: 4px;">
          <strong>${type === 'departure' ? '🟢 승차 지점' : '🔴 하차 지점'}:</strong> ${stopName}
        </div>
        ${step.departureTime && type === 'departure' ? 
          `<div style="color: #666; margin-bottom: 4px;">⏰ 출발: ${step.departureTime}</div>` : ''}
        ${step.arrivalTime && type === 'arrival' ? 
          `<div style="color: #666; margin-bottom: 4px;">⏰ 도착: ${step.arrivalTime}</div>` : ''}
        ${step.stopCount ? 
          `<div style="color: #666; font-size: 12px;">🚏 총 ${step.stopCount}개 정거장 이동</div>` : ''}
        ${type === 'departure' ? 
          `<div style="color: #4CAF50; font-size: 12px; margin-top: 4px;">💡 여기서 탑승하세요!</div>` : 
          `<div style="color: #f44336; font-size: 12px; margin-top: 4px;">💡 여기서 하차하세요!</div>`}
      </div>
    `;

    const infoWindow = new kakao.maps.InfoWindow({
      content: infoContent,
      removable: true
    });

    kakao.maps.event.addListener(marker, 'click', () => {
      // 다른 정보창 닫기
      transitMarkersRef.current.forEach(m => {
        if (m.infoWindow && m !== marker) m.infoWindow.close();
      });
      // 현재 정보창 열기
      infoWindow.open(marker.getMap() || map, marker);
    });

    marker.infoWindow = infoWindow;
    return marker;
  };

  // 모든 대중교통 경로 지우기
  const clearAllTransitRoutes = () => {
    // 기존 정류소 마커들 제거
    transitMarkersRef.current.forEach(marker => {
      if (marker.infoWindow) marker.infoWindow.close();
      marker.setMap(null);
    });
    transitMarkersRef.current = [];

    // 기존 대중교통 경로들 제거
    transitPolylinesRef.current.forEach(polyline => {
      polyline.setMap(null);
    });
    transitPolylinesRef.current = [];
  };

  // 단계별 경로 그리기 함수
  const drawDetailedTransitRoute = (map, transitSteps, allSteps) => {
    if (!map || !window.kakao) return;

    clearAllTransitRoutes(); // 기존 경로 제거

    const kakao = window.kakao;
    const newPolylines = [];
    const newMarkers = [];

    allSteps.forEach((step, stepIndex) => {
      if (!step.polyline || !step.polyline.encodedPolyline) return;

      // 각 단계의 좌표 디코딩
      const decoded = decodePolyline(step.polyline.encodedPolyline);
      const kakaoPath = decoded.map(coord => 
        new kakao.maps.LatLng(coord.lat, coord.lng)
      );

      let strokeColor, strokeStyle, strokeWeight;

      // 단계별 경로 스타일 설정
      if (step.travelMode === 'WALK') {
        // 도보 구간 - 점선, 회색
        strokeColor = '#757575';
        strokeStyle = 'shortdot';
        strokeWeight = 3;
      } else if (step.transitDetails) {
        // 대중교통 구간 - 실선, 노선 색상
        strokeColor = step.transitDetails.transitLine?.color || '#4CAF50';
        strokeStyle = 'solid';
        strokeWeight = 5;
      } else {
        // 기타 구간 - 기본 스타일
        strokeColor = '#00C851';
        strokeStyle = 'solid';
        strokeWeight = 4;
      }

      // 경로 그리기
      const polyline = new kakao.maps.Polyline({
        map: map,
        path: kakaoPath,
        strokeWeight: strokeWeight,
        strokeColor: strokeColor,
        strokeOpacity: 0.8,
        strokeStyle: strokeStyle,
      });

      newPolylines.push(polyline);

      // 대중교통 구간의 정류소 마커 추가
      if (step.transitDetails) {
        const transit = step.transitDetails;
        
        // 출발 정류소 마커
        if (transit.stopDetails?.departureStop?.location?.latLng) {
          const departureMarker = createTransitMarker(
            map,
            {
              lat: transit.stopDetails.departureStop.location.latLng.latitude,
              lng: transit.stopDetails.departureStop.location.latLng.longitude
            },
            transit.stopDetails.departureStop.name,
            'departure',
            {
              mode: transit.transitLine?.vehicle?.type || 'TRANSIT',
              lineName: transit.transitLine?.name || '',
              lineShort: transit.transitLine?.nameShort || '',
              lineColor: transit.transitLine?.color || '#4CAF50',
              departureTime: transit.localizedValues?.departureTime?.time?.text || '',
              stopCount: transit.stopCount || 0
            },
            stepIndex
          );
          newMarkers.push(departureMarker);
        }

        // 도착 정류소 마커
        if (transit.stopDetails?.arrivalStop?.location?.latLng) {
          const arrivalMarker = createTransitMarker(
            map,
            {
              lat: transit.stopDetails.arrivalStop.location.latLng.latitude,
              lng: transit.stopDetails.arrivalStop.location.latLng.longitude
            },
            transit.stopDetails.arrivalStop.name,
            'arrival',
            {
              mode: transit.transitLine?.vehicle?.type || 'TRANSIT',
              lineName: transit.transitLine?.name || '',
              lineShort: transit.transitLine?.nameShort || '',
              lineColor: transit.transitLine?.color || '#4CAF50',
              arrivalTime: transit.localizedValues?.arrivalTime?.time?.text || '',
              stopCount: transit.stopCount || 0
            },
            stepIndex
          );
          newMarkers.push(arrivalMarker);
        }
      }
    });

    transitPolylinesRef.current = newPolylines;
    transitMarkersRef.current = newMarkers;
  };

  useImperativeHandle(ref, () => ({
    searchAndDrawRoute: async (map, userLocation, hospital) => {
      if (!process.env.REACT_APP_GOOGLE_ROUTES_API_KEY) {
        console.log('Google Routes API 키가 설정되지 않았습니다.');
        return { success: false, error: 'API 키 없음' };
      }

      try {
        const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': process.env.REACT_APP_GOOGLE_ROUTES_API_KEY,
            'X-Goog-FieldMask': 'routes.legs.steps.transitDetails,routes.legs.steps.polyline,routes.legs.steps.startLocation,routes.legs.steps.endLocation,routes.legs.steps.travelMode,routes.legs.duration,routes.legs.distanceMeters'
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

          // 모든 단계 정보 수집 (도보 + 대중교통)
          const allSteps = leg.steps || [];
          const transitSteps = [];

          allSteps.forEach(step => {
            if (step.transitDetails) {
              const transit = step.transitDetails;
              const stepData = {
                mode: transit.transitLine?.vehicle?.type || 'TRANSIT',
                lineName: transit.transitLine?.name || '',
                lineShort: transit.transitLine?.nameShort || '',
                lineColor: transit.transitLine?.color || '#4CAF50',
                departureStop: transit.stopDetails?.departureStop?.name || '',
                arrivalStop: transit.stopDetails?.arrivalStop?.name || '',
                departureTime: transit.localizedValues?.departureTime?.time?.text || '',
                arrivalTime: transit.localizedValues?.arrivalTime?.time?.text || '',
                stopCount: transit.stopCount || 0
              };
              transitSteps.push(stepData);
            }
          });

          const summary = transitSteps.map(step => {
            const mode = step.mode === 'SUBWAY' ? '지하철' : 
                         step.mode === 'BUS' ? '버스' : 
                         step.mode === 'TRAIN' ? '기차' : '대중교통';
            return `${mode} ${step.lineShort || step.lineName}`;
          }).join(' → ');

          // 도보 시간 계산
          const walkingSteps = allSteps.filter(step => step.travelMode === 'WALK');
          const totalWalkingTime = walkingSteps.reduce((total, step) => {
            const duration = parseInt(step.duration?.replace('s', '') || 0);
            return total + duration;
          }, 0);

          // 경로 그리기
          drawDetailedTransitRoute(map, transitSteps, allSteps);

          return {
            success: true,
            allSteps: allSteps,
            distance: (leg.distanceMeters / 1000).toFixed(1),
            duration: Math.ceil(leg.duration.replace('s', '') / 60),
            transferCount: Math.max(0, transitSteps.length - 1),
            walkingTime: Math.ceil(totalWalkingTime / 60),
            summary: summary || '대중교통',
            steps: transitSteps,
            walkingSteps: walkingSteps.length
          };
        }

        return { success: false, error: '경로를 찾을 수 없습니다.' };
      } catch (error) {
        console.error('대중교통 경로 검색 실패:', error);
        return { 
          success: false, 
          error: error.message.includes('400') ? 'API 요청 오류 - API 키를 확인해주세요' : '네트워크 오류'
        };
      }
    },

    showRoute: (map) => {
      transitPolylinesRef.current.forEach(polyline => {
        polyline.setMap(map);
      });
      transitMarkersRef.current.forEach(marker => {
        marker.setMap(map);
      });
    },

    hideRoute: () => {
      transitPolylinesRef.current.forEach(polyline => {
        polyline.setMap(null);
      });
      transitMarkersRef.current.forEach(marker => {
        marker.setMap(null);
      });
    },

    clearRoute: () => {
      clearAllTransitRoutes();
    }
  }));

  return null; // 이 컴포넌트는 UI를 렌더링하지 않음
});

TransitRoute.displayName = 'TransitRoute';

export default TransitRoute;