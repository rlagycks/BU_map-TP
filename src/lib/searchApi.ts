import api from "./apiClient";
import type { SearchResult } from "../types/api";

// 반환 타입을 BuildingDetail[] -> SearchResult[] 로 변경
export const searchBuildings = async (query: string): Promise<SearchResult[]> => {
  const res = await api.get<SearchResult[]>("/api/search", { params: { query } });
  return res.data;
};