import React, { useState, useRef } from 'react';
import VoiceRecorder from '../../components/VoiceRecorder';
import TextSymptomInput from '../../components/TextSymptomInput';
import MapPage from '../Map/MapPage';
import axios from 'axios';
import './MainPage.css';

const API_BASE_URL = 'http://localhost:8080/api';

const MainPage = () => {
  const [symptom, setSymptom] = useState('');
  const [department, setDepartment] = useState('');
  const [reason, setReason] = useState('');
  const [recommendedHospitals, setRecommendedHospitals] = useState([]);
  const [userLocation, setUserLocation] = useState({ lat: 37.5665, lng: 126.9780 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResults, setShowResults] = useState(false);

  const voiceRef = useRef();
  const textRef = useRef();

  const analyzeSymptom = async (symptomText) => {
    try {
      setLoading(true);
      setError('');
      setSymptom(symptomText);
      setShowResults(false);

      const res = await axios.post(`${API_BASE_URL}/analyze-symptom`, { symptom: symptomText });
      const { department: recommendedDepartment, reason } = res.data;

      if (recommendedDepartment === "Error") {
        alert("죄송합니다. 증상으로 인식할 수 없습니다. 다시 말씀해주세요.");
        return;
      }

      setDepartment(recommendedDepartment);
      setReason(reason);

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
    setReason('');
    setRecommendedHospitals([]);
    setShowResults(false);
    setError('');
  };

  return (
    <div className="main-container">
      <header className="header">
        <div className="logo-wrap">
          <img src="/images/logo.PNG" alt="logo" />
          <span className="logo-title">스마트 병원 찾기</span>
        </div>
        <p className="subtitle">AI 기반 증상분석 + 위치 기반 병원 추천</p>
      </header>

      {!showResults ? (
        <>
          <section className="guide">
            <p className="guide-title">🩺 증상을 말하거나 입력해주세요</p>
            <p className="guide-example">예: “머리가 아파요”, “열이 나고 기침이 있어요”</p>
          </section>

          <section className="button-group">
            <VoiceRecorder ref={voiceRef} onTranscript={analyzeSymptom} />
            <TextSymptomInput ref={textRef} onSubmit={analyzeSymptom} />
          </section>

          {symptom && (
            <div className="symptom-preview">
              <span className="emoji">📝</span>
              <strong>입력된 증상:</strong> {symptom}
            </div>
          )}

          {loading && (
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>AI가 증상을 분석 중입니다...</p>
            </div>
          )}

          {error && (
            <div className="error-banner">
              ⚠️ {error}
              <button className="btn primary" onClick={resetSearch}>다시 시도</button>
            </div>
          )}

          <section className="tip-box">
            <h3>💡 음성 인식 팁</h3>
            <ul>
              <li>조용한 환경에서 말해주세요</li>
              <li>명확하고 구체적으로 말해주세요</li>
            </ul>
          </section>

          <footer className="footer">
            ⚠️ 본 서비스는 참고용이며, 의사 진료를 대체하지 않습니다.
          </footer>
        </>
      ) : (
        <>


          <section className="result-summary minimal">
            <div className="result-line">
              <span className="emoji">📝</span>
              <strong>증상:</strong> {symptom}
            </div>
            <div className="result-line">
              <span className="emoji">🏥</span>
              <strong>추천 진료과:</strong> {department}
            </div>
            {reason && (
              <div className="result-line reason">
                <span className="emoji">🧠</span>
                {reason}
              </div>
            )}
          </section>

          <section className="result-map">
            <MapPage
              recommendedHospitals={recommendedHospitals}
              userLocation={userLocation}
            />
          </section>

          <div className="result-actions">
            <button className="btn primary" onClick={resetSearch}>
              🔄 다른 증상 검색
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default MainPage;
