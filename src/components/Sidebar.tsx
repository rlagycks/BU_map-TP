import React from "react";
import PlaceDetail from "./PlaceDetail";
import FavoriteList from "./FavoriteList";
import type { BuildingDetail } from "../types/api";

type SidebarProps = {
  panelMode: "list" | "detail";
  setPanelMode: (mode: "list" | "detail") => void;
  sidebarTab: "search" | "favorite";
  setSidebarTab: (tab: "search" | "favorite") => void;
  q: string;
  setQ: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  loading: boolean;
  error: string | null;
  results: { b: BuildingDetail; i: number }[];
  activeIdx: number;
  setActiveIdx: (idx: number) => void;
  focusSearchResult: (b: BuildingDetail, idx: number) => void;
  selectedBuilding: BuildingDetail | null;
  moveToBuilding: (buildingId: number) => void;
};

export default function Sidebar({
  panelMode,
  setPanelMode,
  sidebarTab,
  setSidebarTab,
  q,
  setQ,
  onSubmit,
  onKeyDown,
  loading,
  error,
  results,
  activeIdx,
  setActiveIdx,
  focusSearchResult,
  selectedBuilding,
  moveToBuilding,
}: SidebarProps) {
  return (
    <div className="sidebar">
      {/* 탭 버튼 */}
      {panelMode === "list" && (
        <div className="sidebar-tabs">
          <button
            className={`tab-button ${sidebarTab === "search" ? "active" : ""}`}
            onClick={() => setSidebarTab("search")}
          >
            검색
          </button>
          <button
            className={`tab-button ${sidebarTab === "favorite" ? "active" : ""}`}
            onClick={() => setSidebarTab("favorite")}
          >
            즐겨찾기
          </button>
        </div>
      )}

      {/* 검색바 */}
      {panelMode === "list" && sidebarTab === "search" && (
        <form onSubmit={onSubmit} className="search-form">
          <div className="search-input-wrapper">
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPanelMode("list");
              }}
              onKeyDown={onKeyDown}
              placeholder="건물 검색 (예: 진리관, 백석홀)"
              className="search-input"
            />
          </div>
        </form>
      )}

      {/* 컨텐츠 영역 */}
      <div className="sidebar-content">
        {panelMode === "detail" ? (
          <div className="detail-view">
            <button onClick={() => setPanelMode("list")} className="back-button">
              ← 목록으로
            </button>
            {selectedBuilding && (
              <>
                <div className="detail-title">{selectedBuilding.name}</div>
                <PlaceDetail
                  openingHours={selectedBuilding.openingHours}
                  address={selectedBuilding.address}
                  website={selectedBuilding.website}
                  floors={selectedBuilding.floors}
                  id={selectedBuilding.id}
                  description={selectedBuilding.description ?? selectedBuilding.desc}
                />
              </>
            )}
          </div>
        ) : sidebarTab === "search" ? (
          // 검색 결과 목록
          q ? (
            loading ? (
              <div className="message-box">검색 중...</div>
            ) : error ? (
              <div className="message-box error-text">{error}</div>
            ) : results.length ? (
              results.map(({ b, i }, idx) => (
                <div
                  key={b.id}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => focusSearchResult(b, i)}
                  className={`search-item ${idx === activeIdx ? "active" : ""}`}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{b.name}</div>
                    {b.desc && (
                      <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
                        {b.desc}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="message-box">검색 결과가 없습니다.</div>
            )
          ) : (
            <div className="message-box">건물명을 검색해 보세요.</div>
          )
        ) : (
          // 즐겨찾기 목록
          <FavoriteList onSelect={(buildingId) => moveToBuilding(buildingId)} />
        )}
      </div>
    </div>
  );
}