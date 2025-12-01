import { useEffect, useMemo, useRef, useState } from "react";
import PlaceDetail from "./components/PlaceDetail";
import { getBuildingDetail, getBuildings } from "./lib/buildingApi";
import { getFavorites, addFavorite, removeFavorite } from "./lib/favoriteApi";
import { searchBuildings } from "./lib/searchApi";
import type { BuildingDetail, BuildingSummary } from "./types/api";
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
  const { favorites, setFavorites, addFavorite: addFavStore, removeFavorite: removeFavStore } =
    useDataStore();

  const [buildings, setBuildings] = useState<BuildingDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 공통함수 추가했습니다. (성현)
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
  const [searchResults, setSearchResults] = useState<BuildingDetail[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // 검색 캐싱
  const results = useMemo(() => {
    const kw = q.trim();
    if (!kw) return [];
    // searchResults는 API 응답, 없으면 빈 배열
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
          const normalized = res.map((b) => ({
            ...b,
            id: b.id ?? b.buildingId,
            lat: b.lat ?? b.latitude ?? b.location?.lat,
            lng: b.lng ?? b.longitude ?? b.location?.lng,
          })) as BuildingDetail[];
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

  // 빌딩 목록 + 상세 병합 로드
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
            const detail = await getBuildingDetail(b.buildingId);
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
            if (lat == null || lng == null) continue; // 좌표 없는 데이터는 스킵
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

        // 즐겨찾기 초기 로드
        try {
          const favs = await getFavorites();
          setFavorites(favs);
          // 인포윈도우 별 표시를 위해 localStorage도 동기화
          merged.forEach((b) => {
            const isFav = favs.some((f) => String(f.roomId) === String(b.id));
            localStorage.setItem(`favorite_${b.id}`, String(isFav));
          });
        } catch (e) {
          console.warn("[App] failed to load favorites", e);
        }
      } catch (err) {
        console.error(err);
        setLoadError("건물 목록을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    // 이벤트(storage) 발생시 실행
    const onStorage = (e: StorageEvent) => {
      if (!e.key || !e.key.startsWith("favorite_")) return;    // storage의 key가 없거나 "favorite_"으로 시작되지 않으면 무시

      if (selectedBuilding && `favorite_${selectedBuilding.id}` === e.key) {
        setSelectedBuilding({ ...selectedBuilding });    // 상세정보가 새창이여서 즐겨찾기 key 변경시 선택된 건물 상태 강제 업데이트
      }

      infoRefs.current.forEach((info, idx) => {
        // 즐겨찾기 한 건물인지 아닌지 판단 (즐겨찾기 요소 없으면 무시)
        const b = buildings[idx];
        const favEl = document.getElementById(`fav-${b.id}`);
        if (!favEl) return;

        // 즐겨찾기 여부로 빈별 or 색칠된 별
        const isFav =
          localStorage.getItem(`favorite_${b.id}`) === "true" ||
          favorites.some((f) => String(f.roomId) === String(b.id));
        favEl.style.color = isFav ? "gold" : "#ccc";
        favEl.textContent = isFav ? "★" : "☆";
      });
    };

    // 상세정보창(새창)을 닫았다가 다시 열어도 동일한 상태 유지
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [selectedBuilding, buildings]);



  useEffect(() => {
    const { naver } = window;
    console.info("[App] map effect start", { hasNaver: !!naver, hasMapDiv: !!mapDivRef.current, buildings: buildings.length });
    if (!naver || !mapDivRef.current) return;
    if (!buildings.length) return;
    if (!buildings.length) return;

    // 지도 생성
    const map = new naver.maps.Map(mapDivRef.current, {
      center: new naver.maps.LatLng(INIT.lat, INIT.lng),
      zoom: 18,
      mapTypeControl: true,
      zoomControl: true,
      zoomControlOptions: { position: naver.maps.Position.RIGHT_CENTER },
      scaleControl: true,
    });
    mapRef.current = map;

    // 캠퍼스 경계/줌 제한
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

    // 마커 & 말풍선
    buildings.forEach((b, idx: number) => {
      if (b.lat == null || b.lng == null) return;
      const pos = new naver.maps.LatLng(b.lat, b.lng);
      const marker = new naver.maps.Marker({
        map,
        position: pos,
        title: b.name,
      });
      markersRef.current.push(marker);

      // 고유 ID 생성
      const btnId = `detail-btn-${b.id}`;
      const favId = `fav-${b.id}`;
      const storageKey = `favorite_${b.id}`;

      // InfoWindow HTML 구성
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
          <!-- 이름 -->
          <div style="font-size:16px; font-weight:700; color:#1a1a1a;">
            ${b.name}
          </div>

          <!-- 카테고리 -->
          ${
            b.category
              ? `
            <div style="
              margin-top:4px;
              font-size:12px;
              color:#4E8AFF;
              font-weight:500;
            ">
              ${b.category}
            </div>
          `
              : ""
          }

          <!-- 설명 -->
          ${
            b.desc
              ? `
            <div style="margin-top:8px; font-size:13px; color:#4a4a4a; line-height:1.45;">
              ${b.desc}
            </div>
          `
              : ""
          }

          <!-- 주소 -->
          ${
            b.address
              ? `
            <div style="margin-top:10px; font-size:12px; color:#777;">
              📍 ${b.address}
            </div>
          `
              : ""
          }

          

          <!-- 상세 버튼 -->
          <button id="${btnId}"
            style="
              margin-top:14px;
              padding:6px 10px;
              font-size:13px;
              background:#4E8AFF;
              color:white;
              border:none;
              border-radius:6px;
              cursor:pointer;
            ">
            상세 정보 보기
          </button>

          <!-- 말풍선 꼬리 -->
          <div style="
            position:absolute;
            left:50%;
            bottom:-12px;
            transform:translateX(-50%);
            width:22px;
            height:12px;
            background:white;
            clip-path: polygon(50% 100%, 0 0, 100% 0);
            filter: drop-shadow(0 3px 5px rgba(0,0,0,0.12));
          "></div>
        </div>
      `;

      // InfoWindow 생성 (배열에 저장)
      const info = new naver.maps.InfoWindow({ content: html });
      infoRefs.current.push(info);

      // 마커 클릭 이벤트
      naver.maps.Event.addListener(marker, "click", () => {

        // 1. 모든 말풍선 닫기
        closeAllInfo();  // 공동함수

        // 2. 현재 건물 말풍선 열기(클릭한 마커)
        info.open(map, marker);
        map.panTo(pos);  // 현재 마커 중심으로 이동

        // ps.즐겨찾기 리스트로 수정예정 ()
        setSelectedBuilding(b);    // 선택한 마커의 건물 선택
        setPanelMode("detail");    // 상세정보 호출 (검색창 밑에 부분)

        // INFOWINDOW 렌더링 이후 버튼 이벤트 등록 (렌더링 이후에 이벤트 등록을 하지 않을시 버튼 인식을 못함)
        registerDetailButtonClick(btnId, b.id);    // 공동함수

        // InfoWindow 생성시에 즐겨찾기 상태 확인 (실시간 적용)
        const attachStar = () => {
          const favBtn = document.getElementById(`fav-${b.id}`);    // 별 버튼 생성
          if (!favBtn) {
            requestAnimationFrame(attachStar);    // 별 버튼 생길때까지 계속해서 실행 (dom 형식 문제로 별 안생기는 경우 방지)
            return;
          }
  
          const storageKey = `favorite_${b.id}`;    // 건물별로 즐겨찾기 상태 저장키

          // 즐겨찾기 키를 통해 인포윈도우 창에 있는 별 버튼을 채울지 비울지
          const updateStar = () => {
            const isFav = localStorage.getItem(storageKey) === "true";
            favBtn.style.color = isFav ? "gold" : "#ccc";
            favBtn.textContent = isFav ? "★" : "☆";
          };

          updateStar();

          // 별버튼 클릭시 즐겨찾기에 저장 + 값 반전
          favBtn.onclick = (e) => {
            e.stopPropagation();
            const willFav = localStorage.getItem(storageKey) !== "true";
            const roomId = b.id;
            const doToggle = async () => {
              try {
                if (willFav) {
                  await addFavorite(roomId);
                  addFavStore({ roomId });
                } else {
                  await removeFavorite(roomId);
                  removeFavStore(roomId);
                }
                localStorage.setItem(storageKey, String(willFav));
                updateStar();
              } catch (err) {
                console.error("[App] favorite toggle failed", err);
                alert("즐겨찾기 저장에 실패했습니다.");
              }
            };
            void doToggle();
          };
        };

    attachStar(); // DOM 생성될 때까지 기다림 + 별 버튼 붙이기
  });     

      // 마커 클릭 이벤트
      naver.maps.Event.addListener(marker, "click", () => {
        closeAllInfo();
        info.open(map, marker);
        map.panTo(pos);

        setSelectedBuilding(b);
        setPanelMode("detail");

        // 상세 버튼 이벤트 등록
        registerDetailButtonClick(btnId, b.id);
      });
    });

    // 지도 클릭 → 임시 핀
    naver.maps.Event.addListener(map, "click", (e: any) => {
      const lat = e.coord.y;
      const lng = e.coord.x;
      setClicked({ lat, lng });

      if (!tempMarkerRef.current) {
        tempMarkerRef.current = new naver.maps.Marker({
          map,
          position: new naver.maps.LatLng(lat, lng),
          icon: {
            content:
              '<div style="transform:translate(-50%,-100%);font-size:20px">📍</div>',
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

  // 특정 빌딩으로 이동 + 패널 전환 (검색)
  const focusBuilding = (idx: number) => {
    const map = mapRef.current;
    const marker = markersRef.current[idx];
    const info = infoRefs.current[idx];
    if (!map || !marker || !info) return;

    const pos = marker.getPosition();   // 마커를 지도 중심으로
    if (map.getZoom() < 18) map.setZoom(18);
    map.panTo(pos);

    closeAllInfo();    // 공동함수
    info.open(map, marker);

    //ps. 즐겨찾기 리스트로 수정 예정
    setSelectedBuilding(buildings[idx]);
    setPanelMode("detail");
  };

  // 검색 제출
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!results.length) return;
    const pick = results[activeIdx >= 0 ? activeIdx : 0];
    if (pick.i >= 0) {
      focusBuilding(pick.i);
    } else if (pick.b.lat != null && pick.b.lng != null) {
      // 검색 결과가 기존 배열에 없을 때 직접 선택
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

  const focusSearchResult = (b: BuildingDetail, idx: number) => {
    if (idx >= 0) {
      focusBuilding(idx);
      return;
    }
    // 마커는 없지만 좌표로 이동 + 패널 열기
    if (b.lat != null && b.lng != null && mapRef.current) {
      const pos = new window.naver.maps.LatLng(b.lat, b.lng);
      mapRef.current.panTo(pos);
    }
    setSelectedBuilding(b);
    setPanelMode("detail");
  };

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
      {/* 지도 */}
      <div ref={mapDivRef} style={{ width: "100%", height: "100%" }} />

      {/* ───────────────── 좌측 단일 패널 ───────────────── */}
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
        }}
      >
        {/* 상단 검색바 */}
        <form onSubmit={onSubmit} style={{ padding: 12, borderBottom: "1px solid #eee" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {panelMode === "detail" && (
              <button
                type="button"
                onClick={() => setPanelMode("list")}
                title="뒤로가기"
                aria-label="뒤로가기"
                style={{
                  borderRadius: 8,
                  border: "1px solid #ddd",
                  background: "#f9fafb",
                  padding: "0 10px",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                ←
              </button>
            )}
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPanelMode("list");
              }}
              onKeyDown={onKeyDown}
              placeholder="건물 검색 (예: 진리관, 백석홀, 지혜관)"
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

        {/* 아래 영역: 리스트 or 상세보기 */}
        <div style={{ minHeight: 240, maxHeight: "60vh", overflowY: "auto" }}>
          {panelMode === "list" ? (
            // ── 검색 결과 리스트 ──
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
                  검색 결과가 없습니다.
                </div>
              )
            ) : (
              <div style={{ padding: 16, fontSize: 13, color: "#666" }}>
                건물명을 검색해 보세요.
              </div>
            )
          ) : (
            //── 상세보기 ──
            <div style={{ padding: 12 }}>
              {selectedBuilding ? (
                <>
                  {/* 상단이름 강조 */}
                  <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>
                    {selectedBuilding.name}
                  </div>
                  <PlaceDetail
                    openingHours={selectedBuilding.openingHours}
                    address={selectedBuilding.address}
                    website={selectedBuilding.website}
                  />
                </>
              ) : (
                <div style={{ color: "#666", fontSize: 13 }}>
                  건물을 선택하면 상세 정보가 표시됩니다.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 우상단 좌표 패널 */}
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
