import api from "./apiClient";
import type { AvailableRoom } from "../types/api";

// 파라미터들을 받을 수 있도록 수정
export const getAvailableRooms = async (
  floorId: string | number,
  dayOfWeek?: number, // 1(월) ~ 7(일)
  start?: string,     // "HH:mm"
  end?: string        // "HH:mm"
): Promise<AvailableRoom[]> => {
  const res = await api.get<AvailableRoom[]>(`/api/floors/${floorId}/available-rooms`, {
    params: {
      dayOfWeek,
      start,
      end,
    },
  });
  return res.data;
};