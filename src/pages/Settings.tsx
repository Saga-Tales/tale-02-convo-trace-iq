import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiKey, setApiKey, clearApiKey } from '@/lib/anthropic'
import { getNickname, setNickname } from '@/lib/profile'
import { usePWAInstall, detectPlatform, type Platform } from '@/lib/pwa'
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
  const { canInstall, installed, install } = usePWAInstall()
  const platform = detectPlatform()
  const [installing, setInstalling] = useState(false)
  const [installResult, setInstallResult] = useState<'accepted' | 'dismissed' | null>(null)

  async function handleInstall() {
    setInstalling(true)
    const accepted = await install()
    setInstallResult(accepted ? 'accepted' : 'dismissed')
    setInstalling(false)
  }

  // 1. 이미 설치되어 standalone 실행 중
  if (installed) {
    return (
      <section className="border border-line bg-white rounded-2xl p-5 shadow-sm space-y-3">
        <div>
          <h2 className="font-display italic text-lg text-ink mb-1">
            홈 화면에 추가
          </h2>
        </div>
        <div className="border-2 border-teal gradient-card-teal rounded-xl p-4">
          <p className="text-sm text-teal font-medium">
            ✓ 이미 PWA로 설치됨
          </p>
          <p className="text-xs text-ink-soft mt-1 leading-relaxed">
            앱처럼 실행 중이에요. 풀스크린 + 오프라인 캐싱 적용.
          </p>
        </div>
      </section>
    )
  }

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

      {/* canInstall=true: Android Chrome / Desktop Chrome·Edge에서 native prompt 가능 */}
      {canInstall && (
        <button
          onClick={handleInstall}
          disabled={installing}
          className="w-full px-4 py-3 bg-accent text-bg rounded-2xl font-medium hover:opacity-90 disabled:opacity-40 transition-opacity shadow-sm"
        >
          {installing ? '설치 중...' : '📲 지금 설치하기'}
        </button>
      )}

      {/* install 시도 후 dismiss된 경우 */}
      {installResult === 'dismissed' && (
        <div className="border border-line bg-bg-soft rounded-xl p-3 text-xs text-ink-soft">
          설치가 취소됐어요. 언제든 다시 시도할 수 있어요.
        </div>
      )}

      {/* iOS Safari: 자동 trigger 절대 불가능 → 수동 가이드 강조 */}
      {platform === 'ios' && (
        <div className="border-2 border-accent gradient-card rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-base">📱</span>
            <p className="text-sm font-medium text-accent">
              iOS는 수동 추가만 지원돼요
            </p>
          </div>
          <p className="text-xs text-ink-soft leading-relaxed">
            Apple 정책상 자동 설치 버튼이 안 떠요. 직접 3단계로 추가해주세요:
          </p>
          <ol className="text-sm text-ink space-y-1.5 leading-relaxed">
            <li className="flex gap-2">
              <span className="text-accent shrink-0">1.</span>
              <span>하단 공유 버튼 <span className="font-mono text-xs px-1.5 py-0.5 bg-bg-soft rounded">􀈂</span> 또는 □↑ 탭</span>
            </li>
            <li className="flex gap-2">
              <span className="text-accent shrink-0">2.</span>
              <span>메뉴 스크롤 → "<span className="font-medium">홈 화면에 추가</span>" 선택</span>
            </li>
            <li className="flex gap-2">
              <span className="text-accent shrink-0">3.</span>
              <span>우측 상단 "추가" 탭</span>
            </li>
          </ol>
        </div>
      )}

      {/* canInstall=false이고 iOS도 아닌 경우 — 브라우저 미지원 또는 기준 미달 */}
      {!canInstall && platform !== 'ios' && (
        <UnavailableHint platform={platform} />
      )}

      {/* 추가 플랫폼별 가이드 (참고용) */}
      <details className="text-xs text-ink-soft">
        <summary className="cursor-pointer hover:text-ink select-none">
          다른 플랫폼 가이드 보기
        </summary>
        <div className="mt-3 space-y-2">
          <PlatformHint
            icon="📱"
            label="iOS Safari"
            text="공유 버튼 (□↑) → 홈 화면에 추가"
            active={platform === 'ios'}
          />
          <PlatformHint
            icon="🤖"
            label="Android Chrome"
            text='메뉴 (⋮) → "앱 설치" 또는 자동 안내 배너 탭'
            active={platform === 'android'}
          />
          <PlatformHint
            icon="💻"
            label="데스크탑 Chrome/Edge"
            text='주소창 우측 설치 아이콘 (⊕) 또는 메뉴 → "앱으로 설치"'
            active={platform === 'desktop'}
          />
        </div>
      </details>
    </section>
  )
}

function UnavailableHint({ platform }: { platform: Platform }) {
  if (platform === 'android') {
    return (
      <div className="border border-line bg-bg-soft rounded-xl p-3 text-xs text-ink-soft leading-relaxed">
        설치 버튼이 활성화되지 않았어요. Chrome 브라우저에서 접속하거나, 한번
        새로고침해주세요. (이미 설치된 경우에도 버튼이 안 보일 수 있어요)
      </div>
    )
  }
  if (platform === 'desktop') {
    return (
      <div className="border border-line bg-bg-soft rounded-xl p-3 text-xs text-ink-soft leading-relaxed">
        설치 버튼이 활성화되지 않았어요. Chrome 또는 Edge에서 접속하거나,
        주소창 우측의 설치 아이콘 (⊕)을 직접 클릭해보세요.
      </div>
    )
  }
  return (
    <div className="border border-line bg-bg-soft rounded-xl p-3 text-xs text-ink-soft leading-relaxed">
      이 브라우저는 PWA 자동 설치를 지원하지 않아요. Chrome 또는 Edge에서
      접속하면 설치 버튼이 나타납니다.
    </div>
  )
}

function PlatformHint({
  icon,
  label,
  text,
  active,
}: {
  icon: string
  label: string
  text: string
  active: boolean
}) {
  return (
    <div
      className={`border rounded-xl p-3 ${
        active
          ? 'border-accent bg-accent-soft/30'
          : 'border-line bg-bg-soft'
      }`}
    >
      <p className={`text-sm ${active ? 'text-accent font-medium' : 'text-ink'}`}>
        {icon} {label}
        {active && <span className="text-xs ml-2">· 현재 디바이스</span>}
      </p>
      <p className="text-xs text-ink-soft mt-1 leading-relaxed">{text}</p>
    </div>
  )
}
