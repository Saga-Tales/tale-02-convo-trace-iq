import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiKey, setApiKey, clearApiKey } from '@/lib/anthropic'
import { getNickname, setNickname } from '@/lib/profile'
import { BackupSection } from '@/components/BackupSection'

export function Settings() {
  const navigate = useNavigate()
  const [key, setKey] = useState('')
  const [keySaved, setKeySaved] = useState(false)
  const existing = getApiKey()

  const [nickname, setNicknameState] = useState(getNickname())
  const [nicknameSaved, setNicknameSaved] = useState(false)

  function handleSaveKey() {
    if (!key.trim()) return
    setApiKey(key)
    setKeySaved(true)
    setKey('')
    setTimeout(() => {
      setKeySaved(false)
      navigate('/')
    }, 800)
  }

  function handleClearKey() {
    if (!confirm('저장된 API 키를 삭제할까요?')) return
    clearApiKey()
    window.location.reload()
  }

  function handleSaveNickname() {
    setNickname(nickname)
    setNicknameSaved(true)
    setTimeout(() => setNicknameSaved(false), 1500)
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display italic text-4xl text-accent">
          <span className="sig-star">설정</span>
        </h1>
      </header>

      <section className="border border-line bg-white rounded-2xl p-5 shadow-sm space-y-3">
        <div>
          <h2 className="font-display italic text-lg text-ink mb-1">닉네임</h2>
          <p className="text-xs text-ink-soft">
            시나리오의 예시 대화 흐름에서 너의 차례 라벨로 표시돼요.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNicknameState(e.target.value)}
            placeholder="예: 아이큐"
            className="flex-1 px-3 py-2 border border-line rounded-xl bg-bg-soft text-ink focus:outline-none focus:border-accent transition-colors"
          />
          <button
            onClick={handleSaveNickname}
            className="px-4 py-2 bg-accent text-bg rounded-xl text-sm hover:opacity-90 transition-opacity"
          >
            저장
          </button>
          {nicknameSaved && <span className="text-sm text-accent">✓</span>}
        </div>
      </section>

      <section className="border border-line bg-white rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h2 className="font-display italic text-lg text-ink mb-1">
            Anthropic API 키
          </h2>
          <p className="text-xs text-ink-soft">
            키는 이 브라우저에만 저장돼요. Claude Haiku 4.5로 시나리오 생성 + 회화 진행.
          </p>
        </div>

        <div>
          {existing ? (
            <p className="text-sm text-accent mb-3">
              ✓ 저장된 키 있음 (····{existing.slice(-6)})
            </p>
          ) : (
            <p className="text-sm text-ink-soft mb-3">
              <a
                href="https://console.anthropic.com"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-accent"
              >
                console.anthropic.com
              </a>
              에서 발급받을 수 있어요. 보통 $5 충전이면 한 달 사용 가능.
            </p>
          )}
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-ant-..."
            className="w-full px-3 py-2 border border-line rounded-xl bg-bg-soft text-ink focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        <div className="flex gap-2 items-center">
          <button
            onClick={handleSaveKey}
            disabled={!key.trim()}
            className="px-4 py-2 bg-accent text-bg rounded-xl text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            저장
          </button>
          {existing && (
            <button
              onClick={handleClearKey}
              className="px-4 py-2 border border-line text-ink-soft rounded-xl text-sm hover:bg-bg-soft transition-colors"
            >
              삭제
            </button>
          )}
          {keySaved && (
            <span className="text-sm text-accent ml-2">저장됨 → 홈으로</span>
          )}
        </div>
      </section>

      <BackupSection />

      <PWAInstallSection />

      <section className="border border-line gradient-card-warm rounded-2xl p-5">
        <h2 className="font-display italic text-lg text-ink mb-2">
          개인정보
        </h2>
        <p className="text-sm text-ink-soft leading-relaxed">
          모든 데이터(API 키, 닉네임, 회화 기록, 단어/표현)는 이 브라우저에만 저장돼요.
          백엔드 서버 없음. 회화 메시지는 응답을 받기 위해 Anthropic API로 일시
          전송됩니다.
        </p>
      </section>
    </div>
  )
}

function PWAInstallSection() {
  return (
    <section className="border border-line bg-white rounded-2xl p-5 shadow-sm space-y-3">
      <div>
        <h2 className="font-display italic text-lg text-ink mb-1">
          홈 화면에 추가
        </h2>
        <p className="text-xs text-ink-soft leading-relaxed">
          앱처럼 설치하면 풀스크린 + 오프라인 캐싱 + 빠른 실행이 가능해요.
        </p>
      </div>

      <div className="space-y-2 text-sm">
        <div className="border border-line bg-bg-soft rounded-xl p-3 space-y-1">
          <p className="font-medium text-ink">📱 iOS Safari</p>
          <p className="text-xs text-ink-soft leading-relaxed">
            공유 버튼 (□↑) → "홈 화면에 추가"
          </p>
        </div>
        <div className="border border-line bg-bg-soft rounded-xl p-3 space-y-1">
          <p className="font-medium text-ink">🤖 Android Chrome</p>
          <p className="text-xs text-ink-soft leading-relaxed">
            메뉴 (⋮) → "앱 설치" 또는 자동 안내 배너 탭
          </p>
        </div>
        <div className="border border-line bg-bg-soft rounded-xl p-3 space-y-1">
          <p className="font-medium text-ink">💻 데스크탑 Chrome/Edge</p>
          <p className="text-xs text-ink-soft leading-relaxed">
            주소창 우측 설치 아이콘 (⊕) 또는 메뉴 → "앱으로 설치"
          </p>
        </div>
      </div>
    </section>
  )
}
