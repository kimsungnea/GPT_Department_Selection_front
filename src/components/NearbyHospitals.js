// NearbyHospitals.js - 네비게이션 버튼 문제 수정 (버스 기능 제외)
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './NearbyHospitals.css';

const NearbyHospitals = ({ recommendedHospitals = [], userLocation, mapRef }) => {
  const navigate = useNavigate();
  const [radius, setRadius] = useState(1000);
  const [nearby, setNearby] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!mapRef.current || !window.kakao || !userLocation) return;

    setLoading(true);
    setError('');

    const ps = new window.kakao.maps.services.Places();
    const center = new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng);

    ps.keywordSearch('병원', (data, status) => {
      setLoading(false);
      if (status === window.kakao.maps.services.Status.OK) {
        setNearby(data.slice(0, 10)); // 최대 10개만 표시
      } else {
        setError('주변 병원을 찾을 수 없습니다.');
        setNearby([]);
      }
    }, { location: center, radius });

  }, [radius, mapRef, userLocation]);

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // 지구 반지름 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
  };

  // 🔧 수정된 네비게이션 함수 - 데이터 정규화 및 검증 강화
  const handleNavigation = (hospital) => {
    console.log('🧭 네비게이션 시작:', hospital); // 디버깅용

    // 병원 데이터 정규화 (추천 병원과 일반 병원 구조가 다를 수 있음)
    const normalizedHospital = {
      name: hospital.place_name || hospital.placeName || hospital.name || '병원명 없음',
      lat: parseFloat(hospital.y || hospital.lat || 0),
      lng: parseFloat(hospital.x || hospital.lng || 0),
      address: hospital.road_address_name || hospital.address_name || hospital.addressName || hospital.address || '주소 없음',
      phone: hospital.phone || ''
    };

    // 데이터 유효성 검사
    if (!normalizedHospital.lat || !normalizedHospital.lng || normalizedHospital.lat === 0 || normalizedHospital.lng === 0) {
      alert('병원 위치 정보가 없어 길찾기를 할 수 없습니다.');
      console.error('❌ 병원 좌표 오류:', normalizedHospital);
      return;
    }

    if (!userLocation || !userLocation.lat || !userLocation.lng) {
      alert('현재 위치 정보가 없어 길찾기를 할 수 없습니다.');
      console.error('❌ 사용자 위치 오류:', userLocation);
      return;
    }

    console.log('✅ 정규화된 병원 데이터:', normalizedHospital);
    console.log('✅ 사용자 위치:', userLocation);

    try {
      // NavigationPage로 이동
      navigate('/navigation', {
        state: {
          hospital: normalizedHospital,
          userLocation: userLocation,
        },
      });
      console.log('✅ 네비게이션 페이지로 이동 성공');
    } catch (error) {
      console.error('❌ 네비게이션 실패:', error);
      alert('길찾기 페이지로 이동 중 오류가 발생했습니다.');
    }
  };

  // 수정된 전화 함수
  const handleCall = (phone) => {
    console.log('📞 전화 시도:', phone);
    
    if (!phone || phone.trim() === '') {
      alert('전화번호가 등록되지 않은 병원입니다.');
      return;
    }

    // 전화번호 정리 (공백, 하이픈 제거 후 다시 추가)
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 9) {
      alert('올바르지 않은 전화번호입니다.');
      return;
    }

    try {
      window.location.href = `tel:${cleanPhone}`;
    } catch (error) {
      console.error('전화 연결 실패:', error);
      alert('전화 연결에 실패했습니다.');
    }
  };

  return (
    <div className="nearby-hospitals-container">
      {/* 추천 병원 섹션 */}
      {recommendedHospitals.length > 0 && (
        <section className="recommended-section">
          <div className="section-header">
            <h2>🎯 추천 병원</h2>
            <span className="badge">{recommendedHospitals.length}개</span>
          </div>
          <div className="hospitals-grid">
            {recommendedHospitals.map((hospital, idx) => (
              <div key={`recommended-${idx}`} className="hospital-card recommended">
                <div className="hospital-info">
                  <h3 className="hospital-name">
                    <span className="star-badge">⭐</span>
                    {hospital.placeName || hospital.name || '병원명 없음'}
                  </h3>
                  <p className="hospital-address">
                    📍 {hospital.addressName || hospital.address || '주소 없음'}
                  </p>
                  {hospital.phone && (
                    <p className="hospital-phone">
                      📞 {hospital.phone}
                    </p>
                  )}
                  {userLocation && hospital.lat && hospital.lng && (
                    <p className="hospital-distance">
                      🚶‍♂️ 약 {calculateDistance(
                        userLocation.lat, userLocation.lng,
                        hospital.lat, hospital.lng
                      )}km
                    </p>
                  )}
                </div>
                <div className="hospital-actions">
                  <button 
                    className="action-btn navigation-btn"
                    onClick={() => handleNavigation(hospital)}
                  >
                    🧭 길찾기
                  </button>
                  {hospital.phone && (
                    <button 
                      className="action-btn call-btn"
                      onClick={() => handleCall(hospital.phone)}
                    >
                      📞 전화
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 주변 병원 섹션 */}
      <section className="nearby-section">
        <div className="section-header">
          <h2>🏥 주변 병원</h2>
          <div className="radius-selector">
            <label htmlFor="radius">반경:</label>
            <select 
              id="radius"
              value={radius} 
              onChange={(e) => setRadius(Number(e.target.value))}
              className="radius-select"
            >
              <option value={1000}>1km</option>
              <option value={2000}>2km</option>
              <option value={5000}>5km</option>
              <option value={10000}>10km</option>
            </select>
          </div>
        </div>

        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>주변 병원을 검색하는 중...</p>
          </div>
        )}

        {error && (
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <p>{error}</p>
            <button 
              className="retry-btn"
              onClick={() => {
                console.log('🔄 재검색 시도');
                setRadius(radius); // 재검색 트리거
              }}
            >
              다시 시도
            </button>
          </div>
        )}

        {!loading && !error && nearby.length === 0 && (
          <div className="no-results">
            <div className="no-results-icon">🔍</div>
            <h3>주변에 병원이 없습니다</h3>
            <p>검색 반경을 늘려보세요</p>
          </div>
        )}

        {!loading && nearby.length > 0 && (
          <div className="hospitals-grid">
            {nearby.map((hospital, idx) => (
              <div key={`nearby-${idx}-${hospital.id}`} className="hospital-card">
                <div className="hospital-info">
                  <h3 className="hospital-name">
                    {hospital.place_name}
                  </h3>
                  <p className="hospital-address">
                    📍 {hospital.road_address_name || hospital.address_name}
                  </p>
                  {hospital.phone && (
                    <p className="hospital-phone">
                      📞 {hospital.phone}
                    </p>
                  )}
                  {userLocation && (
                    <p className="hospital-distance">
                      🚶‍♂️ 약 {calculateDistance(
                        userLocation.lat, userLocation.lng,
                        parseFloat(hospital.y), parseFloat(hospital.x)
                      )}km
                    </p>
                  )}
                  {hospital.category_name && (
                    <p className="hospital-category">
                      🏷️ {hospital.category_name}
                    </p>
                  )}
                </div>
                <div className="hospital-actions">
                  <button 
                    className="action-btn navigation-btn"
                    onClick={() => {
                      console.log('🧭 일반 병원 네비게이션 클릭:', hospital);
                      handleNavigation(hospital);
                    }}
                  >
                    🧭 길찾기
                  </button>
                  {hospital.phone && (
                    <button 
                      className="action-btn call-btn"
                      onClick={() => handleCall(hospital.phone)}
                    >
                      📞 전화
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 응급상황 안내 */}
      <section className="emergency-section">
        <div className="emergency-card">
          <div className="emergency-icon">🚨</div>
          <div className="emergency-content">
            <h3>응급상황이신가요?</h3>
            <p>생명이 위급한 상황에서는 즉시 119에 신고하세요</p>
            <button 
              className="emergency-btn"
              onClick={() => {
                console.log('🚨 119 신고 버튼 클릭');
                window.location.href = 'tel:119';
              }}
            >
              🚑 119 신고
            </button>
          </div>
        </div>
      </section>

      {/* 디버깅 정보 (개발 모드에서만 표시) */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '8px',
          fontSize: '12px',
          maxWidth: '300px',
          zIndex: 1000
        }}>
          <div><strong>🔧 디버깅 정보:</strong></div>
          <div>추천 병원: {recommendedHospitals.length}개</div>
          <div>주변 병원: {nearby.length}개</div>
          <div>사용자 위치: {userLocation ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` : '❌ 없음'}</div>
          <div>반경: {radius}m</div>
          <div>로딩: {loading ? '✅' : '❌'}</div>
          <div>에러: {error || '없음'}</div>
        </div>
      )}
    </div>
  );
};

export default NearbyHospitals;