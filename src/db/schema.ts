import Dexie, { type Table } from 'dexie'

export type Difficulty =
  | 'A1' | 'A2' | 'A2+'
  | 'B1' | 'B1+' | 'B2'
  | 'C1' | 'C1+' | 'C2'

export const DIFFICULTY_GROUPS = {
  '초급': ['A1', 'A2', 'A2+'] as const,
  '중급': ['B1', 'B1+', 'B2'] as const,
  '고급': ['C1', 'C1+', 'C2'] as const,
}

export type SessionMode = 'solo' | 'pair'
export type SessionRole = 'host' | 'guest'
export type PhraseType = 'stuck' | 'new' | 'good'
export type CaptureSource = 'self' | 'imported'
export type ScenarioSource = 'preset' | 'generated' | 'user'

export interface DialogTurn {
  speaker: 'user' | 'partner'
  english: string
  intentKo?: string
}

export interface Session {
  id?: number
  /** 페어 모드에서 host와 guests를 매칭하는 UUID. 솔로/단일 디바이스 페어는 undefined. */
  sessionUuid?: string
  /** 페어 모드에서 이 디바이스의 역할 */
  role?: SessionRole
  /** 페어 참여자 이름 배열 (호스트 본인 + 게스트들). 솔로는 undefined. */
  participants?: string[]
  scenarioTitle: string
  scenarioBrief: string
  scenarioObjectives?: string[]
  scenarioKeyExpressions?: DialogTurn[]
  scenarioLearningGoals?: string[]
  scenarioUserRole?: string
  scenarioAiRole?: string
  difficulty: Difficulty
  tags: string[]
  mode: SessionMode
  /** @deprecated participants를 사용. 하위호환용. */
  partnerName?: string
  startedAt: number
  endedAt: number | null
  rating?: number
  note?: string
}

export interface Turn {
  id?: number
  sessionId: number
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: number
}

export interface VocabItem {
  id?: number
  term: string
  meaningKo: string
  contextSentence?: string
  sessionOrigin?: number
  capturedAt: number
  source: CaptureSource
  mastery: number
  lastReviewedAt: number | null
  nextReviewAt: number | null
}

export interface PhraseItem {
  id?: number
  expressionEn: string
  intentKo: string
  scenarioContext?: string
  type: PhraseType
  sessionOrigin?: number
  capturedAt: number
  source: CaptureSource
  mastery: number
  lastReviewedAt: number | null
  nextReviewAt: number | null
}

export interface ScenarioTemplate {
  id?: number
  title: string
  brief: string
  difficulty: Difficulty
  tags: string[]
  source: ScenarioSource
  createdAt: number
  lastUsedAt: number | null
}

class ConvoTraceDB extends Dexie {
  sessions!: Table<Session, number>
  turns!: Table<Turn, number>
  vocabulary!: Table<VocabItem, number>
  phrases!: Table<PhraseItem, number>
  scenarios!: Table<ScenarioTemplate, number>

  constructor() {
    super('convo-trace-iq')

    this.version(1).stores({
      sessions: '++id, startedAt, endedAt, mode',
      turns: '++id, sessionId, createdAt',
      vocabulary: '++id, &[term+meaningKo], capturedAt, nextReviewAt, mastery',
      phrases: '++id, &[expressionEn+intentKo], capturedAt, nextReviewAt, mastery, type',
      scenarios: '++id, lastUsedAt',
    })

    // v2: difficulty CEFR 마이그레이션
    this.version(2)
      .stores({
        sessions: '++id, startedAt, endedAt, mode',
        turns: '++id, sessionId, createdAt',
        vocabulary: '++id, &[term+meaningKo], capturedAt, nextReviewAt, mastery',
        phrases: '++id, &[expressionEn+intentKo], capturedAt, nextReviewAt, mastery, type',
        scenarios: '++id, lastUsedAt',
      })
      .upgrade(async (tx) => {
        const map: Record<string, Difficulty> = {
          beginner: 'A2',
          intermediate: 'B1+',
          advanced: 'C1+',
        }
        await tx.table('sessions').toCollection().modify((s: { difficulty: string }) => {
          if (s.difficulty in map) s.difficulty = map[s.difficulty]
        })
        await tx.table('scenarios').toCollection().modify((s: { difficulty: string }) => {
          if (s.difficulty in map) s.difficulty = map[s.difficulty]
        })
      })

    // v3: scenarioKeyExpressions string[] → DialogTurn[]
    this.version(3)
      .stores({
        sessions: '++id, startedAt, endedAt, mode',
        turns: '++id, sessionId, createdAt',
        vocabulary: '++id, &[term+meaningKo], capturedAt, nextReviewAt, mastery',
        phrases: '++id, &[expressionEn+intentKo], capturedAt, nextReviewAt, mastery, type',
        scenarios: '++id, lastUsedAt',
      })
      .upgrade(async (tx) => {
        await tx.table('sessions').toCollection().modify((s: { scenarioKeyExpressions?: unknown[] }) => {
          const arr = s.scenarioKeyExpressions
          if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'string') {
            s.scenarioKeyExpressions = (arr as string[]).map((english) => ({
              speaker: 'partner' as const,
              english,
            }))
          }
        })
      })

    // v4: 페어 모드 N명 + 동기화 — sessionUuid, role, participants 추가
    // partnerName은 deprecated하되 유지 (하위호환)
    this.version(4)
      .stores({
        sessions: '++id, startedAt, endedAt, mode, sessionUuid',
        turns: '++id, sessionId, createdAt',
        vocabulary: '++id, &[term+meaningKo], capturedAt, nextReviewAt, mastery',
        phrases: '++id, &[expressionEn+intentKo], capturedAt, nextReviewAt, mastery, type',
        scenarios: '++id, lastUsedAt',
      })
      .upgrade(async (tx) => {
        // 기존 페어 세션 — partnerName이 있으면 participants로 옮김 (호스트 본인은 닉네임 모르므로 partnerName만)
        await tx.table('sessions').toCollection().modify((s: Session) => {
          if (s.mode === 'pair' && s.partnerName && !s.participants) {
            s.participants = [s.partnerName]
            s.role = 'host' // 기존 단일 디바이스 페어는 모두 호스트로 간주
          }
        })
      })
  }
}

export const db = new ConvoTraceDB()
