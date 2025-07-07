// src/components/TransitRoute.js
import React, { useRef, useImperativeHandle, forwardRef } from 'react';

const TransitRoute = forwardRef((props, ref) => {
  const transitPolylinesRef = useRef([]);
  const transitMarkersRef = useRef([]);

  // 거리 계산 함수
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // 지구 반지름 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

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

  // 직선 연결 함수 (최후의 수단)
  const drawStraightLine = (map, startLat, startLng, endLat, endLng, polylinesArray, isTopLayer = false) => {
    const straightPath = [
      new window.kakao.maps.LatLng(startLat, startLng),
      new window.kakao.maps.LatLng(endLat, endLng)
    ];

    const straightPolyline = new window.kakao.maps.Polyline({
      map: map,
      path: straightPath,
      strokeWeight: isTopLayer ? 4 : 3,
      strokeColor: '#FF5722', // 주황색으로 직선임을 표시
      strokeOpacity: isTopLayer ? 0.8 : 0.6,
      strokeStyle: 'shortdashdot', // 점선-대시 스타일로 직선임을 명확히 표시
      zIndex: isTopLayer ? 15 : 8 // 가장 위층 또는 중상층
    });

    polylinesArray.push(straightPolyline);
    console.log('🚶‍♂️ 직선 연결 완료 (주황색 점선), 층:', isTopLayer ? '최상층' : '중상층');
  };

  // 카카오 보행자 길찾기 함수
  const drawWalkingRoute = async (map, startLocation, endLocation, polylinesArray, isTopLayer = false) => {
    try {
      console.log('🚶‍♂️ 카카오 보행자 길찾기 요청:', { startLocation, endLocation, isTopLayer });
      
      const startLat = startLocation.latLng?.latitude || startLocation.lat;
      const startLng = startLocation.latLng?.longitude || startLocation.lng;
      const endLat = endLocation.latLng?.latitude || endLocation.lat;
      const endLng = endLocation.latLng?.longitude || endLocation.lng;

      if (!startLat || !startLng || !endLat || !endLng) {
        console.log('🚶‍♂️ 좌표 정보 부족, 직선으로 연결');
        drawStraightLine(map, startLat, startLng, endLat, endLng, polylinesArray, isTopLayer);
        return;
      }

      // 카카오 보행자 길찾기 API 호출 (정확한 엔드포인트 사용)
      const response = await fetch(
        `https://apis-navi.kakaomobility.com/v1/directions?origin=${startLng},${startLat}&destination=${endLng},${endLat}&priority=RECOMMEND&car_fuel=GASOLINE&car_hipass=false&alternatives=false&road_details=false`,
        {
          method: 'GET',
          headers: {
            'Authorization': `KakaoAK ${process.env.REACT_APP_KAKAO_REST_API_KEY}`
          }
        }
      );

      console.log('🚶‍♂️ 카카오 API 응답 상태:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('🚶‍♂️ 카카오 보행자 길찾기 성공:', data);
        
        if (data.routes && data.routes[0] && data.routes[0].sections && data.routes[0].sections[0]) {
          const section = data.routes[0].sections[0];
          const roads = section.roads;

          const walkingPath = [];
          roads.forEach(road => {
            for (let i = 0; i < road.vertexes.length; i += 2) {
              const lng = road.vertexes[i];
              const lat = road.vertexes[i + 1];
              walkingPath.push(new window.kakao.maps.LatLng(lat, lng));
            }
          });

          if (walkingPath.length > 1) {
            // 보행자 경로 그리기 - 층별 스타일 적용
            const walkingPolyline = new window.kakao.maps.Polyline({
              map: map,
              path: walkingPath,
              strokeWeight: isTopLayer ? 4 : 3,
              strokeColor: isTopLayer ? '#757575' : '#999999',
              strokeOpacity: isTopLayer ? 0.9 : 0.7,
              strokeStyle: 'shortdot',
              zIndex: isTopLayer ? 10 : 5 // 위층 또는 중간층
            });

            polylinesArray.push(walkingPolyline);
            console.log('🚶‍♂️ 카카오 보행자 경로 그리기 완료, 경로 포인트:', walkingPath.length, '층:', isTopLayer ? '위층' : '중간층');
            return;
          }
        }
      } else {
        const errorText = await response.text();
        console.log('🚶‍♂️ 카카오 API 오류:', errorText);
      }
      
      console.log('🚶‍♂️ 카카오 보행자 길찾기 실패, 직선으로 연결');
      
      // 좌표가 정의되어 있는지 다시 확인 후 직선 그리기
      const finalStartLat = startLocation.latLng?.latitude || startLocation.lat;
      const finalStartLng = startLocation.latLng?.longitude || startLocation.lng;
      const finalEndLat = endLocation.latLng?.latitude || endLocation.lat;
      const finalEndLng = endLocation.latLng?.longitude || endLocation.lng;
      
      if (finalStartLat && finalStartLng && finalEndLat && finalEndLng) {
        drawStraightLine(map, finalStartLat, finalStartLng, finalEndLat, finalEndLng, polylinesArray, isTopLayer);
      } else {
        console.error('🚶‍♂️ 좌표 정보 부족으로 직선 연결 불가');
      }
      
    } catch (error) {
      console.error('🚶‍♂️ 카카오 보행자 길찾기 오류:', error);
      
      // 에러 발생 시에도 좌표 확인 후 직선 그리기
      const errorStartLat = startLocation.latLng?.latitude || startLocation.lat;
      const errorStartLng = startLocation.latLng?.longitude || startLocation.lng;
      const errorEndLat = endLocation.latLng?.latitude || endLocation.lat;
      const errorEndLng = endLocation.latLng?.longitude || endLocation.lng;
      
      if (errorStartLat && errorStartLng && errorEndLat && errorEndLng) {
        drawStraightLine(map, errorStartLat, errorStartLng, errorEndLat, errorEndLng, polylinesArray, isTopLayer);
      }
    }
  };

  // 단계별 경로 그리기 함수
  const drawDetailedTransitRoute = (map, transitSteps, allSteps) => {
    if (!map || !window.kakao) return;

    clearAllTransitRoutes(); // 기존 경로 제거

    const kakao = window.kakao;
    const newPolylines = [];
    const newMarkers = [];

    // 1단계: 먼저 모든 대중교통 경로를 그리기 (아래층)
    allSteps.forEach((step, stepIndex) => {
      if (step.polyline && step.polyline.encodedPolyline && step.transitDetails) {
        const decoded = decodePolyline(step.polyline.encodedPolyline);
        const kakaoPath = decoded.map(coord => 
          new kakao.maps.LatLng(coord.lat, coord.lng)
        );

        // 대중교통 구간 - 실선, 노선 색상
        const polyline = new kakao.maps.Polyline({
          map: map,
          path: kakaoPath,
          strokeWeight: 6, // 더 굵게
          strokeColor: step.transitDetails.transitLine?.color || '#4CAF50',
          strokeOpacity: 0.9,
          strokeStyle: 'solid',
          zIndex: 1 // 아래층
        });

        newPolylines.push(polyline);

        // 정류소 마커 추가
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

    // 2단계: 도보 경로를 위에 그리기 (위층)
    allSteps.forEach((step, stepIndex) => {
      if (step.travelMode === 'WALK') {
        // polyline이 없거나 짧은 경우 카카오 API 사용
        if (!step.polyline || !step.polyline.encodedPolyline) {
          if (step.startLocation && step.endLocation) {
            console.log('🚶‍♂️ polyline 없는 도보 구간 발견, 카카오 도보 경로 요청:', step);
            drawWalkingRoute(map, step.startLocation, step.endLocation, newPolylines, true); // 위층 표시
          }
          return;
        }

        const decoded = decodePolyline(step.polyline.encodedPolyline);
        
        if (decoded.length <= 2) {
          console.log('🚶‍♂️ 짧은 polyline 도보 구간 발견, 카카오 도보 경로로 보완:', step);
          if (step.startLocation && step.endLocation) {
            drawWalkingRoute(map, step.startLocation, step.endLocation, newPolylines, true); // 위층 표시
          }
          return;
        }

        // Google polyline이 충분한 경우 그대로 사용
        const kakaoPath = decoded.map(coord => 
          new kakao.maps.LatLng(coord.lat, coord.lng)
        );

        const walkingPolyline = new kakao.maps.Polyline({
          map: map,
          path: kakaoPath,
          strokeWeight: 4,
          strokeColor: '#757575',
          strokeOpacity: 0.8,
          strokeStyle: 'shortdot',
          zIndex: 10 // 위층
        });

        newPolylines.push(walkingPolyline);
      }
    });

    // 3단계: 첫 번째와 마지막 도보 구간 추가 검토
    if (allSteps.length > 0) {
      const firstStep = allSteps[0];
      const lastStep = allSteps[allSteps.length - 1];
      
      // 첫 번째 도보 구간 보완
      if (firstStep.travelMode === 'WALK' && firstStep.startLocation && firstStep.endLocation) {
        const decoded = firstStep.polyline ? decodePolyline(firstStep.polyline.encodedPolyline) : [];
        if (decoded.length <= 2) {
          console.log('🚶‍♂️ 첫 번째 도보 구간 보완');
          drawWalkingRoute(map, firstStep.startLocation, firstStep.endLocation, newPolylines, true);
        }
      }
      
      // 마지막 도보 구간 보완
      if (lastStep.travelMode === 'WALK' && lastStep.startLocation && lastStep.endLocation) {
        const decoded = lastStep.polyline ? decodePolyline(lastStep.polyline.encodedPolyline) : [];
        if (decoded.length <= 2) {
          console.log('🚶‍♂️ 마지막 도보 구간 보완');
          drawWalkingRoute(map, lastStep.startLocation, lastStep.endLocation, newPolylines, true);
        }
      }
    }

    transitPolylinesRef.current = newPolylines;
    transitMarkersRef.current = newMarkers;
  };

  useImperativeHandle(ref, () => ({
    searchAndDrawRoute: async (map, userLocation, hospital) => {
      console.log('🚌 대중교통 경로 검색 시작:', { userLocation, hospital });

      if (!process.env.REACT_APP_GOOGLE_ROUTES_API_KEY) {
        console.log('Google Routes API 키가 설정되지 않았습니다.');
        return { success: false, error: 'Google Routes API 키가 없습니다. 환경변수를 확인해주세요.' };
      }

      // 좌표 유효성 검사
      const lat1 = parseFloat(userLocation.lat);
      const lng1 = parseFloat(userLocation.lng);
      const lat2 = parseFloat(hospital.lat);
      const lng2 = parseFloat(hospital.lng);

      if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) {
        console.error('🚌 잘못된 좌표:', { userLocation, hospital });
        return { success: false, error: '좌표 정보가 올바르지 않습니다.' };
      }

      if (Math.abs(lat1) > 90 || Math.abs(lat2) > 90 || Math.abs(lng1) > 180 || Math.abs(lng2) > 180) {
        console.error('🚌 좌표 범위 오류:', { lat1, lng1, lat2, lng2 });
        return { success: false, error: '좌표가 유효한 범위를 벗어났습니다.' };
      }

      try {
        console.log('🚌 API 요청 준비:', {
          origin: { lat: userLocation.lat, lng: userLocation.lng },
          destination: { lat: hospital.lat, lng: hospital.lng },
          apiKey: process.env.REACT_APP_GOOGLE_ROUTES_API_KEY ? '설정됨' : '없음'
        });

        const requestBody = {
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
        };

        console.log('🚌 요청 본문:', JSON.stringify(requestBody, null, 2));

        const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': process.env.REACT_APP_GOOGLE_ROUTES_API_KEY,
            'X-Goog-FieldMask': 'routes.legs.steps.transitDetails,routes.legs.steps.polyline,routes.legs.steps.startLocation,routes.legs.steps.endLocation,routes.legs.steps.travelMode,routes.legs.steps.distanceMeters,routes.legs.steps.navigationInstruction,routes.legs.duration,routes.legs.distanceMeters'
          },
          body: JSON.stringify(requestBody)
        });

        console.log('🚌 API 응답 상태:', response.status);
        console.log('🚌 API 응답 헤더:', [...response.headers.entries()]);

        if (!response.ok) {
          const errorText = await response.text();
          console.log('🚌 API 오류 응답:', errorText);
          throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        console.log('🚌 API 응답 전체 데이터:', data);

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const leg = route.legs[0];
          const allSteps = leg.steps || [];
          
          console.log('🚌 경로 데이터:', { route, leg, allSteps });

          // 전체 duration 파싱 개선
          let totalDuration = 0;
          if (leg.duration) {
            console.log('🚌 전체 duration 원본:', leg.duration, typeof leg.duration);
            if (typeof leg.duration === 'string') {
              totalDuration = parseInt(leg.duration.replace('s', '')) || 0;
            } else if (typeof leg.duration === 'number') {
              totalDuration = leg.duration;
            } else if (leg.duration.seconds) {
              totalDuration = leg.duration.seconds;
            }
          }
          console.log('🚌 전체 소요시간:', totalDuration, '초 =', Math.ceil(totalDuration / 60), '분');

          // 모든 단계 정보 수집 (도보 + 대중교통)
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
          console.log('🚶‍♂️ 도보 단계들:', walkingSteps);
          
          const totalWalkingTime = walkingSteps.reduce((total, step) => {
            let duration = 0;
            
            console.log('🚶‍♂️ 현재 step 전체 데이터:', step);
            
            // Google Routes API에서 step.duration이 없는 경우가 많음
            // 거리 기반으로 추정하는 것이 더 안정적
            let distance = 0;
            
            // 거리 데이터 찾기
            if (step.distanceMeters) {
              distance = step.distanceMeters;
            } else if (step.distance && step.distance.value) {
              distance = step.distance.value;
            } else if (step.distance && typeof step.distance === 'number') {
              distance = step.distance;
            }
            
            if (distance > 0) {
              // 평균 보행속도 1.2m/s 기준
              duration = Math.ceil(distance / 1.2);
              console.log('🚶‍♂️ 거리 기반 시간 계산:', distance, 'm → ', duration, '초');
            } else {
              // 거리 정보도 없으면 기본값 할당
              duration = 60; // 1분 기본값
              console.log('🚶‍♂️ 기본값 할당:', duration, '초');
            }
            
            console.log('🚶‍♂️ 최종 도보 단계 시간:', duration, '초');
            return total + duration;
          }, 0);

          console.log('🚶‍♂️ 총 도보 시간:', totalWalkingTime, '초 =', Math.ceil(totalWalkingTime / 60), '분');

          // 최소 도보 시간 보장 (도보 구간이 있는 경우)
          let finalWalkingTime = Math.ceil(totalWalkingTime / 60);
          if (walkingSteps.length > 0 && finalWalkingTime === 0) {
            finalWalkingTime = Math.max(1, walkingSteps.length); // 도보 구간 수만큼 최소 시간 보장
            console.log('🚶‍♂️ 최소 도보 시간 보장:', finalWalkingTime, '분');
          }

          // 경로 그리기
          drawDetailedTransitRoute(map, transitSteps, allSteps, userLocation, hospital);

          const result = {
            success: true,
            allSteps: allSteps,
            distance: (leg.distanceMeters / 1000).toFixed(1),
            duration: Math.ceil(totalDuration / 60),
            transferCount: Math.max(0, transitSteps.length - 1),
            walkingTime: finalWalkingTime,
            summary: summary || '대중교통',
            steps: transitSteps,
            walkingSteps: walkingSteps.length
          };

          console.log('🚌 최종 결과:', result);
          return result;
        }

        return { success: false, error: '경로를 찾을 수 없습니다.' };
      } catch (error) {
        console.error('🚌 Google Routes API 실패:', error);
        
        // Google API 실패 시 카카오 대중교통 API로 fallback 시도
        try {
          console.log('🚌 카카오 대중교통 API로 fallback 시도...');
          
          const kakaoResponse = await fetch(
            `https://dapi.kakao.com/v2/local/search/keyword.json?query=대중교통&x=${lng1}&y=${lat1}&radius=1000`,
            {
              headers: {
                Authorization: `KakaoAK ${process.env.REACT_APP_KAKAO_REST_API_KEY}`
              }
            }
          );

          if (kakaoResponse.ok) {
            console.log('🚌 카카오 API 응답 성공 - 기본 대중교통 정보 제공');
            
            // 기본 대중교통 정보 제공 (거리 기반 추정)
            const distance = calculateDistance(lat1, lng1, lat2, lng2);
            const estimatedTime = Math.ceil(distance * 2.5); // 대중교통은 직선거리의 약 2.5배 시간
            const estimatedWalkingTime = Math.ceil(distance * 0.3); // 도보는 전체의 약 30%
            
            return {
              success: true,
              allSteps: [],
              distance: distance.toFixed(1),
              duration: estimatedTime,
              transferCount: distance > 3 ? 1 : 0, // 3km 이상이면 1회 환승 추정
              walkingTime: Math.max(1, estimatedWalkingTime),
              summary: '대중교통 (추정)',
              steps: [],
              walkingSteps: 1,
              isEstimated: true // 추정 데이터임을 표시
            };
          }
        } catch (fallbackError) {
          console.error('🚌 카카오 fallback도 실패:', fallbackError);
        }
        
        return { 
          success: false, 
          error: error.message.includes('400') ? 
            'Google Routes API 오류 - API 키나 요청 형식을 확인해주세요' : 
            `네트워크 오류: ${error.message}`
        };
      }
    },

    showRoute: (map) => {
      console.log('🚌 대중교통 경로 표시:', transitPolylinesRef.current.length, '개 경로,', transitMarkersRef.current.length, '개 마커');
      transitPolylinesRef.current.forEach(polyline => {
        polyline.setMap(map);
      });
      transitMarkersRef.current.forEach(marker => {
        marker.setMap(map);
      });
    },

    hideRoute: () => {
      console.log('🚌 대중교통 경로 숨김');
      transitPolylinesRef.current.forEach(polyline => {
        polyline.setMap(null);
      });
      transitMarkersRef.current.forEach(marker => {
        marker.setMap(null);
      });
    },

    clearRoute: () => {
      console.log('🚌 대중교통 경로 제거');
      clearAllTransitRoutes();
    }
  }));

  return null; // 이 컴포넌트는 UI를 렌더링하지 않음
});

TransitRoute.displayName = 'TransitRoute';

export default TransitRoute;