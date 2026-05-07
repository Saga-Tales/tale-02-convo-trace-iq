import {
  db,
  type Difficulty,
  type Session,
  type SessionMode,
} from '@/db/schema'
import type { Scenario } from './scenario'
import {
  callConversationStreaming,
  type ConversationMessage,
} from './anthropic'

const ACTIVE_SESSION_KEY = 'convo-trace-active-session'

export function getActiveSessionId(): number | null {
  const v = localStorage.getItem(ACTIVE_SESSION_KEY)
  if (!v) return null
  const n = parseInt(v, 10)
  return Number.isNaN(n) ? null : n
}

export function setActiveSessionId(id: number): void {
  localStorage.setItem(ACTIVE_SESSION_KEY, String(id))
}

export function clearActiveSessionId(): void {
  localStorage.removeItem(ACTIVE_SESSION_KEY)
}

export async function startSession(opts: {
  scenario: Scenario
  difficulty: Difficulty
  tags: string[]
  mode: SessionMode
  partnerName?: string
}): Promise<number> {
  const sessionId = await db.sessions.add({
    scenarioTitle: opts.scenario.title,
    scenarioBrief: opts.scenario.brief,
    difficulty: opts.difficulty,
    tags: opts.tags,
    mode: opts.mode,
    partnerName: opts.partnerName,
    startedAt: Date.now(),
    endedAt: null,
  })

  // 솔로 모드: openingLine을 첫 turn으로 저장. 페어는 turns 사용 안 함.
  if (opts.mode === 'solo') {
    await db.turns.add({
      sessionId: sessionId as number,
      role: 'assistant',
      content: opts.scenario.openingLine,
      createdAt: Date.now(),
    })
  }

  setActiveSessionId(sessionId as number)
  return sessionId as number
}

export async function endSession(opts: {
  sessionId: number
  rating?: number
  note?: string
}): Promise<void> {
  await db.sessions.update(opts.sessionId, {
    endedAt: Date.now(),
    rating: opts.rating,
    note: opts.note,
  })
  clearActiveSessionId()
}

const DIFFICULTY_INSTRUCTION: Record<Difficulty, string> = {
  beginner: 'A2 수준 어휘. 짧은 문장. 어려운 관용 표현 자제.',
  intermediate: 'B1-B2 수준 어휘. 자연스러운 회화체. 가끔 관용 표현 OK.',
  advanced: 'C1 수준. 관용 표현, 비유, 복잡한 문장 구조 자유롭게.',
}

function buildConversationSystem(session: Session): string {
  return `너는 영어 회화 파트너다.

시나리오: ${session.scenarioBrief}
너의 역할: 시나리오 안의 NPC. 사용자와 자연스럽게 회화를 이어간다.
난이도: ${DIFFICULTY_INSTRUCTION[session.difficulty]}

규칙:
- 영어로만 응답
- 한 턴에 1-3문장. 절대 길게 강의하지 말 것
- 사용자가 한국어로 말하거나 영어가 어색해도, 너는 영어로 답하고 자연스럽게 시나리오 이어가기
- 학습용 도구이니 너무 어려운 표현은 자제하되, 시나리오 자연스러움 우선
- 시나리오 맥락에 맞는 톤 유지 (격식/캐주얼)`
}

export async function streamReply(opts: {
  session: Session
  history: ConversationMessage[]
  onDelta: (acc: string) => void
}): Promise<string> {
  return callConversationStreaming(
    {
      system: buildConversationSystem(opts.session),
      messages: opts.history,
      maxTokens: 400,
    },
    opts.onDelta,
  )
}
