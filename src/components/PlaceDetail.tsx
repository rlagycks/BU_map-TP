import { useEffect, useMemo, useState } from "react";
import type { BuildingDetail, FloorSummary, AvailableRoom } from "../types/api";
import { getAvailableRooms } from "../lib/floorApi";
import { FaStar, FaRegStar } from "react-icons/fa";
// [수정] getFavorites 추가 임포트
import { getFavorites, addFavorite, removeFavorite } from "../lib/favoriteApi";
import { useDataStore } from "../stores/dataStore";

type PlaceDetailProps = Pick<
  BuildingDetail,
  "openingHours" | "address" | "website" | "floors" | "id" | "description" | "desc"
>;

export default function PlaceDetail({
  openingHours,
  address,
  website,
  floors,
  description,
  desc,
}: PlaceDetailProps) {
  const [activeTab, setActiveTab] = useState<"info" | "emptyroom" | "review">("info");
  const [selectedFloor, setSelectedFloor] = useState<FloorSummary | null>(null);
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[] | null>(null);
  const [emptyLoading, setEmptyLoading] = useState(false);
  const [emptyError, setEmptyError] = useState<string | null>(null);

  // [수정] setFavorites를 사용하기 위해 구조 분해 할당 추가
  const { favorites, setFavorites } = useDataStore();

  // 기본 층 선택
  useEffect(() => {
    if (floors && floors.length) {
      setSelectedFloor(floors[0]);
    } else {
      setSelectedFloor(null);
    }
  }, [floors]);

  // 빈 강의실 조회
  useEffect(() => {
    if (activeTab !== "emptyroom") return;
    if (!selectedFloor) {
      setAvailableRooms([]);
      return;
    }
    setEmptyLoading(true);
    setEmptyError(null);
    getAvailableRooms(selectedFloor.floorId)
      .then((res) => setAvailableRooms(res))
      .catch((err) => {
        console.error("[PlaceDetail] available rooms fetch failed", err);
        setEmptyError("빈 강의실 정보를 불러오지 못했습니다.");
        setAvailableRooms([]);
      })
      .finally(() => setEmptyLoading(false));
  }, [activeTab, selectedFloor]);

  const floorOptions = useMemo(() => floors ?? [], [floors]);

  // [수정] 즐겨찾기 토글 로직 개선 (서버 동기화)
  const toggleRoomFavorite = async (room: AvailableRoom) => {
    const isFav = favorites.some((f) => String(f.roomId) === String(room.roomId));
    try {
      // 1. API 호출 (추가/삭제)
      if (isFav) {
        await removeFavorite(room.roomId);
      } else {
        await addFavorite(room.roomId);
      }
      
      // 2. [핵심] 서버에서 최신 목록 다시 받아오기
      // (백엔드 DTO에 건물 이름 등이 포함되어 있으므로, 이걸 받아야 목록 탭에서 제대로 보임)
      const latestFavs = await getFavorites();
      
      // 3. 스토어 업데이트
      setFavorites(latestFavs);
      
    } catch (err) {
      console.error("즐겨찾기 변경 실패", err);
      alert("오류가 발생했습니다. 로그인이 되어 있는지 확인해주세요.");
    }
  };

  // 설명을 보여줄 변수 정리
  const displayDesc = description?.trim() || desc?.trim();

  return (
    <div className="mt-4 bg-white rounded-2xl shadow-inner w-full max-w-md overflow-hidden">
      <div className="flex border-b border-gray-200">
        {[
          { key: "info", label: "정보" },
          { key: "emptyroom", label: "빈 강의실" },
          { key: "review", label: "리뷰" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === key
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-blue-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-4 text-sm text-gray-700 space-y-2">
        {activeTab === "info" && (
          <>
            {displayDesc && <p>ℹ️ {displayDesc}</p>}
            {openingHours && <p>🕒 운영시간: {openingHours}</p>}
            {address && <p>📍 주소: {address}</p>}
            {website && (
              <p className="text-blue-600">
                🌐{" "}
                <a href={website} target="_blank" rel="noreferrer">
                  {website}
                </a>
              </p>
            )}
            
            {!displayDesc && !openingHours && !address && !website && (
              <p className="text-gray-500">표시할 정보가 없습니다.</p>
            )}
          </>
        )}

        {activeTab === "emptyroom" && (
          <div className="space-y-3">
            {floorOptions.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">층 선택</span>
                <select
                  value={selectedFloor?.floorId ?? ""}
                  onChange={(e) => {
                    const f = floorOptions.find(
                      (x) => String(x.floorId) === e.target.value
                    );
                    setSelectedFloor(f ?? null);
                  }}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                >
                  {floorOptions.map((f) => (
                    <option key={f.floorId} value={f.floorId}>
                      {f.name || `${f.level ?? ""}층` || f.floorId}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {emptyLoading && <div className="text-gray-500">불러오는 중...</div>}
            {emptyError && <div className="text-red-600 text-sm">{emptyError}</div>}
            {!emptyLoading && !emptyError && (
              <>
                {availableRooms?.length ? (
                  <ul className="space-y-2">
                    {availableRooms.map((r) => {
                      const isFav = favorites.some((f) => String(f.roomId) === String(r.roomId));
                      return (
                        <li key={r.roomId} className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                          <span className="text-sm text-gray-800 font-medium">
                            {r.name || r.roomNumber}
                          </span>
                          <button 
                            onClick={() => toggleRoomFavorite(r)} 
                            className="text-lg focus:outline-none p-1 hover:scale-110 transition-transform"
                            title={isFav ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                          >
                            {isFav ? <FaStar color="gold" /> : <FaRegStar color="#ccc" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="text-gray-500">빈 강의실이 없습니다.</div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "review" && (
          <div className="text-gray-500 italic">추가 필요</div>
        )}
      </div>
    </div>
  );
}