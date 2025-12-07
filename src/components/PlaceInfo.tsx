import PlaceDetail from "./PlaceDetail";
import type { BuildingDetail } from "../types/api";

type PlaceInfoProps = Pick<
  BuildingDetail,
  | "id"
  | "name"
  | "category"
  | "address"
  | "openingHours"
  | "website"
  | "imageUrl" // [수정] image -> imageUrl 로 변경
  | "floors"
  | "description"
  | "desc"
>;

export default function PlaceInfo({
  id,
  name,
  category,
  address,
  openingHours,
  website,
  imageUrl, // [수정] props 이름 변경
  floors,
  description,
  desc,
}: PlaceInfoProps) {
  const displayName = name && name.trim().length ? name : `건물 ${id ?? ""}`;

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden w-full max-w-md">
      {/* ▼▼▼ 이미지 표시 영역 수정 ▼▼▼ */}
      <div className="w-full h-48 bg-gray-200 relative">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={displayName} 
            className="w-full h-full object-cover" 
            onError={(e) => {
              // 이미지 로드 실패 시 숨김 처리
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          // 이미지가 없을 때 보여줄 회색 박스 (선택 사항)
          <div className="flex items-center justify-center h-full text-gray-400">
            <span className="text-sm">이미지 없음</span>
          </div>
        )}
      </div>
      {/* ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ */}

      <div className="p-4 flex justify-between items-center border-b border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
          {category && <p className="text-sm text-blue-600 mt-1">{category}</p>}
        </div>
      </div>

      <PlaceDetail
        // key={id} // React warning 방지: 내부에 key가 필요하다면 여기서 줄 필요 없음
        openingHours={openingHours}
        address={address}
        website={website}
        floors={floors}
        id={id}
        description={description ?? desc}
      />
    </div>
  );
}