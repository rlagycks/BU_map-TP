import React from "react";
import PlaceDetail from "./PlaceDetail";
import FavoriteList from "./FavoriteList";
import MyPage from "./MyPage";
import type { BuildingDetail } from "../types/api";
import { FaUserCircle } from "react-icons/fa";

type SidebarProps = {
  panelMode: "list" | "detail";
  setPanelMode: (mode: "list" | "detail") => void;
  sidebarTab: "search" | "favorite";
  setSidebarTab: (tab: "search" | "favorite") => void;
  q: string;
  setQ: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  loading: boolean;       // 검색 로딩
  detailLoading: boolean; // [추가] 상세 정보 로딩
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
  detailLoading, // [추가]
  error,
  results,
  activeIdx,
  setActiveIdx,
  focusSearchResult,
  selectedBuilding,
  moveToBuilding,
}: SidebarProps) {
  const [showMyPage, setShowMyPage] = React.useState(false);

  if (showMyPage) {
    return (
      <div className="sidebar">
        <MyPage onBack={() => setShowMyPage(false)} />
      </div>
    );
  }

  return (
    <div className="sidebar">
      {/* 1. 상단 탭 & 마이페이지 버튼 */}
      {panelMode === "list" && (
        <div className="sidebar-tabs flex items-center pr-2">
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
          <button
            onClick={() => setShowMyPage(true)}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            title="마이페이지"
          >
            <FaUserCircle size={24} />
          </button>
        </div>
      )}

      {/* 2. 검색바 */}
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

      {/* 3. 컨텐츠 영역 */}
      <div className="sidebar-content">
        {panelMode === "detail" ? (
          <div className="detail-view">
            <button onClick={() => setPanelMode("list")} className="back-button">
              ← 목록으로
            </button>
            
            {/* ▼▼▼ 로딩 상태 처리 추가 ▼▼▼ */}
            {detailLoading ? (
              <div className="message-box">상세 정보를 불러오는 중...</div>
            ) : selectedBuilding ? (
              <>
                <div className="detail-title">{selectedBuilding.name}</div>
                <PlaceDetail
                  openingHours={selectedBuilding.openingHours}
                  address={selectedBuilding.address}
                  website={selectedBuilding.website}
                  floors={selectedBuilding.floors}
                  id={selectedBuilding.id}
                  description={
                    selectedBuilding.description ?? selectedBuilding.desc
                  }
                />
              </>
            ) : (
               <div className="message-box error-text">건물 정보를 찾을 수 없습니다.</div>
            )}
          </div>
        ) : sidebarTab === "search" ? (
          // (A) 검색 결과 목록
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
                  className={`search-item ${
                    idx === activeIdx ? "active" : ""
                  }`}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>
                      {b.name}
                    </div>
                    {b.desc && (
                      <div
                        style={{ fontSize: 12, color: "#555", marginTop: 2 }}
                      >
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
          // (B) 즐겨찾기 목록
          <FavoriteList onSelect={(buildingId) => moveToBuilding(buildingId)} />
        )}
      </div>
    </div>
  );
}