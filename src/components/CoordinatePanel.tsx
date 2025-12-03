import React from "react";

type LatLng = { lat: number; lng: number };

type CoordinatePanelProps = {
  clicked: LatLng | null;
  onCopy: () => void;
  onReset: () => void;
};

export default function CoordinatePanel({ clicked, onCopy, onReset }: CoordinatePanelProps) {
  return (
    <div className="coordinate-panel">
      <div className="coord-title">좌표 찍기 도구</div>
      {clicked ? (
        <>
          <div>
            위도(lat): <code>{clicked.lat.toFixed(6)}</code>
          </div>
          <div>
            경도(lng): <code>{clicked.lng.toFixed(6)}</code>
          </div>
          <div className="coord-actions">
            <button onClick={onCopy}>복사</button>
            <button onClick={onReset}>초기화</button>
          </div>
        </>
      ) : (
        <div style={{ color: "#666" }}>지도를 클릭하면 좌표가 표시됩니다.</div>
      )}
    </div>
  );
}