import { useDataStore } from "../stores/dataStore";
import { removeFavorite } from "../lib/favoriteApi";
import { FaTrash, FaMapMarkerAlt } from "react-icons/fa";
import React from "react";

type FavoriteListProps = {
  onSelect: (buildingId: number) => void; // 클릭 시 해당 건물로 이동하기 위한 함수
};

export default function FavoriteList({ onSelect }: FavoriteListProps) {
  const { favorites, removeFavorite: removeFavStore } = useDataStore();

  // 삭제 핸들러
  const handleDelete = async (e: React.MouseEvent, roomId: number) => {
    e.stopPropagation(); // 부모 클릭 이벤트(이동) 방지
    if (!confirm("즐겨찾기에서 삭제하시겠습니까?")) return;

    try {
      await removeFavorite(roomId); // API 호출
      removeFavStore(roomId);       // 스토어 업데이트
    } catch (err) {
      console.error("삭제 실패", err);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  if (favorites.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>즐겨찾기한 장소가 없습니다.</p>
        <p className="text-sm mt-2">강의실 옆의 별(☆)을 눌러보세요!</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {favorites.map((fav) => (
        <li
          key={fav.favoriteId}
          onClick={() => fav.buildingId && onSelect(fav.buildingId)}
          className="p-4 hover:bg-gray-50 cursor-pointer transition-colors flex justify-between items-center"
        >
          <div>
            <div className="font-bold text-gray-900">
              {fav.roomName || fav.roomNumber || "이름 없는 장소"}
            </div>
            <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
              <FaMapMarkerAlt className="text-blue-400" />
              {fav.buildingName} {fav.floorLevel ? `${fav.floorLevel}층` : ""}
            </div>
          </div>
          
          <button
            onClick={(e) => handleDelete(e, fav.roomId)}
            className="text-gray-400 hover:text-red-500 p-2"
            title="삭제"
          >
            <FaTrash />
          </button>
        </li>
      ))}
    </ul>
  );
}