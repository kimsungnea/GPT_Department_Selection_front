import React, { useState, useEffect, useRef } from 'react';
import './VoiceRecorder.css';

const VoiceRecorder = ({ onTranscript }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [recordingTime, setRecordingTime] = useState(0);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    };

    recognition.onresult = (event) => {
      const result = event.results[0][0].transcript;
      setTranscript(result);
      onTranscript(result);
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };

    recognition.onerror = (event) => {
      console.error('음성 인식 오류:', event.error);
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      if (event.error === 'no-speech') {
        alert('음성이 감지되지 않았습니다. 다시 시도해주세요.');
      } else if (event.error === 'network') {
        alert('네트워크 연결을 확인해주세요.');
      } else {
        alert('음성 인식 중 오류가 발생했습니다.');
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [onTranscript]);

  const startRecording = () => {
    if (!isSupported) {
      alert('이 브라우저는 음성 인식을 지원하지 않습니다.');
      return;
    }
    
    setTranscript('');
    recognitionRef.current?.start();
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isSupported) {
    return (
      <div className="voice-recorder-unsupported">
        <div className="unsupported-icon">🚫</div>
        <h3>음성 인식 미지원</h3>
        <p>이 브라우저는 음성 인식을 지원하지 않습니다.</p>
        <p>Chrome, Safari, Edge 브라우저를 사용해주세요.</p>
      </div>
    );
  }

  return (
    <div className="voice-recorder-container">
      <div className="voice-recorder">
        <button 
          className={`record-button ${isRecording ? 'recording' : ''}`}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={false}
        >
          <div className="button-content">
            <div className="mic-icon">
              {isRecording ? '🔴' : '🎤'}
            </div>
            <div className="button-text">
              {isRecording ? '녹음 중...' : '증상 말하기'}
            </div>
            {isRecording && (
              <div className="recording-time">
                {formatTime(recordingTime)}
              </div>
            )}
          </div>
          
          {isRecording && (
            <div className="recording-indicator">
              <div className="wave wave1"></div>
              <div className="wave wave2"></div>
              <div className="wave wave3"></div>
            </div>
          )}
        </button>

        {isRecording && (
          <div className="recording-status">
            <div className="status-text">
              🎙️ 말씀하세요... 완료되면 자동으로 정지됩니다
            </div>
            <button className="stop-button" onClick={stopRecording}>
              정지
            </button>
          </div>
        )}

        {transcript && !isRecording && (
          <div className="transcript-result">
            <h4>🗣️ 인식된 음성</h4>
            <div className="transcript-text">
              "{transcript}"
            </div>
            <div className="transcript-actions">
              <button 
                className="retry-button"
                onClick={startRecording}
              >
                다시 말하기
              </button>
            </div>
          </div>
        )}
      </div>
      {process.env.NODE_ENV === 'development' && (
  <div style={{ marginTop: '20px' }}>
    <button
      onClick={() => {
        console.log('테스트용 메세지 출력');
        onTranscript('오늘 아침이 뭐야');
      }}
      style={{
        padding: '10px 20px',
        background: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer'
      }}
    >
      🧪 테스트: "목감기" 보내기
    </button>
  </div>
)}


      <div className="voice-tips">
        <h4>💡 음성 인식 팁</h4>
        <ul>
          <li>조용한 곳에서 명확하게 말씀해주세요</li>
          <li>마이크 권한을 허용해주세요</li>
          <li>증상을 구체적으로 설명해주세요</li>
          <li>예: "머리가 아프고 열이 나요"</li>
        </ul>
      </div>
    </div>
  );
};

export default VoiceRecorder;