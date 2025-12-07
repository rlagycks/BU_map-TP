import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PlaceInfo from "../components/PlaceInfo";
import { getBuildingDetail } from "../lib/buildingApi";
import { getFavorites } from "../lib/favoriteApi";
import { useDataStore } from "../stores/dataStore";
import type { BuildingDetail } from "../types/api";

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const [building, setBuilding] = useState<BuildingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { setFavorites } = useDataStore();

  useEffect(() => {
    getFavorites()
      .then((favs) => setFavorites(favs))
      .catch((err) => console.warn("[DetailPage] failed to load favorites", err));
  }, [setFavorites]);

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
        // ▼▼▼ [수정] image -> imageUrl 로 변경 ▼▼▼
        imageUrl={building.imageUrl}
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
        floors={building.floors}
        description={building.description}
        desc={building.desc}
      />
    </div>
  );
}