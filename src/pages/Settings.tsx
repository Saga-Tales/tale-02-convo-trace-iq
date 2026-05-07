import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiKey, setApiKey, clearApiKey } from '@/lib/anthropic'

export function Settings() {
  const navigate = useNavigate()
  const [key, setKey] = useState('')
  const [saved, setSaved] = useState(false)
  const existing = getApiKey()

  function handleSave() {
    if (!key.trim()) return
    setApiKey(key)
    setSaved(true)
    setKey('')
    setTimeout(() => {
      setSaved(false)
      navigate('/')
    }, 800)
  }

  function handleClear() {
    if (!confirm('저장된 API 키를 삭제할까요?')) return
    clearApiKey()
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display italic text-4xl text-ink">설정</h1>
        <p className="text-ink-soft text-sm mt-1">
          Anthropic API 키를 입력하면 회화를 시작할 수 있어요.
        </p>
      </header>

      <section className="border border-line bg-white rounded-xl p-5 shadow-sm space-y-4">
        <div>
          <label className="text-sm font-medium text-ink block mb-2">
            Anthropic API 키
          </label>
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
            className="w-full px-3 py-2 border border-line rounded-md bg-bg-soft text-ink focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        <div className="flex gap-2 items-center">
          <button
            onClick={handleSave}
            disabled={!key.trim()}
            className="px-4 py-2 bg-accent text-bg rounded-md text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            저장
          </button>
          {existing && (
            <button
              onClick={handleClear}
              className="px-4 py-2 border border-line text-ink-soft rounded-md text-sm hover:bg-bg-soft transition-colors"
            >
              삭제
            </button>
          )}
          {saved && (
            <span className="text-sm text-accent ml-2">저장됨 → 홈으로</span>
          )}
        </div>
      </section>

      <section className="border border-line bg-white rounded-xl p-5 shadow-sm">
        <h2 className="font-display text-lg text-ink mb-2">개인정보</h2>
        <p className="text-sm text-ink-soft leading-relaxed">
          모든 데이터(API 키, 회화 기록, 단어/표현)는 이 브라우저에만 저장돼요.
          백엔드 서버 없음. 회화 메시지는 응답을 받기 위해 Anthropic API로 일시
          전송됩니다.
        </p>
      </section>
    </div>
  )
}
