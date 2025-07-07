// src/components/CarRoute.js (디버깅 버전)
import React, { useRef, useImperativeHandle, forwardRef } from 'react';

const CarRoute = forwardRef((props, ref) => {
  const polylineRef = useRef(null);

  useImperativeHandle(ref, () => ({
    searchAndDrawRoute: async (map, userLocation, hospital) => {
      console.log('🚗 자동차 경로 검색 시작:', { userLocation, hospital });
      
      try {
        // 기존 경로 제거
        if (polylineRef.current) {
          polylineRef.current.setMap(null);
          polylineRef.current = null;
          console.log('🚗 기존 경로 제거 완료');
        }

        // 자동차 경로 검색
        const url = `https://apis-navi.kakaomobility.com/v1/directions?origin=${userLocation.lng},${userLocation.lat}&destination=${hospital.lng},${hospital.lat}`;
        console.log('🚗 API 요청 URL:', url);
        
        const response = await fetch(url, {
          headers: {
            Authorization: `KakaoAK ${process.env.REACT_APP_KAKAO_REST_API_KEY}`
          }
        });

        console.log('🚗 API 응답 상태:', response.status);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('🚗 API 응답 데이터:', data);

        if (data.routes && data.routes[0]) {
          const section = data.routes[0].sections[0];
          const roads = section.roads;
          console.log('🚗 경로 데이터:', { section, roads });

          // 경로 좌표 변환
          const linePath = [];
          roads.forEach(road => {
            for (let i = 0; i < road.vertexes.length; i += 2) {
              const lng = road.vertexes[i];
              const lat = road.vertexes[i + 1];
              linePath.push(new window.kakao.maps.LatLng(lat, lng));
            }
          });

          console.log('🚗 변환된 좌표 개수:', linePath.length);

          // 폴리라인 그리기
          polylineRef.current = new window.kakao.maps.Polyline({
            map: map,
            path: linePath,
            strokeWeight: 6,
            strokeColor: '#007bff',
            strokeOpacity: 0.8,
            strokeStyle: 'solid',
          });

          console.log('🚗 폴리라인 생성 완료:', polylineRef.current);

          return {
            success: true,
            distance: (section.distance / 1000).toFixed(1),
            duration: Math.ceil(section.duration / 60)
          };
        } else {
          console.log('🚗 경로 데이터 없음');
          return {
            success: false,
            error: '경로를 찾을 수 없습니다.'
          };
        }
      } catch (error) {
        console.error('🚗 자동차 경로 검색 실패:', error);
        return {
          success: false,
          error: error.message || '네트워크 오류가 발생했습니다.'
        };
      }
    },

    showRoute: (map) => {
      console.log('🚗 자동차 경로 표시:', polylineRef.current);
      if (polylineRef.current) {
        polylineRef.current.setMap(map);
      }
    },

    hideRoute: () => {
      console.log('🚗 자동차 경로 숨김:', polylineRef.current);
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
    },

    clearRoute: () => {
      console.log('🚗 자동차 경로 제거:', polylineRef.current);
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    }
  }));

  return null; // 이 컴포넌트는 UI를 렌더링하지 않음
});

CarRoute.displayName = 'CarRoute';

export default CarRoute;