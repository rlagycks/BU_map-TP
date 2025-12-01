import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PlaceInfo from "../components/PlaceInfo";
import { getBuildingDetail } from "../lib/buildingApi";
// ▼▼▼ 즐겨찾기 API 및 스토어 임포트 추가 ▼▼▼
import { getFavorites } from "../lib/favoriteApi";
import { useDataStore } from "../stores/dataStore";
import type { BuildingDetail } from "../types/api";

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const [building, setBuilding] = useState<BuildingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ▼▼▼ 즐겨찾기 스토어 함수 가져오기 ▼▼▼
  const { setFavorites } = useDataStore();

  // ▼▼▼ [추가됨] 상세 페이지 접속 시 즐겨찾기 목록 불러오기 ▼▼▼
  useEffect(() => {
    // 즐겨찾기 목록을 서버에서 최신으로 가져옴
    getFavorites()
      .then((favs) => setFavorites(favs))
      .catch((err) => console.warn("[DetailPage] failed to load favorites", err));
  }, [setFavorites]);

  // 건물 상세 정보 불러오기
  useEffect(() => {
    if (!id) {
      setError("잘못된 경로입니다.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    getBuildingDetail(id)
      .then((data) => setBuilding({ ...data, id: data.buildingId || data.id || id }))
      .catch(() => setError("해당 건물을 찾을 수 없습니다."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <div className="min-h-screen flex justify-center items-center text-gray-600">
        로딩 중...
      </div>
    );

  if (error || !building)
    return (
      <div className="min-h-screen flex justify-center items-center text-gray-600">
        ❌ {error || "해당 건물을 찾을 수 없습니다."}
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center p-6">
      <PlaceInfo
        id={building.id}
        name={building.name}
        category={building.category}
        address={building.address}
        openingHours={building.openingHours}
        website={building.website}
        image={building.image}
        floors={building.floors}
        description={building.description}
        desc={building.desc}
      />
    </div>
  );
}