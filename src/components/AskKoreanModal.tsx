import { useState } from 'react'
import { askKoToEn } from '@/lib/capture'

interface Props {
  open: boolean
  onClose: () => void
  sessionId?: number
  scenarioContext?: string
  onUseInChat: (english: string) => void
}

export function AskKoreanModal({
  open,
  onClose,
  sessionId,
  scenarioContext,
  onUseInChat,
}: Props) {
  const [korean, setKorean] = useState('')
  const [result, setResult] = useState<{ english: string; literal: string } | null>(
    null,
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  async function handleAsk() {
    const intent = korean.trim()
    if (!intent || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await askKoToEn({
        koreanIntent: intent,
        sessionId,
        scenarioContext,
      })
      setResult({ english: res.english, literal: res.literal })
    } catch (e) {
      setError(e instanceof Error ? e.message : '실패')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setKorean('')
    setResult(null)
    setError(null)
    onClose()
  }

  function handleUse() {
    if (!result) return
    onUseInChat(result.english)
    handleClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-bg border border-line rounded-xl p-5 max-w-md w-full shadow-lg space-y-4">
        <div>
          <h2 className="font-display italic text-2xl text-ink">한국어로?</h2>
          <p className="text-sm text-ink-soft mt-1">
            표현하고 싶은 의도를 한국어로 적어주세요. 자연스러운 영어 한 문장으로 바꿔드려요.
          </p>
        </div>

        <textarea
          value={korean}
          onChange={(e) => setKorean(e.target.value)}
          placeholder="예: 우리 회사는 시드 라운드 진행 중이에요"
          rows={2}
          autoFocus
          disabled={loading}
          className="w-full px-3 py-2 border border-line rounded-md bg-white focus:outline-none focus:border-accent resize-none text-sm disabled:opacity-60"
        />

        {!result && (
          <button
            onClick={handleAsk}
            disabled={loading || !korean.trim()}
            className="w-full px-4 py-2 bg-accent text-bg rounded-md text-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {loading ? '생각 중...' : '영어로 어떻게 말해?'}
          </button>
        )}

        {error && (
          <div className="border border-warn bg-warn/10 rounded-md p-3 text-xs text-warn">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="border border-accent bg-accent-soft rounded-md p-4 space-y-2">
              <p className="font-display italic text-lg text-ink leading-relaxed">
                "{result.english}"
              </p>
              <p className="text-xs text-ink-soft border-t border-line pt-2">
                직역: {result.literal}
              </p>
            </div>
            <p className="text-xs text-accent">🔖 표현이 자동 저장됐어요.</p>
            <div className="flex gap-2">
              <button
                onClick={handleUse}
                className="flex-1 px-4 py-2 bg-accent text-bg rounded-md text-sm hover:opacity-90"
              >
                회화에 이대로 보내기
              </button>
              <button
                onClick={() => {
                  setResult(null)
                  setKorean('')
                }}
                className="px-4 py-2 border border-line text-ink-soft rounded-md text-sm hover:bg-bg-soft"
              >
                다시 묻기
              </button>
            </div>
          </div>
        )}

        <button
          onClick={handleClose}
          className="w-full px-4 py-2 border border-line text-ink-soft rounded-md text-sm hover:bg-bg-soft"
        >
          닫기
        </button>
      </div>
    </div>
  )
}
