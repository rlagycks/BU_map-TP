import { useState } from "react";
import { isAxiosError } from "axios";
import "./Login.css";
import logo from "../assets/mapLogo.png";
import { useNavigate } from "react-router-dom";
import { login as loginApi } from "../lib/authApi";
import { useAuthStore } from "../stores/authStore";
import { useUiStore } from "../stores/uiStore";
import type { LoginRequest } from "../types/api";

function Login() {
  const [student_id, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setTokens, setUser } = useAuthStore();
  const { pushToast } = useUiStore();
  const navigate = useNavigate();
  const goToRegister = () => {
    navigate("/register");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (submitting) return;
    if (!student_id || !password) {
      setError("학번/아이디와 비밀번호를 입력해주세요.");
      return;
    }

    const payload: LoginRequest = { student_id, password };
    setSubmitting(true);
    setError(null);

    loginApi(payload)
      .then((response) => {
        const { accessToken, refreshToken, studentId, nickname } = response;

        // 1. 토큰 정보 저장 (AuthTokens 타입에 맞춰 전체 저장)
        setTokens({ accessToken, refreshToken, studentId, nickname });
        
        // 2. 사용자 프로필 정보 저장 (닉네임 포함)
        setUser({ student_id: studentId, nickname: nickname });
        
        pushToast({ message: "로그인에 성공했습니다.", type: "success" });
        navigate("/app");
      })
      .catch((err) => {
        if (isAxiosError(err) && err.response?.status === 401) {
          setError("학번 또는 비밀번호가 올바르지 않습니다.");
        } else {
          setError("로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        }
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="login-root">
      <div className="login-card">
        <img 
          src={logo}
          className="img"
          alt="Logo"
          style={{
            width:"161px",
            height:"161px"
          }}
        />

        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label htmlFor="student_id">아이디</label>
            <input
              id="student_id"
              type="text"
              placeholder="예: 202512345"
              value={student_id}
              onChange={(e) => setStudentId(e.target.value)}
              style={{
                backgroundColor: "#e9e9e9"
              }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              type="password"
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                backgroundColor: "#e9e9e9"
              }}
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm" style={{ marginTop: 4 }}>
              {error}
            </div>
          )}

          <button type="submit" className="login-button" disabled={submitting}>
            {submitting ? "로그인 중..." : "로그인"}
          </button>

        </form>
        <button className="register-button" onClick={goToRegister}>
            회원가입
        </button>

      </div>
    </div>
  );
}

export default Login;