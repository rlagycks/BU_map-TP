import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "./components/Sidebar";
import CoordinatePanel from "./components/CoordinatePanel";
import { getBuildingDetail, getBuildings } from "./lib/buildingApi";
import { searchBuildings } from "./lib/searchApi";
import type { BuildingDetail } from "./types/api";
import { useDataStore } from "./stores/dataStore";
import "./App.css";

declare global {
  interface Window {
    naver: any;
    navermap_authFailure?: () => void;
  }
}

type LatLng = { lat: number; lng: number };

const INIT: LatLng = { lat: 36.8401262, lng: 127.184586 };
const BOUNDS_SW: LatLng = { lat: 36.8335, lng: 127.1800 };
const BOUNDS_NE: LatLng = { lat: 36.8428, lng: 127.1888 };
const MIN_ZOOM = 16;
const MAX_ZOOM = 20;

export default function App() {
  console.info("[App] render");
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoRefs = useRef<any[]>([]);
  const tempMarkerRef = useRef<any | null>(null);

  const { setFavorites } = useDataStore();

  const [buildings, setBuildings] = useState<BuildingDetail[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // UI State
  const [clicked, setClicked] = useState<LatLng | null>(null);
  const [q, setQ] = useState("");
  const [activeIdx, setActiveIdx] = useState(-1);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingDetail | null>(null);
  const [panelMode, setPanelMode] = useState<"list" | "detail">("list");
  const [sidebarTab, setSidebarTab] = useState<"search" | "favorite">("search");
  const [searchResults, setSearchResults] = useState<BuildingDetail[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // [추가] 상세 정보 로딩 상태
  const [detailLoading, setDetailLoading] = useState(false);

  // --- 헬퍼 함수들 ---
  const closeAllInfo = () => {
    infoRefs.current.forEach((i) => i.close());
  };

  const registerDetailButtonClick = (btnId: string, buildingId: string) => {
    const { naver } = window;
    const map = mapRef.current;
    if (!naver || !map) return;

    naver.maps.Event.once(map, "idle", () => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      btn.onclick = (e) => {
        e.stopPropagation();
        window.open(`${window.location.origin}/#/detail/${buildingId}`, "_blank");
      };
    });
  };

  // [추가] 상세 정보 가져오기 및 선택 함수
  const selectBuildingWithFetch = async (buildingId: number | string) => {
    setPanelMode("detail");
    setDetailLoading(true);
    try {
        const detail = await getBuildingDetail(String(buildingId));
        
        // 받아온 상세 정보 정규화
        const normalized: BuildingDetail = {
            ...detail,
            id: detail.buildingId ?? buildingId,
            lat: detail.latitude ?? detail.location?.lat,
            lng: detail.longitude ?? detail.location?.lng,
        };
        
        setSelectedBuilding(normalized);
    } catch (e) {
        console.error("상세 정보 로딩 실패", e);
        alert("건물 정보를 불러오는데 실패했습니다.");
    } finally {
        setDetailLoading(false);
    }
  };

  if (location.pathname.startsWith("/detail")) return null;

  // --- 검색 로직 ---
  const results = useMemo(() => {
    const kw = q.trim();
    if (!kw) return [];
    return searchResults.map((b) => {
      let idx = -1;
      if (b.category === 'BUILDING') {
        idx = buildings.findIndex((orig) => String(orig.id) === String(b.id));
      }
      return { b, i: idx };
    });
  }, [q, searchResults, buildings]);

  // 검색 API
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
          const normalized: BuildingDetail[] = res.map((r) => {
            let description = r.subTitle;
            if (r.type !== 'BUILDING' && r.buildingId) {
                const parent = buildings.find(b => String(b.id) === String(r.buildingId));
                if (parent) {
                    description = `[${parent.name}] ${description || ''}`;
                }
            }
            return {
              id: r.id,
              buildingId: r.buildingId ?? r.id,
              name: r.displayName,
              lat: r.latitude,
              lng: r.longitude,
              desc: description,
              category: r.type,
            };
          });
          setSearchResults(normalized);
        })
        .catch((err) => {
          console.error(err);
          setSearchError("검색 결과를 불러오지 못했습니다.");
          setSearchResults([]);
        })
        .finally(() => setSearchLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [q, buildings]);

  // --- [수정] 초기 데이터 로딩 (목록만 가져오기) ---
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        // 1. 건물 목록만 가져옴 (상세 호출 루프 제거)
        const list = await getBuildings();
        
        // 2. 지도에 찍을 수 있게 데이터 변환
        const initialBuildings: BuildingDetail[] = list.map(b => ({
            ...b,
            id: b.buildingId,
            lat: b.latitude ?? b.location?.lat,
            lng: b.longitude ?? b.location?.lng,
        } as BuildingDetail));

        setBuildings(initialBuildings);
      } catch (err) {
        console.error(err);
        setLoadError("데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // 즐겨찾기 로딩
  useEffect(() => {
    import("./lib/favoriteApi").then(({ getFavorites }) => {
      getFavorites()
        .then((favs) => setFavorites(favs))
        .catch((e) => console.warn("[App] failed to load favorites", e));
    });
  }, [setFavorites]);

  // --- 지도 초기화 ---
  useEffect(() => {
    const { naver } = window;
    if (!naver || !mapDivRef.current || !buildings.length) return;

    const map = new naver.maps.Map(mapDivRef.current, {
      center: new naver.maps.LatLng(INIT.lat, INIT.lng),
      zoom: 18,
      mapTypeControl: true,
      zoomControl: true,
      zoomControlOptions: { position: naver.maps.Position.RIGHT_CENTER },
      scaleControl: true,
    });
    mapRef.current = map;

    const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
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

    buildings.forEach((b) => {
      if (b.lat == null || b.lng == null) return;
      const pos = new naver.maps.LatLng(b.lat, b.lng);
      const marker = new naver.maps.Marker({ map, position: pos, title: b.name });
      markersRef.current.push(marker);

      const btnId = `detail-btn-${b.id}`;
      const html = `
        <div style="position: relative; background: #ffffff; padding: 14px 16px; border-radius: 0px; max-width: 240px; box-shadow: 0 6px 14px rgba(0, 0, 0, 0.10); font-family: 'Inter', 'Pretendard', sans-serif;">
          <div style="font-size:16px; font-weight:700; color:#1a1a1a;">${b.name}</div>
          ${b.category ? `<div style="margin-top:4px; font-size:12px; color:#4E8AFF; font-weight:500;">${b.category}</div>` : ""}
          ${b.desc ? `<div style="margin-top:8px; font-size:13px; color:#4a4a4a; line-height:1.45;">${b.desc}</div>` : ""}
          ${b.address ? `<div style="margin-top:10px; font-size:12px; color:#777;">📍 ${b.address}</div>` : ""}
          <button id="${btnId}" style="margin-top:14px; padding:6px 10px; font-size:13px; background:#4E8AFF; color:white; border:none; border-radius:6px; cursor:pointer;">상세 정보 보기</button>
          <div style="position:absolute; left:50%; bottom:-12px; transform:translateX(-50%); width:22px; height:12px; background:white; clip-path: polygon(50% 100%, 0 0, 100% 0); filter: drop-shadow(0 3px 5px rgba(0,0,0,0.12));"></div>
        </div>
      `;
      const info = new naver.maps.InfoWindow({ content: html });
      infoRefs.current.push(info);

      naver.maps.Event.addListener(marker, "click", () => {
        closeAllInfo();
        info.open(map, marker);
        map.panTo(pos);
        
        // [수정] 마커 클릭 시 상세 정보 요청
        selectBuildingWithFetch(b.id!);
        registerDetailButtonClick(btnId, b.id!.toString());
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
          icon: { content: '<div style="transform:translate(-50%,-100%);font-size:20px">📍</div>' },
          draggable: true, zIndex: 999,
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

  // --- 핸들러 함수들 ---
  const moveToBuilding = (buildingId: number) => {
    const target = buildings.find((b) => String(b.id) === String(buildingId));
    if (target) {
      // [수정] 즐겨찾기 이동 시 좌표 이동 및 상세 정보 요청
      if (target.lat && target.lng && mapRef.current) {
        const pos = new window.naver.maps.LatLng(target.lat, target.lng);
        mapRef.current.panTo(pos);
        if (mapRef.current.getZoom() < 18) mapRef.current.setZoom(18);
      }
      selectBuildingWithFetch(buildingId);
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
    
    // [수정] 목록 클릭 시에도 상세 정보 요청
    selectBuildingWithFetch(buildings[idx].id!);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!results.length) return;
    const pick = results[activeIdx >= 0 ? activeIdx : 0];
    if (pick.i >= 0) {
      focusBuilding(pick.i);
    } else if (pick.b.lat != null && pick.b.lng != null) {
      // 검색 결과 직접 선택 시
      if (mapRef.current) {
        mapRef.current.panTo(new window.naver.maps.LatLng(pick.b.lat, pick.b.lng));
      }
      selectBuildingWithFetch(pick.b.id!);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
    alert("좌표 복사: " + text);
  };

  const handleReset = () => {
    tempMarkerRef.current?.setMap(null);
    tempMarkerRef.current = null;
    setClicked(null);
  };

  const focusSearchResult = (b: BuildingDetail, idx: number) => {
    if (idx >= 0) {
      focusBuilding(idx);
      return;
    }
    if (b.lat != null && b.lng != null && mapRef.current) {
      const pos = new window.naver.maps.LatLng(b.lat, b.lng);
      mapRef.current.panTo(pos);
    }
    
    // [수정] 부모 건물 찾기 시 상세 정보 요청
    let targetId = b.id;
    if (b.buildingId && String(b.buildingId) !== String(b.id)) {
      targetId = b.buildingId;
    }
    
    if (targetId) selectBuildingWithFetch(targetId);
  };

  if (loadError) return <div className="min-h-screen flex items-center justify-center text-gray-700">{loadError}</div>;

  return (
    <div className="app-container">
      <div ref={mapDivRef} className="map-container" />
      
      <Sidebar
        panelMode={panelMode}
        setPanelMode={setPanelMode}
        sidebarTab={sidebarTab}
        setSidebarTab={setSidebarTab}
        q={q}
        setQ={setQ}
        onKeyDown={onKeyDown}
        onSubmit={onSubmit}
        loading={searchLoading}
        detailLoading={detailLoading} // [추가]
        error={searchError}
        results={results}
        activeIdx={activeIdx}
        setActiveIdx={setActiveIdx}
        focusSearchResult={focusSearchResult}
        selectedBuilding={selectedBuilding}
        moveToBuilding={moveToBuilding}
      />
      
      <CoordinatePanel
        clicked={clicked}
        onCopy={copyClicked}
        onReset={handleReset}
      />
    </div>
  );
}