import Dexie, { type Table } from 'dexie'

export type Difficulty = 'beginner' | 'intermediate' | 'advanced'
export type SessionMode = 'solo' | 'pair'
export type PhraseType = 'stuck' | 'new' | 'good'
export type CaptureSource = 'self' | 'imported'
export type ScenarioSource = 'preset' | 'generated' | 'user'

export interface Session {
  id?: number
  scenarioTitle: string
  scenarioBrief: string
  difficulty: Difficulty
  tags: string[] // ['business', 'daily', 'office'] 등
  mode: SessionMode
  partnerName?: string // pair 모드용 자유 텍스트
  startedAt: number
  endedAt: number | null // null = 진행 중
  rating?: number // 1-5
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
  term: string // 영어 단어
  meaningKo: string // 한국어 짧은 정의
  contextSentence?: string // 등장한 문장 통째로
  sessionOrigin?: number
  capturedAt: number
  source: CaptureSource
  mastery: number // 0-5
  lastReviewedAt: number | null
  nextReviewAt: number | null
}

export interface PhraseItem {
  id?: number
  expressionEn: string // 영어 표현
  intentKo: string // 사용자가 표현하고 싶었던 한국어 의도
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

    // v1: 골격 스키마. unique 복합 인덱스로 중복 캡처 방지 (tale-01의 [personId+key] 패턴)
    this.version(1).stores({
      sessions: '++id, startedAt, endedAt, mode',
      turns: '++id, sessionId, createdAt',
      vocabulary:
        '++id, &[term+meaningKo], capturedAt, nextReviewAt, mastery',
      phrases:
        '++id, &[expressionEn+intentKo], capturedAt, nextReviewAt, mastery, type',
      scenarios: '++id, lastUsedAt',
    })
  }
}

export const db = new ConvoTraceDB()
