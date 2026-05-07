import { useState, useEffect, useRef, type KeyboardEvent } from 'react'
import { db, type Session, type Turn } from '@/db/schema'
import { streamReply } from '@/lib/conversation'
import type { ConversationMessage } from '@/lib/anthropic'
import { AskKoreanModal } from './AskKoreanModal'
import { WordLookupModal } from './WordLookupModal'

interface Props {
  session: Session & { id: number }
  onEnd: () => void
}

export function ChatView({ session, onEnd }: Props) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [askKoreanOpen, setAskKoreanOpen] = useState(false)
  const [wordLookupOpen, setWordLookupOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    db.turns
      .where('sessionId')
      .equals(session.id)
      .sortBy('createdAt')
      .then(setTurns)
  }, [session.id])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [turns, streamingText])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')

    const userTurn: Turn = {
      sessionId: session.id,
      role: 'user',
      content: text,
      createdAt: Date.now(),
    }
    const userId = await db.turns.add(userTurn)
    const savedUserTurn = { ...userTurn, id: userId as number }
    setTurns((prev) => [...prev, savedUserTurn])

    const history: ConversationMessage[] = [...turns, savedUserTurn]
      .filter(
        (t): t is Turn & { role: 'user' | 'assistant' } =>
          t.role === 'user' || t.role === 'assistant',
      )
      .map((t) => ({ role: t.role, content: t.content }))

    setStreaming(true)
    setStreamingText('')
    try {
      const reply = await streamReply({
        session,
        history,
        onDelta: setStreamingText,
      })

      const aiTurn: Turn = {
        sessionId: session.id,
        role: 'assistant',
        content: reply,
        createdAt: Date.now(),
      }
      const aiId = await db.turns.add(aiTurn)
      setTurns((prev) => [...prev, { ...aiTurn, id: aiId as number }])
    } catch (e) {
      console.warn('[chat] streaming 실패:', e)
      const errorTurn: Turn = {
        sessionId: session.id,
        role: 'system',
        content: `에러: ${e instanceof Error ? e.message : '알 수 없음'}`,
        createdAt: Date.now(),
      }
      setTurns((prev) => [...prev, errorTurn])
    } finally {
      setStreaming(false)
      setStreamingText('')
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void handleSend()
    }
  }

  const lastAssistantContent = [...turns]
    .reverse()
    .find((t) => t.role === 'assistant')?.content

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 9rem)' }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="min-w-0">
          <p className="font-display italic text-2xl text-accent truncate">
            {session.scenarioTitle}
          </p>
          <p className="text-xs text-ink-soft truncate">
            {session.tags.join(' · ')} · {session.difficulty}
          </p>
        </div>
        <button
          onClick={onEnd}
          className="px-3 py-1.5 border border-line text-ink-soft rounded-md text-sm hover:bg-bg-soft shrink-0"
        >
          회화 종료
        </button>
      </div>

      {/* turns 영역 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-white border border-line rounded-xl p-4 mb-3 space-y-3"
      >
        {turns.length === 0 && !streaming && (
          <p className="text-xs text-ink-soft text-center py-8">
            대화를 시작하세요...
          </p>
        )}
        {turns.map((t, i) => (
          <TurnBubble key={t.id ?? i} turn={t} />
        ))}
        {streaming && streamingText && (
          <TurnBubble
            turn={{
              role: 'assistant',
              content: streamingText,
              sessionId: session.id,
              createdAt: Date.now(),
            }}
            streaming
          />
        )}
        {streaming && !streamingText && (
          <p className="text-xs text-ink-soft animate-pulse">생각 중...</p>
        )}
      </div>

      {/* 캡처 도구 행 */}
      <div className="flex gap-1.5 mb-2">
        <button
          onClick={() => setAskKoreanOpen(true)}
          className="px-3 py-1.5 border border-line text-ink-soft rounded-md text-xs hover:bg-bg-soft hover:text-accent transition-colors"
        >
          한국어로?
        </button>
        <button
          onClick={() => setWordLookupOpen(true)}
          className="px-3 py-1.5 border border-line text-ink-soft rounded-md text-xs hover:bg-bg-soft hover:text-accent transition-colors"
        >
          단어 뜻
        </button>
      </div>

      {/* 입력창 */}
      <div className="flex gap-2 items-stretch">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="영어로 답하세요. (Enter 전송, Shift+Enter 줄바꿈)"
          rows={2}
          disabled={streaming}
          className="flex-1 px-3 py-2 border border-line rounded-md bg-white focus:outline-none focus:border-accent resize-none text-sm disabled:opacity-60"
        />
        <button
          onClick={handleSend}
          disabled={streaming || !input.trim()}
          className="px-4 bg-accent text-bg rounded-md text-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          전송
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-ink text-bg rounded-full text-sm shadow-lg z-30">
          {toast}
        </div>
      )}

      {/* 모달들 */}
      <AskKoreanModal
        open={askKoreanOpen}
        onClose={() => setAskKoreanOpen(false)}
        sessionId={session.id}
        scenarioContext={session.scenarioBrief}
        onUseInChat={(english) => {
          setInput((prev) => (prev ? `${prev} ${english}` : english))
          showToast('🔖 표현 저장됨 — 입력창에 채워졌어요')
        }}
      />
      <WordLookupModal
        open={wordLookupOpen}
        onClose={() => setWordLookupOpen(false)}
        sessionId={session.id}
        lastAssistantContent={lastAssistantContent}
        onCapture={(alreadyKnew) => {
          showToast(alreadyKnew ? '🔖 이미 저장된 단어' : '🔖 단어 저장됨')
        }}
      />
    </div>
  )
}

function TurnBubble({ turn, streaming }: { turn: Turn; streaming?: boolean }) {
  if (turn.role === 'system') {
    return (
      <div className="text-center">
        <p className="text-xs text-warn italic">{turn.content}</p>
      </div>
    )
  }

  const isUser = turn.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] px-3.5 py-2 rounded-lg text-sm leading-relaxed whitespace-pre-wrap ${
          isUser ? 'bg-accent-soft text-ink' : 'bg-bg-soft text-ink'
        }`}
      >
        {turn.content}
        {streaming && (
          <span className="ml-1 animate-pulse text-accent font-display">▋</span>
        )}
      </div>
    </div>
  )
}
