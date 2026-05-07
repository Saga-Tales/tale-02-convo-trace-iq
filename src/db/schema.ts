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
export type PhraseType = 'stuck' | 'new' | 'good'
export type CaptureSource = 'self' | 'imported'
export type ScenarioSource = 'preset' | 'generated' | 'user'

/** 시나리오 예시 대화의 한 턴 — 누가 말하는지 + 영어 문장 + 선택적 한국어 의도 */
export interface DialogTurn {
  speaker: 'user' | 'partner'
  english: string
  intentKo?: string
}

export interface Session {
  id?: number
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

    // v1: 골격
    this.version(1).stores({
      sessions: '++id, startedAt, endedAt, mode',
      turns: '++id, sessionId, createdAt',
      vocabulary:
        '++id, &[term+meaningKo], capturedAt, nextReviewAt, mastery',
      phrases:
        '++id, &[expressionEn+intentKo], capturedAt, nextReviewAt, mastery, type',
      scenarios: '++id, lastUsedAt',
    })

    // v2: difficulty 라벨을 CEFR 코드로 마이그레이션
    this.version(2)
      .stores({
        sessions: '++id, startedAt, endedAt, mode',
        turns: '++id, sessionId, createdAt',
        vocabulary:
          '++id, &[term+meaningKo], capturedAt, nextReviewAt, mastery',
        phrases:
          '++id, &[expressionEn+intentKo], capturedAt, nextReviewAt, mastery, type',
        scenarios: '++id, lastUsedAt',
      })
      .upgrade(async (tx) => {
        const map: Record<string, Difficulty> = {
          beginner: 'A2',
          intermediate: 'B1+',
          advanced: 'C1+',
        }
        await tx
          .table('sessions')
          .toCollection()
          .modify((s: { difficulty: string }) => {
            if (s.difficulty in map) s.difficulty = map[s.difficulty]
          })
        await tx
          .table('scenarios')
          .toCollection()
          .modify((s: { difficulty: string }) => {
            if (s.difficulty in map) s.difficulty = map[s.difficulty]
          })
      })

    // v3: scenarioKeyExpressions: string[] → DialogTurn[]
    // (이전엔 영어 문장 배열이었지만 이제 화자가 있는 dialog turn 배열)
    this.version(3)
      .stores({
        sessions: '++id, startedAt, endedAt, mode',
        turns: '++id, sessionId, createdAt',
        vocabulary:
          '++id, &[term+meaningKo], capturedAt, nextReviewAt, mastery',
        phrases:
          '++id, &[expressionEn+intentKo], capturedAt, nextReviewAt, mastery, type',
        scenarios: '++id, lastUsedAt',
      })
      .upgrade(async (tx) => {
        await tx
          .table('sessions')
          .toCollection()
          .modify((s: { scenarioKeyExpressions?: unknown[] }) => {
            const arr = s.scenarioKeyExpressions
            if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'string') {
              s.scenarioKeyExpressions = (arr as string[]).map((english) => ({
                speaker: 'partner' as const,
                english,
              }))
            }
          })
      })
  }
}

export const db = new ConvoTraceDB()
