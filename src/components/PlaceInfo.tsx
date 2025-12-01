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
  | "image"
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
  image,
  floors,
  description,
  desc,
}: PlaceInfoProps) {
  const displayName = name && name.trim().length ? name : `건물 ${id ?? ""}`;

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden w-full max-w-md">
      {image && <img src={image} alt={name} className="w-full h-48 object-cover" />}

      <div className="p-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
          {category && <p className="text-sm text-blue-600">{category}</p>}
        </div>
        {/* 기존의 건물 즐겨찾기 버튼(FaStar) 삭제됨 */}
      </div>

      <PlaceDetail
        key={id}
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