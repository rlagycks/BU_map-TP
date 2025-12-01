import { useEffect, useMemo, useState } from "react";
import type { BuildingDetail, FloorSummary, AvailableRoom } from "../types/api";
import { getAvailableRooms } from "../lib/floorApi";
// ▼▼▼ 추가된 임포트 (아이콘, API, 스토어) ▼▼▼
import { FaStar, FaRegStar } from "react-icons/fa";
import { addFavorite, removeFavorite } from "../lib/favoriteApi";
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

  // ▼▼▼ 즐겨찾기 상태 관리 (Zustand) ▼▼▼
  const { favorites, addFavorite: addFavStore, removeFavorite: removeFavStore } = useDataStore();

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

  // ▼▼▼ 강의실 즐겨찾기 토글 함수 ▼▼▼
  const toggleRoomFavorite = async (room: AvailableRoom) => {
    // 현재 이 방이 즐겨찾기 되어 있는지 확인
    const isFav = favorites.some((f) => String(f.roomId) === String(room.roomId));
    
    try {
      if (isFav) {
        // 이미 즐겨찾기 상태면 -> 삭제 API 호출 & 스토어에서 제거
        await removeFavorite(room.roomId);
        removeFavStore(room.roomId);
      } else {
        // 즐겨찾기가 아니면 -> 추가 API 호출 & 스토어에 추가
        await addFavorite(room.roomId);
        addFavStore({ roomId: room.roomId });
      }
    } catch (err) {
      console.error("즐겨찾기 변경 실패", err);
      alert("오류가 발생했습니다. 로그인이 되어 있는지 확인해주세요.");
    }
  };

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
            {description?.trim() && <p>ℹ️ {description.trim()}</p>}
            {!description?.trim() && desc?.trim() && <p>ℹ️ {desc.trim()}</p>}
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
            {!openingHours && !address && !website && (
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
                      // 현재 방이 즐겨찾기 목록에 있는지 확인
                      const isFav = favorites.some((f) => String(f.roomId) === String(r.roomId));
                      return (
                        <li key={r.roomId} className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                          <span className="text-sm text-gray-800 font-medium">
                            {r.name || r.roomNumber}
                          </span>
                          {/* ▼▼▼ 별 버튼 추가됨 ▼▼▼ */}
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