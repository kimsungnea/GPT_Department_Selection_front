import React, { useState } from 'react';

const TextSymptomInput = ({ onSubmit }) => {
  const [showInput, setShowInput] = useState(false);
  const [text, setText] = useState('');

  const handleButtonClick = () => {
    setShowInput(!showInput);
  };

  const handleSubmit = () => {
    if (!text.trim()) {
      alert("증상을 입력해주세요.");
      return;
    }
    onSubmit(text);
    setText('');
    setShowInput(false);  // 입력 후 닫을지 유지할지는 취향에 맞게
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div style={{ textAlign: "center" }}>
      {/* 이미지 버튼 */}
      <button
        onClick={handleButtonClick}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer"
        }}
      >
        <img
          src="/images/Text.PNG"
          alt="증상 입력하기"
          style={{ width: "100px", height: "100px" }}
        />
      </button>

      {/* 토글된 입력창 */}
      {showInput && (
        <div style={{ marginTop: "1rem" }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="증상을 자세하게 입력할수록 정확도가 증가합니다."
            rows={3}
            style={{
              width: "100%",
              padding: "1rem",
              borderRadius: "12px",
              border: "1px solid #ccc",
              resize: "none",
              fontSize: "1rem"
            }}
          />
          <br />
          <button
            onClick={handleSubmit}
            style={{
              background: "#4caf50",
              color: "white",
              border: "none",
              borderRadius: "20px",
              padding: "0.7rem 1.5rem",
              cursor: "pointer",
              fontSize: "0.9rem",
              marginTop: "0.5rem"
            }}
          >
            제출
          </button>
        </div>
      )}
    </div>
  );
};

export default TextSymptomInput;
