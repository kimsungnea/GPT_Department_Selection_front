import React, { useState, useEffect, useRef } from 'react';
import './VoiceRecorder.css';

const VoiceRecorder = ({ onTranscript }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef(null);

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

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event) => {
      const result = event.results[0][0].transcript;
      onTranscript(result);
      setIsRecording(false);
    };

    recognition.onerror = (e) => {
      console.error("음성인식 오류:", e);
      alert("음성 인식 오류가 발생했습니다. 다시 시도해주세요.");
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
  }, [onTranscript]);

  const handleRecord = () => {
    if (!isSupported) {
      alert("이 브라우저는 음성 인식을 지원하지 않습니다.");
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);  // 버튼을 다시 누르면 메시지 숨김
    } else {
      recognitionRef.current?.start();
    }
  };

  if (!isSupported) {
    return (
      <div>
        <h3>이 브라우저는 음성인식을 지원하지 않습니다.</h3>
        <p>Chrome, Edge, Safari 등을 이용해주세요.</p>
      </div>
    );
  }

  return (
    <div className="voice-recorder-container">
      {/* 녹음 버튼 */}
      <button
        onClick={handleRecord}
        className="image-record-button"
        aria-label="증상 말하기"
      >
        <img src="/images/Voice.PNG" alt="증상 말하기" className="voice-image" />
      </button>

      {/* 상태 표시 */}
      {isRecording && (
        <div className="recording-status">
          🎙️ 음성을 듣는 중입니다... 잠시만 기다려주세요.
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;
