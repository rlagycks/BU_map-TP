import { useEffect, useMemo, useState } from "react";
import type { BuildingDetail, FloorSummary, AvailableRoom, RoomSummary } from "../types/api";
import { getAvailableRooms } from "../lib/floorApi";
import { FaStar, FaRegStar } from "react-icons/fa";
import { getFavorites, addFavorite, removeFavorite } from "../lib/favoriteApi";
import { useDataStore } from "../stores/dataStore";

type PlaceDetailProps = Pick<
  BuildingDetail,
  "openingHours" | "address" | "website" | "floors" | "id" | "description" | "desc"
>;

// 요일 목록
const DAYS = [
  { val: 1, label: "월" },
  { val: 2, label: "화" },
  { val: 3, label: "수" },
  { val: 4, label: "목" },
  { val: 5, label: "금" },
  { val: 6, label: "토" },
  { val: 7, label: "일" },
];

export default function PlaceDetail({
  openingHours,
  address,
  website,
  floors,
  description,
  desc,
}: PlaceDetailProps) {
  // 탭: info(정보), allroom(층별안내), emptyroom(빈강의실), review(리뷰)
  const [activeTab, setActiveTab] = useState<"info" | "allroom" | "emptyroom" | "review">("info");
  
  const [selectedFloor, setSelectedFloor] = useState<FloorSummary | null>(null);
  
  // 빈 강의실 검색용 상태
  const [searchDay, setSearchDay] = useState(new Date().getDay() || 7); // 오늘 요일 (일요일0 -> 7로 보정 필요하지만 편의상 기본값)
  const [searchStart, setSearchStart] = useState("09:00");
  const [searchEnd, setSearchEnd] = useState("11:00");
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[] | null>(null);
  const [emptyLoading, setEmptyLoading] = useState(false);
  const [emptyError, setEmptyError] = useState<string | null>(null);

  const { favorites, setFavorites } = useDataStore();

  // 기본 층 선택 (데이터 로드 시)
  useEffect(() => {
    if (floors && floors.length) {
      setSelectedFloor(floors[0]);
    } else {
      setSelectedFloor(null);
    }
  }, [floors]);

  // 층 목록
  const floorOptions = useMemo(() => floors ?? [], [floors]);

  // 즐겨찾기 토글 (공통 함수)
  // roomId만 있으면 되므로 타입을 number | string으로 받음
  const toggleFavorite = async (roomId: number | string) => {
    const isFav = favorites.some((f) => String(f.roomId) === String(roomId));
    try {
      if (isFav) {
        await removeFavorite(roomId);
      } else {
        await addFavorite(roomId);
      }
      const latestFavs = await getFavorites();
      setFavorites(latestFavs);
    } catch (err) {
      console.error("즐겨찾기 변경 실패", err);
      alert("오류가 발생했습니다. 로그인이 되어 있는지 확인해주세요.");
    }
  };

  // 빈 강의실 검색 핸들러
  const handleSearchEmpty = () => {
    if (!selectedFloor) return;
    
    setEmptyLoading(true);
    setEmptyError(null);
    // API 호출 (요일, 시작, 종료 시간 전달)
    getAvailableRooms(selectedFloor.floorId, searchDay, searchStart, searchEnd)
      .then((res) => setAvailableRooms(res))
      .catch((err) => {
        console.error(err);
        setEmptyError("검색에 실패했습니다.");
        setAvailableRooms([]);
      })
      .finally(() => setEmptyLoading(false));
  };

  // 설명 텍스트
  const displayDesc = description?.trim() || desc?.trim();

  return (
    <div className="mt-4 bg-white rounded-2xl shadow-inner w-full max-w-md overflow-hidden">
      {/* 상단 탭 버튼 */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {[
          { key: "info", label: "정보" },
          { key: "allroom", label: "층별안내" },
          { key: "emptyroom", label: "빈 강의실" },
          { key: "review", label: "리뷰" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`flex-1 py-3 text-xs font-medium whitespace-nowrap px-2 ${
              activeTab === key
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-blue-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-4 text-sm text-gray-700 space-y-4">
        {/* 1. 정보 탭 */}
        {activeTab === "info" && (
          <div className="space-y-2">
            {displayDesc && <p>ℹ️ {displayDesc}</p>}
            {openingHours && <p>🕒 운영시간: {openingHours}</p>}
            {address && <p>📍 주소: {address}</p>}
            {website && (
              <p className="text-blue-600">
                🌐 <a href={website} target="_blank" rel="noreferrer">{website}</a>
              </p>
            )}
            {!displayDesc && !openingHours && !address && !website && (
              <p className="text-gray-500">표시할 정보가 없습니다.</p>
            )}
          </div>
        )}

        {/* 층 선택 공통 UI (층별안내 or 빈강의실일 때 노출) */}
        {(activeTab === "allroom" || activeTab === "emptyroom") && (
          <div className="flex items-center gap-2 border-b pb-2">
             <span className="text-gray-600 font-bold">층 선택:</span>
             <select
               value={selectedFloor?.floorId ?? ""}
               onChange={(e) => {
                 const f = floorOptions.find(x => String(x.floorId) === e.target.value);
                 setSelectedFloor(f ?? null);
                 // 층이 바뀌면 빈강의실 목록은 초기화
                 if (activeTab === "emptyroom") setAvailableRooms(null);
               }}
               className="border border-gray-300 rounded px-2 py-1"
             >
               {floorOptions.map((f) => (
                 <option key={f.floorId} value={f.floorId}>
                   {f.name || `${f.level}층`}
                 </option>
               ))}
             </select>
          </div>
        )}

        {/* 2. 층별안내 탭 (전체 강의실 목록) */}
        {activeTab === "allroom" && selectedFloor && (
          <div>
             <h3 className="font-bold mb-2 text-gray-800">
                {selectedFloor.name || `${selectedFloor.level}층`} 전체 시설
             </h3>
             {selectedFloor.rooms && selectedFloor.rooms.length > 0 ? (
               <ul className="space-y-2 max-h-60 overflow-y-auto">
                 {selectedFloor.rooms.map((room) => {
                   const isFav = favorites.some(f => String(f.roomId) === String(room.roomId));
                   return (
                     <li key={room.roomId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span>{room.name || room.roomNumber} <span className="text-xs text-gray-400">({room.roomType})</span></span>
                        <button onClick={() => toggleFavorite(room.roomId)} className="text-lg p-1">
                          {isFav ? <FaStar color="gold" /> : <FaRegStar color="#ccc" />}
                        </button>
                     </li>
                   );
                 })}
               </ul>
             ) : (
               <p className="text-gray-500">등록된 시설이 없습니다.</p>
             )}
          </div>
        )}

        {/* 3. 빈 강의실 탭 (시간 검색) */}
        {activeTab === "emptyroom" && selectedFloor && (
          <div className="space-y-3">
            {/* 검색 조건 입력 */}
            <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg">
               <div className="col-span-2 flex gap-1 justify-between">
                  {DAYS.map(d => (
                    <button 
                      key={d.val} 
                      onClick={() => setSearchDay(d.val)}
                      className={`flex-1 py-1 text-xs rounded border ${searchDay === d.val ? "bg-blue-500 text-white border-blue-500" : "bg-white border-gray-200"}`}
                    >
                      {d.label}
                    </button>
                  ))}
               </div>
               <input type="time" value={searchStart} onChange={e => setSearchStart(e.target.value)} className="border p-1 rounded text-center"/>
               <input type="time" value={searchEnd} onChange={e => setSearchEnd(e.target.value)} className="border p-1 rounded text-center"/>
               
               <button onClick={handleSearchEmpty} className="col-span-2 bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 transition">
                 조회하기
               </button>
            </div>

            {/* 결과 목록 */}
            {emptyLoading && <div className="text-center text-gray-500">검색 중...</div>}
            {emptyError && <div className="text-center text-red-500">{emptyError}</div>}
            
            {!emptyLoading && !emptyError && availableRooms && (
              <div className="mt-2">
                <div className="text-xs text-gray-500 mb-2">검색 결과: {availableRooms.length}개</div>
                {availableRooms.length > 0 ? (
                  <ul className="space-y-2 max-h-48 overflow-y-auto">
                    {availableRooms.map((r) => {
                       const isFav = favorites.some(f => String(f.roomId) === String(r.roomId));
                       return (
                         <li key={r.roomId} className="flex items-center justify-between p-2 bg-green-50 border border-green-100 rounded">
                            <span className="text-green-800 font-medium">{r.name || r.roomNumber}</span>
                            <button onClick={() => toggleFavorite(r.roomId)} className="text-lg p-1">
                              {isFav ? <FaStar color="gold" /> : <FaRegStar color="#ccc" />}
                            </button>
                         </li>
                       );
                    })}
                  </ul>
                ) : (
                  <div className="text-center py-4 text-gray-500">조건에 맞는 빈 강의실이 없습니다.</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 4. 리뷰 탭 */}
        {activeTab === "review" && (
          <div className="text-gray-500 italic">추가 필요</div>
        )}
      </div>
    </div>
  );
}