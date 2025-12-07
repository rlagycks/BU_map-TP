import { useState } from "react";
import type { BuildingDetail } from "../types/api";
import PlaceInfo from "./PlaceInfo";

type BuildingListProps = {
  buildings: BuildingDetail[];
};

export default function BuildingList({ buildings }: BuildingListProps) {
  const [selected, setSelected] = useState<BuildingDetail | null>(null);

  return (
    <div className="p-4 space-y-4">
      <ul className="space-y-2">
        {buildings.map((b) => (
          <li
            key={b.id}
            onClick={() => setSelected(b)}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded cursor-pointer"
          >
            {b.name}
          </li>
        ))}
      </ul>

      {selected && (
        <PlaceInfo
          key={selected.id}
          id={selected.id}
          name={selected.name}
          category={selected.category}
          address={selected.address}
          openingHours={selected.openingHours}
          website={selected.website}
          // ▼▼▼ [수정] image -> imageUrl 로 변경 ▼▼▼
          imageUrl={selected.imageUrl}
          // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
          // description, desc, floors 등 필요한 prop이 있다면 추가 전달
          description={selected.description}
          desc={selected.desc}
          floors={selected.floors}
        />
      )}
    </div>
  );
}