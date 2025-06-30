import React, { useEffect } from 'react';

const KakaoMap = ({ recommendedHospitals = [], keyword, mapRef, userLocation }) => {
  useEffect(() => {
    const loadMap = () => {
      const kakao = window.kakao;
      const container = document.getElementById('map');
      if (!container) return;

      //userLocation가 없으면 fallback (서울)
      let centerPos;
      if (
        userLocation &&
        typeof userLocation.lat === "number" &&
        typeof userLocation.lng === "number"
      ) {
        centerPos = new kakao.maps.LatLng(userLocation.lat, userLocation.lng);
      } else {
        console.warn("⛔ userLocation이 없으므로 서울 기본 좌표로 대체");
        centerPos = new kakao.maps.LatLng(37.5665, 126.9780); // 서울시청
      }

      const map = new kakao.maps.Map(container, {
        center: centerPos,
        level: 3,
      });
      mapRef.current = map;

      // 내 위치 마커 (있을 때만)
      if (
        userLocation &&
        typeof userLocation.lat === "number" &&
        typeof userLocation.lng === "number"
      ) {
        new kakao.maps.Marker({
          position: centerPos,
          map,
          title: '내 위치',
        });
      }

      // 추천 병원 마커
      if (recommendedHospitals.length > 0) {
        recommendedHospitals.forEach((h) => {
          if (typeof h.y === "number" && typeof h.x === "number") {
            new kakao.maps.Marker({
              map,
              position: new kakao.maps.LatLng(h.y, h.x),
              title: h.placeName,
            });
          }
        });
      }
    };

    if (!window.kakao || !window.kakao.maps) {
      const script = document.createElement('script');
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.REACT_APP_KAKAO_MAP_KEY}&autoload=false&libraries=services`;
      script.async = true;
      script.onload = () => window.kakao.maps.load(loadMap);
      document.head.appendChild(script);
    } else {
      window.kakao.maps.load(loadMap);
    }
  }, [recommendedHospitals, keyword, userLocation]);

  return (
    <div
      id="map"
      style={{ width: '100%', height: '400px', marginTop: '20px' }}
    />
  );
};

export default KakaoMap;
