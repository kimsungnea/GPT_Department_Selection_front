import React from 'react';
import './HospitalList.css';

const HospitalList = ({ hospitals }) => {
  return (
    <div className="hospital-list-container">
      <h2>🏥 주변 병원 목록</h2>
      <div className="hospital-list">
        {hospitals.map((hospital, index) => (
          <div key={index} className="hospital-item">
            <div className="hospital-number">{index + 1}</div>
            <div className="hospital-info">
              <h3>{hospital.placeName}</h3>
              <p className="address">📍 {hospital.addressName}</p>
              <p className="phone">📞 {hospital.phone || '전화번호 없음'}</p>
              <p className="distance">📏 {hospital.distance}m</p>
              {hospital.placeUrl && (
                <a 
                  href={hospital.placeUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="detail-link"
                >
                  상세정보 보기
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HospitalList;