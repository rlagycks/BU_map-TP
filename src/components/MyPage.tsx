import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore, clearAuth } from "../stores/authStore";
import { useUiStore } from "../stores/uiStore";
import { FaUserCircle, FaSignOutAlt, FaArrowLeft } from "react-icons/fa";

type MyPageProps = {
  onBack: () => void; // 뒤로가기(목록으로) 함수
};

export default function MyPage({ onBack }: MyPageProps) {
  const { user } = useAuthStore();
  const { pushToast } = useUiStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (window.confirm("정말 로그아웃 하시겠습니까?")) {
      clearAuth(); // 스토어 초기화
      pushToast({ message: "로그아웃 되었습니다.", type: "success" });
      navigate("/"); // 로그인 화면으로 이동
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 상단 헤더 */}
      <div className="flex items-center p-4 border-b border-gray-200">
        <button 
          onClick={onBack} 
          className="text-gray-500 hover:text-black p-2 -ml-2"
          title="뒤로가기"
        >
          <FaArrowLeft />
        </button>
        <h2 className="text-lg font-bold flex-1 text-center mr-6">마이페이지</h2>
      </div>

      <div className="p-6 flex flex-col items-center flex-1">
        {/* 사용자 정보 카드 */}
        <div className="w-full bg-gray-50 rounded-2xl p-8 flex flex-col items-center mb-8 shadow-sm border border-gray-100">
          <FaUserCircle className="text-7xl text-gray-300 mb-4" />
          <div className="text-2xl font-bold text-gray-800 mb-1">
            {user?.nickname || "이름 없음"}
          </div>
          <div className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
            {user?.student_id || "학번 정보 없음"}
          </div>
        </div>

        {/* 메뉴 목록 */}
        <div className="w-full space-y-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-4 bg-white border border-red-200 rounded-xl hover:bg-red-50 text-red-600 transition-all font-medium shadow-sm"
          >
            <FaSignOutAlt />
            로그아웃
          </button>
        </div>

        <div className="mt-auto pt-8 text-xs text-gray-400">
          Baekseok Campus Map v1.0.0
        </div>
      </div>
    </div>
  );
}