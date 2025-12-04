// 공통 API 타입 정의
export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  studentId: string;
  nickname: string;
};

export type SignupRequest = {
  student_id: string;
  password: string;
  nickname: string;
};

export type LoginRequest = {
  student_id: string;
  password: string;
};

export type RefreshRequest = {
  refreshToken: string;
};

export type BuildingSummary = {
  buildingId: string | number;
  name: string;
  location?: {
    lat: number;
    lng: number;
  };
  latitude?: number;
  longitude?: number;
};

export type BuildingDetail = BuildingSummary & {
  id?: string | number; // 프론트 내부 식별자용
  lat?: number; // 편의를 위한 평탄화 좌표
  lng?: number;
  latitude?: number;
  longitude?: number;
  desc?: string;
  description?: string;
  address?: string;
  category?: string;
  openingHours?: string;
  website?: string;
  floors?: FloorSummary[];
};

export type FloorSummary = {
  floorId: string | number;
  name: string;
  level?: number;
  rooms?: RoomSummary[];
};

export type AvailableRoom = {
  roomId: string | number;
  name: string;
};

export type RoomSummary = {
  roomId: string | number;
  roomNumber?: string;
  name?: string;
  roomType?: string;
  capacity?: number;
  features?: string;
  operatingHours?: string | null;
  floorId?: string | number;
};

export type FavoriteItem = {
  favoriteId: number;
  roomId: number;
  roomNumber?: string;
  roomName?: string;
  // ▼▼▼ 백엔드 DTO에 맞춰 추가된 정보들 ▼▼▼
  buildingId?: number;
  buildingName?: string;
  floorId?: number;
  floorLevel?: number;
};


export type SearchResult = {
  type: string;
  id: number;
  displayName: string;
  subTitle: string;
  latitude: number;
  longitude: number;
  buildingId?: number;
  floorId?: number;
};