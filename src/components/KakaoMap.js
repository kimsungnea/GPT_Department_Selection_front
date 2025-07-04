import React, { useEffect } from 'react';

const KakaoMap = ({ recommendedHospitals, userLocation, mapRef }) => {
  useEffect(() => {
    if (!window.kakao || !window.kakao.maps) {
      console.error('카카오 지도 SDK를 불러올 수 없습니다.');
      return;
    }

    const kakao = window.kakao;

    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      console.error('map 컨테이너가 없습니다.');
      return;
    }

    const center = new kakao.maps.LatLng(userLocation.lat, userLocation.lng);

    const mapOption = {
      center,
      level: 5,
    };

    const map = new kakao.maps.Map(mapContainer, mapOption);
    mapRef.current = map;

    // ✅ 내 위치 마커 이미지
    const imageSrc = "/images/mark.PNG";
    const imageSize = new kakao.maps.Size(40, 40);
    const imageOption = { offset: new kakao.maps.Point(20, 40) };

    const userMarkerImage = new kakao.maps.MarkerImage(imageSrc, imageSize, imageOption);

    const userMarker = new kakao.maps.Marker({
      map,
      position: center,
      title: '내 위치',
      image: userMarkerImage
    });

    const userInfoWindow = new kakao.maps.InfoWindow({
      content: `
        <div style="padding:6px;font-size:12px;">
          📍 내 위치
        </div>
      `,
    });
    userInfoWindow.open(map, userMarker);

    // 병원 마커
    recommendedHospitals.forEach((hospital) => {
      if (!hospital.x || !hospital.y) return;

      const pos = new kakao.maps.LatLng(Number(hospital.y), Number(hospital.x));
      const marker = new kakao.maps.Marker({
        map,
        position: pos,
        title: hospital.placeName,
      });

      // ✅ 병원명만 보여주기
      const infoWindow = new kakao.maps.InfoWindow({
        content: `
          <div style="padding:6px;font-size:12px;">
            🏥 ${hospital.placeName}
          </div>
        `,
      });
      infoWindow.open(map, marker);
    });

    // bounds
    const bounds = new kakao.maps.LatLngBounds();
    bounds.extend(center);
    recommendedHospitals.forEach((hospital) => {
      if (hospital.y && hospital.x) {
        bounds.extend(new kakao.maps.LatLng(Number(hospital.y), Number(hospital.x)));
      }
    });
    map.setBounds(bounds);

  }, [recommendedHospitals, userLocation, mapRef]);

  return (
    <div
      id="map"
      style={{
        width: '100%',
        height: '100dvh',
      }}
    />
  );
};

export default KakaoMap;
