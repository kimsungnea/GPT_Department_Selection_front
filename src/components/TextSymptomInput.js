import React, { useState } from 'react';

const TextSymptomInput = ({ onSubmit, onActivate }) => {
  const [showInput, setShowInput] = useState(false);
  const [text, setText] = useState('');

  const handleButtonClick = () => {
    const nextShowInput = !showInput;
    setShowInput(nextShowInput);

    if (nextShowInput && onActivate) {
      onActivate("text");
    }
    if (!nextShowInput && onActivate) {
      onActivate(null);
    }
  };

  const handleSubmit = () => {
    if (!text.trim()) {
      alert("증상을 입력해주세요.");
      return;
    }
    onSubmit(text);
    setText('');
    setShowInput(false);
    if (onActivate) onActivate(null);
  };

  return (
    <div style={{ textAlign: "center", width: "100%" }}>
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

      {/* 입력창 */}
      {showInput && (
        <div
          style={{
            marginTop: "1rem",
            position: "relative",
            width: "100%",
            maxWidth: "600px",
            marginInline: "auto",
          }}
        >
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSubmit();
              }
            }}
            placeholder="증상을 자세하게 입력할수록 정확도가 증가합니다."
            style={{
              width: "100%",
              padding: "0.7rem 5rem 0.7rem 1rem", // 버튼 공간을 여유 있게 확보
              borderRadius: "20px",
              border: "1px solid #ccc",
              fontSize: "1rem",
              boxSizing: "border-box",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis"
            }}
          />
          <button
            onClick={handleSubmit}
            style={{
              position: "absolute",
              top: "50%",
              right: "10px",
              transform: "translateY(-50%)",
              background: "#4caf50",
              color: "white",
              border: "none",
              borderRadius: "20px",
              padding: "0.4rem 1rem",
              cursor: "pointer",
              fontSize: "0.9rem",
              whiteSpace: "nowrap"
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
