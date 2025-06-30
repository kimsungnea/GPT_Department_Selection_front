import React, { useState } from 'react';
import VoiceRecorder from '../../components/VoiceRecorder';
import axios from 'axios';
import MapPage from '../Map/MapPage';
import './MainPage.css';

const API_BASE_URL = 'http://localhost:8080/api';

const MainPage = () => {
  const [symptom, setSymptom] = useState('');
  const [department, setDepartment] = useState('');
  const [recommendedHospitals, setRecommendedHospitals] = useState([]);
  const [userLocation, setUserLocation] = useState({ lat: 37.5665, lng: 126.9780 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResults, setShowResults] = useState(false);

  const analyzeSymptom = async (symptomText) => {
    try {
      setLoading(true);
      setError('');
      setSymptom(symptomText);
      setShowResults(false);

      // GPT 분석
      const res = await axios.post(`${API_BASE_URL}/analyze-symptom`, { symptom: symptomText });
      const recommendedDepartment = res.data.department;

      if (recommendedDepartment === "Error") {
        alert("죄송합니다. 증상으로 인식할 수 없습니다. 다시 말씀해주세요.");
        return; // 👉 다음 단계(showResults)로 넘어가지 않도록 여기서 중단
      }

      setDepartment(recommendedDepartment);

      // Spring 검색
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            setUserLocation({ lat, lng });

            const response = await axios.get(`${API_BASE_URL}/search-hospitals`, {
              params: { department: recommendedDepartment, lat, lng }
            });
            setRecommendedHospitals(response.data);
            setShowResults(true);
          },
          async () => {
            const response = await axios.get(`${API_BASE_URL}/search-hospitals`, {
              params: { department: recommendedDepartment, lat: userLocation.lat, lng: userLocation.lng }
            });
            setRecommendedHospitals(response.data);
            setShowResults(true);
          }
        );
      }
    } catch (e) {
      console.error(e);
      setError('증상 분석 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const resetSearch = () => {
    setSymptom('');
    setDepartment('');
    setRecommendedHospitals([]);
    setShowResults(false);
    setError('');
  };

  return (
    <div className="main-container">
      {/* 헤더 섹션 */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">🏥</span>
            <h1>스마트 병원 찾기</h1>
          </div>
          <p className="subtitle">증상을 말씀해주시면 적합한 병원을 찾아드립니다</p>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="main-content">
        {!showResults ? (
          <div className="input-section">
            <div className="voice-section">
              <div className="voice-instruction">
                <h2>🎤 증상을 말씀해주세요</h2>
                <p>예: "머리가 아파요", "배가 아픈데 설사도 해요", "기침이 나고 열이 있어요"</p>
              </div>
              
              <VoiceRecorder onTranscript={analyzeSymptom} />
              
              {symptom && (
                <div className="symptom-display">
                  <h3>📝 입력된 증상</h3>
                  <div className="symptom-text">{symptom}</div>
                </div>
              )}

              {loading && (
                <div className="loading-section">
                  <div className="loading-spinner"></div>
                  <p>증상을 분석하고 병원을 찾는 중입니다...</p>
                </div>
              )}

              {error && (
                <div className="error-section">
                  <div className="error-icon">⚠️</div>
                  <p>{error}</p>
                  <button onClick={resetSearch} className="retry-btn">
                    다시 시도하기
                  </button>
                </div>
              )}

              {department && !loading && (
                <div className="department-result">
                  <h3>🏥 추천 진료과</h3>
                  <div className="department-badge">{department}</div>
                </div>
              )}
            </div>

            {/* 추가 기능 안내 */}
            <div className="features-section">
              <h3>✨ 주요 기능</h3>
              <div className="features-grid">
                <div className="feature-card">
                  <div className="feature-icon">🎙️</div>
                  <h4>음성 인식</h4>
                  <p>증상을 말로 간편하게 입력</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">🤖</div>
                  <h4>AI 분석</h4>
                  <p>증상에 맞는 진료과 추천</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">📍</div>
                  <h4>위치 기반</h4>
                  <p>가까운 병원 우선 표시</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">🧭</div>
                  <h4>길찾기</h4>
                  <p>병원까지 실시간 네비게이션</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="results-section">
            <div className="results-header">
              <div className="results-info">
                <h2>🎯 검색 결과</h2>
                <p><strong>증상:</strong> {symptom}</p>
                <p><strong>추천 진료과:</strong> <span className="department-tag">{department}</span></p>
              </div>
              <button onClick={resetSearch} className="new-search-btn">
                새로운 검색
              </button>
            </div>
            
            <MapPage
              recommendedHospitals={recommendedHospitals}
              userLocation={userLocation}
            />
          </div>
        )}
      </main>

      {/* 푸터 */}
      <footer className="footer">
        <p>⚠️ 응급상황 시 119에 즉시 연락하세요</p>
        <p>본 서비스는 참고용이며, 정확한 진단은 의료진과 상담하세요</p>
      </footer>
    </div>
  );
};

export default MainPage;