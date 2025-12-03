import { useEffect, useMemo, useRef, useState } from "react";
import PlaceDetail from "./components/PlaceDetail";
import FavoriteList from "./components/FavoriteList"; // [추가] 즐겨찾기 목록 컴포넌트
import { getBuildingDetail, getBuildings } from "./lib/buildingApi";
import { searchBuildings } from "./lib/searchApi";
import type { BuildingDetail } from "./types/api";
import { useDataStore } from "./stores/dataStore";

declare global {
  interface Window {
    naver: any;
    navermap_authFailure?: () => void;
  }
}

type LatLng = { lat: number; lng: number };

// 초기 위치 고정, 경계, 줌 제한
const INIT: LatLng = { lat: 36.8401262, lng: 127.184586 };
const BOUNDS_SW: LatLng = { lat: 36.8335, lng: 127.1800 };
const BOUNDS_NE: LatLng = { lat: 36.8428, lng: 127.1888 };
const MIN_ZOOM = 16;
const MAX_ZOOM = 20;
const SIDEBAR_W = 360 as const;

export default function App() {
  console.info("[App] render", { pathname: window.location.pathname, hash: window.location.hash });
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoRefs = useRef<any[]>([]);
  const tempMarkerRef = useRef<any | null>(null);

  // 즐겨찾기 스토어 (앱 시작 시 목록 로딩용)
  const { setFavorites } = useDataStore(); 

  const [buildings, setBuildings] = useState<BuildingDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 공통: 모든 인포윈도우 닫기
  const closeAllInfo = () => {
    infoRefs.current.forEach((i) => i.close());
  };

  // 인포윈도우에서 "상세 정보 보기" 버튼 클릭 → 새창으로 detail 열기
  const registerDetailButtonClick = (btnId: string, buildingId: string) => {
    const { naver } = window;
    const map = mapRef.current;
    if (!naver || !map) return;

    naver.maps.Event.once(map, "idle", () => {
      const btn = document.getElementById(btnId);
      if (!btn) return;

      btn.onclick = (e) => {
        e.stopPropagation();
        // 새창에서 상세정보 페이지 열기
        window.open(`${window.location.origin}/#/detail/${buildingId}`, "_blank");
      };
    });
  };

  // 새창(상세정보 페이지)에서는 지도 랜더링 안함
  if (location.pathname.startsWith("/detail")) {
    return null;
  }

  // 좌표 찍기 / 사이드바 상태
  const [clicked, setClicked] = useState<LatLng | null>(null);
  const [q, setQ] = useState("");
  const [activeIdx, setActiveIdx] = useState(-1);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingDetail | null>(null);
  const [panelMode, setPanelMode] = useState<"list" | "detail">("list");
  const [sidebarTab, setSidebarTab] = useState<"search" | "favorite">("search"); // [추가] 탭 상태
  const [searchResults, setSearchResults] = useState<BuildingDetail[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // 검색 캐싱
  const results = useMemo(() => {
    const kw = q.trim();
    if (!kw) return [];
    return searchResults.map((b) => {
      const idx = buildings.findIndex((orig) => String(orig.id) === String(b.id));
      return { b, i: idx };
    });
  }, [q, searchResults, buildings]);

  // 검색 API 연동
  useEffect(() => {
    const kw = q.trim();
    if (!kw) {
      setSearchResults([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    const handle = setTimeout(() => {
      setSearchLoading(true);
      setSearchError(null);
      searchBuildings(kw)
        .then((res) => {
          // SearchResult -> BuildingDetail 변환
          const normalized: BuildingDetail[] = res.map((r) => ({
            id: r.id,
            buildingId: r.buildingId ?? r.id, // 건물이면 본인 ID, 아니면 소속 건물 ID
            name: r.displayName,
            lat: r.latitude,
            lng: r.longitude,
            desc: r.subTitle,     // 부가 설명 (예: "본부동 5층")
            category: r.type,     // 타입 (BUILDING, ROOM, FACILITY)
          }));
          setSearchResults(normalized);
        })
        .catch((err) => {
          console.error("[App] search failed", err);
          setSearchError("검색 결과를 불러오지 못했습니다.");
          setSearchResults([]);
        })
        .finally(() => setSearchLoading(false));
    }, 300);

    return () => clearTimeout(handle);
  }, [q]);

  // 빌딩 목록 + 상세 병합 로드 + 즐겨찾기 로드
  useEffect(() => {
    console.info("[App] loading buildings...");
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const list = await getBuildings();
        const merged: BuildingDetail[] = [];
        for (const b of list) {
          try {
            const detail = await getBuildingDetail(b.buildingId.toString());
            const lat =
              detail.location?.lat ??
              detail.latitude ??
              b?.location?.lat ??
              b?.latitude;
            const lng =
              detail.location?.lng ??
              detail.longitude ??
              b?.location?.lng ??
              b?.longitude;
            if (lat == null || lng == null) continue;
            merged.push({
              ...detail,
              id: detail.buildingId || b.buildingId,
              lat,
              lng,
            } as BuildingDetail);
          } catch {
            const lat = b?.location?.lat ?? b?.latitude;
            const lng = b?.location?.lng ?? b?.longitude;
            if (lat == null || lng == null) continue;
            merged.push({
              id: b.buildingId,
              name: b.name,
              lat,
              lng,
            } as BuildingDetail);
          }
        }
        setBuildings(merged);

      } catch (err) {
        console.error(err);
        setLoadError("데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);
  
  // 즐겨찾기 로딩용 useEffect 별도 분리 (import 문제 해결)
  useEffect(() => {
      import("./lib/favoriteApi").then(({ getFavorites }) => {
          getFavorites()
            .then((favs) => setFavorites(favs))
            .catch((e) => console.warn("[App] failed to load favorites", e));
      });
  }, [setFavorites]);


  useEffect(() => {
    const { naver } = window;
    if (!naver || !mapDivRef.current) return;
    if (!buildings.length) return;

    const map = new naver.maps.Map(mapDivRef.current, {
      center: new naver.maps.LatLng(INIT.lat, INIT.lng),
      zoom: 18,
      mapTypeControl: true,
      zoomControl: true,
      zoomControlOptions: { position: naver.maps.Position.RIGHT_CENTER },
      scaleControl: true,
    });
    mapRef.current = map;

    const clamp = (v: number, min: number, max: number) =>
      Math.min(Math.max(v, min), max);

    const keepInBounds = () => {
      const c = map.getCenter();
      const clampedLat = clamp(c.y, BOUNDS_SW.lat, BOUNDS_NE.lat);
      const clampedLng = clamp(c.x, BOUNDS_SW.lng, BOUNDS_NE.lng);
      if (c.y !== clampedLat || c.x !== clampedLng) {
        map.setCenter(new naver.maps.LatLng(clampedLat, clampedLng));
      }
    };

    naver.maps.Event.addListener(map, "dragend", keepInBounds);
    naver.maps.Event.addListener(map, "idle", keepInBounds);
    naver.maps.Event.addListener(map, "zoom_changed", () => {
      const z = map.getZoom();
      if (z < MIN_ZOOM) map.setZoom(MIN_ZOOM);
      if (z > MAX_ZOOM) map.setZoom(MAX_ZOOM);
    });

    buildings.forEach((b, idx: number) => {
      if (b.lat == null || b.lng == null) return;
      const pos = new naver.maps.LatLng(b.lat, b.lng);
      const marker = new naver.maps.Marker({
        map,
        position: pos,
        title: b.name,
      });
      markersRef.current.push(marker);

      const btnId = `detail-btn-${b.id}`;
      
      const html = `
        <div style="
          position: relative;
          background: #ffffff;
          padding: 14px 16px;
          border-radius: 0px;
          max-width: 240px;
          box-shadow: 0 6px 14px rgba(0, 0, 0, 0.10);
          font-family: 'Inter', 'Pretendard', sans-serif;
        ">
          <div style="font-size:16px; font-weight:700; color:#1a1a1a;">
            ${b.name}
          </div>
          ${
            b.category
              ? `<div style="margin-top:4px; font-size:12px; color:#4E8AFF; font-weight:500;">${b.category}</div>`
              : ""
          }
          ${
            b.desc
              ? `<div style="margin-top:8px; font-size:13px; color:#4a4a4a; line-height:1.45;">${b.desc}</div>`
              : ""
          }
          ${
            b.address
              ? `<div style="margin-top:10px; font-size:12px; color:#777;">📍 ${b.address}</div>`
              : ""
          }
          <button id="${btnId}" style="margin-top:14px; padding:6px 10px; font-size:13px; background:#4E8AFF; color:white; border:none; border-radius:6px; cursor:pointer;">
            상세 정보 보기
          </button>
          <div style="position:absolute; left:50%; bottom:-12px; transform:translateX(-50%); width:22px; height:12px; background:white; clip-path: polygon(50% 100%, 0 0, 100% 0); filter: drop-shadow(0 3px 5px rgba(0,0,0,0.12));"></div>
        </div>
      `;

      const info = new naver.maps.InfoWindow({ content: html });
      infoRefs.current.push(info);

      naver.maps.Event.addListener(marker, "click", () => {
        closeAllInfo();
        info.open(map, marker);
        map.panTo(pos);

        setSelectedBuilding(b);
        setPanelMode("detail");
        registerDetailButtonClick(btnId, b.id.toString());
      });
    });

    naver.maps.Event.addListener(map, "click", (e: any) => {
      const lat = e.coord.y;
      const lng = e.coord.x;
      setClicked({ lat, lng });

      if (!tempMarkerRef.current) {
        tempMarkerRef.current = new naver.maps.Marker({
          map,
          position: new naver.maps.LatLng(lat, lng),
          icon: {
            content: '<div style="transform:translate(-50%,-100%);font-size:20px">📍</div>',
          },
          draggable: true,
          zIndex: 999,
        });
        naver.maps.Event.addListener(tempMarkerRef.current, "dragend", () => {
          const p = tempMarkerRef.current!.getPosition();
          setClicked({ lat: p.y, lng: p.x });
        });
      } else {
        tempMarkerRef.current.setPosition(new naver.maps.LatLng(lat, lng));
      }
    });

    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      infoRefs.current.forEach((i) => i.close());
      markersRef.current = [];
      infoRefs.current = [];
      tempMarkerRef.current?.setMap(null);
      tempMarkerRef.current = null;
      map.destroy();
    };
  }, [buildings]);

  // [추가] 건물 ID로 이동하는 함수
  const moveToBuilding = (buildingId: number) => {
    const target = buildings.find((b) => String(b.id) === String(buildingId));
    if (target) {
      setSelectedBuilding(target);
      setPanelMode("detail");
      if (target.lat && target.lng && mapRef.current) {
         const pos = new window.naver.maps.LatLng(target.lat, target.lng);
         mapRef.current.panTo(pos);
         if (mapRef.current.getZoom() < 18) mapRef.current.setZoom(18);
      }
    } else {
      alert("지도에서 해당 건물을 찾을 수 없습니다.");
    }
  };

  const focusBuilding = (idx: number) => {
    const map = mapRef.current;
    const marker = markersRef.current[idx];
    const info = infoRefs.current[idx];
    if (!map || !marker || !info) return;

    const pos = marker.getPosition();
    if (map.getZoom() < 18) map.setZoom(18);
    map.panTo(pos);

    closeAllInfo();
    info.open(map, marker);
    setSelectedBuilding(buildings[idx]);
    setPanelMode("detail");
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!results.length) return;
    const pick = results[activeIdx >= 0 ? activeIdx : 0];
    if (pick.i >= 0) {
      focusBuilding(pick.i);
    } else if (pick.b.lat != null && pick.b.lng != null) {
      setSelectedBuilding(pick.b);
      setPanelMode("detail");
      if (mapRef.current) {
        mapRef.current.panTo(new window.naver.maps.LatLng(pick.b.lat, pick.b.lng));
      }
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((p) => (p + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((p) => (p - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = results[activeIdx >= 0 ? activeIdx : 0];
      if (pick) focusBuilding(pick.i);
    }
  };

  const copyClicked = () => {
    if (!clicked) return;
    const text = `{ "lat": ${clicked.lat}, "lng": ${clicked.lng} }`;
    navigator.clipboard?.writeText(text);
    alert("좌표를 복사했습니다:\n" + text);
  };

  // ▼▼▼ 수정된 부분: 부모 건물을 찾아 보여주는 로직 ▼▼▼
  const focusSearchResult = (b: BuildingDetail, idx: number) => {
    if (idx >= 0) {
      focusBuilding(idx);
      return;
    }

    // 1. 좌표 이동
    if (b.lat != null && b.lng != null && mapRef.current) {
      const pos = new window.naver.maps.LatLng(b.lat, b.lng);
      mapRef.current.panTo(pos);
    }

    // 2. 부모 건물 찾기 및 선택
    // buildingId가 있고, 본인의 id와 다르면 부모 건물을 찾아서 선택
    if (b.buildingId && String(b.buildingId) !== String(b.id)) {
      const parent = buildings.find((parent) => String(parent.id) === String(b.buildingId));
      if (parent) {
        setSelectedBuilding(parent);
      } else {
        // 부모를 못 찾으면 그냥 자신을 표시
        setSelectedBuilding(b);
      }
    } else {
      // 건물이면 자신을 표시
      setSelectedBuilding(b);
    }
    
    setPanelMode("detail");
  };
  // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-700">
        {loadError}
      </div>
    );
  }

  if (loading && !buildings.length) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-700">
        건물 데이터를 불러오는 중입니다...
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <div ref={mapDivRef} style={{ width: "100%", height: "100%" }} />

      {/* ───────────────── 좌측 패널 ───────────────── */}
      <div
        style={{
          position: "fixed",
          top: 12,
          left: 12,
          width: SIDEBAR_W,
          maxWidth: "92vw",
          zIndex: 1100,
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          maxHeight: "90vh",
        }}
      >
        {/* [추가] 탭 버튼 (검색 / 즐겨찾기) */}
        {panelMode === "list" && (
          <div className="flex border-b border-gray-200">
            <button
              className={`flex-1 py-3 text-sm font-bold ${
                sidebarTab === "search" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"
              }`}
              onClick={() => setSidebarTab("search")}
            >
              검색
            </button>
            <button
              className={`flex-1 py-3 text-sm font-bold ${
                sidebarTab === "favorite" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"
              }`}
              onClick={() => setSidebarTab("favorite")}
            >
              즐겨찾기
            </button>
          </div>
        )}

        {/* 검색바 (검색 탭일 때만 표시) */}
        {panelMode === "list" && sidebarTab === "search" && (
          <form onSubmit={onSubmit} style={{ padding: 12, borderBottom: "1px solid #eee" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPanelMode("list");
                }}
                onKeyDown={onKeyDown}
                placeholder="건물 검색 (예: 진리관, 백석홀)"
                style={{
                  flex: 1,
                  height: 40,
                  padding: "0 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 10,
                  fontSize: 14,
                  outline: "none",
                  background: "#fff",
                  color: "#111",
                }}
              />
            </div>
          </form>
        )}

        {/* 컨텐츠 영역 */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {panelMode === "detail" ? (
            <div style={{ padding: 12 }}>
              <button
                onClick={() => setPanelMode("list")}
                className="mb-2 text-sm text-gray-500 hover:text-black"
              >
                ← 목록으로
              </button>
              {selectedBuilding && (
                <>
                  <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>
                    {selectedBuilding.name}
                  </div>
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
          ) : (
            // 목록 모드
            sidebarTab === "search" ? (
              // (A) 검색 결과
              q ? (
                searchLoading ? (
                  <div style={{ padding: 16, fontSize: 13, color: "#666" }}>
                    검색 중...
                  </div>
                ) : searchError ? (
                  <div style={{ padding: 16, fontSize: 13, color: "#e11d48" }}>
                    {searchError}
                  </div>
                ) : results.length ? (
                  results.map(({ b, i }, idx) => (
                    <div
                      key={b.id}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => focusSearchResult(b, i)}
                      style={{
                        display: "flex",
                        gap: 10,
                        padding: "10px 12px",
                        cursor: "pointer",
                        background: idx === activeIdx ? "#f3f4f6" : "#fff",
                        borderBottom: "1px solid #f3f4f6",
                      }}
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
                  <div style={{ padding: 16, fontSize: 13, color: "#666" }}>
                    건물명을 검색해 보세요.
                  </div>
                )
              ) : (
                <div style={{ padding: 16, fontSize: 13, color: "#666" }}>
                  건물명을 검색해 보세요.
                </div>
              )
            ) : (
              // (B) 즐겨찾기 목록
              <FavoriteList onSelect={(buildingId) => moveToBuilding(buildingId)} />
            )
          )}
        </div>
      </div>

      {/* 우상단 좌표 패널 (기존 유지) */}
      <div
        style={{
          position: "fixed",
          top: 12,
          right: 12,
          zIndex: 1000,
          background: "rgba(255,255,255,0.96)",
          border: "1px solid #ddd",
          borderRadius: 10,
          padding: 10,
          fontSize: 13,
          minWidth: 230,
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 6 }}>좌표 찍기 도구</div>
        {clicked ? (
          <>
            <div>
              위도(lat): <code>{clicked.lat.toFixed(6)}</code>
            </div>
            <div>
              경도(lng): <code>{clicked.lng.toFixed(6)}</code>
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <button onClick={copyClicked}>복사</button>
              <button
                onClick={() => {
                  tempMarkerRef.current?.setMap(null);
                  tempMarkerRef.current = null;
                  setClicked(null);
                }}
              >
                초기화
              </button>
            </div>
          </>
        ) : (
          <div style={{ color: "#666" }}>지도를 클릭하면 좌표가 표시됩니다.</div>
        )}
      </div>
    </div>
  );
}