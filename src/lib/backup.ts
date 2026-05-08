import {
  db,
  type Session,
  type Turn,
  type PhraseItem,
  type VocabItem,
  type ScenarioTemplate,
} from '@/db/schema'
import { getNickname, setNickname } from './profile'

const BACKUP_MAGIC = 'convoTraceBackup'
const CURRENT_SCHEMA_VERSION = 4

export interface BackupFile {
  convoTraceBackup: 1
  exportedAt: number
  schemaVersion: number
  data: BackupData
}

export interface BackupData {
  sessions: Session[]
  turns?: Turn[] // optional — 사이즈 절약
  phrases: PhraseItem[]
  vocabulary: VocabItem[]
  scenarios: ScenarioTemplate[]
  nickname?: string // optional
}

export interface BackupSummary {
  exportedAt: number
  schemaVersion: number
  sessions: number
  turns: number
  phrases: number
  vocabulary: number
  scenarios: number
  hasNickname: boolean
}

export interface ImportResult {
  mode: 'merge' | 'replace'
  sessions: { inserted: number; skipped: number }
  turns: { inserted: number; skipped: number }
  phrases: { inserted: number; skipped: number }
  vocabulary: { inserted: number; skipped: number }
  scenarios: { inserted: number; skipped: number }
  nicknameUpdated: boolean
}

// =============================================================================
// EXPORT
// =============================================================================

export async function buildBackup(opts: {
  includeTurns: boolean
  includeNickname: boolean
}): Promise<BackupFile> {
  const [sessions, phrases, vocabulary, scenarios] = await Promise.all([
    db.sessions.toArray(),
    db.phrases.toArray(),
    db.vocabulary.toArray(),
    db.scenarios.toArray(),
  ])
  const turns = opts.includeTurns ? await db.turns.toArray() : undefined

  const data: BackupData = {
    sessions,
    phrases,
    vocabulary,
    scenarios,
  }
  if (turns) data.turns = turns
  if (opts.includeNickname) {
    const nickname = getNickname()
    if (nickname) data.nickname = nickname
  }

  return {
    convoTraceBackup: 1,
    exportedAt: Date.now(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    data,
  }
}

export function downloadBackup(backup: BackupFile): void {
  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const date = new Date(backup.exportedAt).toISOString().slice(0, 10)
  a.href = url
  a.download = `convo-trace-backup-${date}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// =============================================================================
// IMPORT — Validation
// =============================================================================

/**
 * 백업 파일 파싱 + 형식 검증.
 * schema 호환성 체크는 호출자가 (사용자에게 미리보기 보여줄 때).
 */
export function parseBackupFile(text: string): BackupFile {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('JSON 파싱 실패. 파일이 손상됐거나 백업 파일이 아닙니다.')
  }

  if (!raw || typeof raw !== 'object') {
    throw new Error('백업 파일 형식이 올바르지 않습니다.')
  }
  const r = raw as Record<string, unknown>

  if (r[BACKUP_MAGIC] !== 1) {
    throw new Error(
      `convo-trace 백업 파일이 아닙니다. (magic key '${BACKUP_MAGIC}' 누락)`,
    )
  }

  const exportedAt = r.exportedAt
  if (typeof exportedAt !== 'number') {
    throw new Error('exportedAt 필드 누락')
  }

  const schemaVersion = r.schemaVersion
  if (typeof schemaVersion !== 'number') {
    throw new Error('schemaVersion 필드 누락')
  }

  if (schemaVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `이 백업은 더 새로운 버전(v${schemaVersion})에서 만들어졌습니다. 앱을 업데이트해주세요. 현재 버전: v${CURRENT_SCHEMA_VERSION}`,
    )
  }

  const data = r.data
  if (!data || typeof data !== 'object') {
    throw new Error('data 필드 누락')
  }
  const validatedData = validateBackupData(data, schemaVersion)

  return {
    convoTraceBackup: 1,
    exportedAt,
    schemaVersion,
    data: validatedData,
  }
}

const MAX_ENTRIES = 100000 // sanity cap

function validateBackupData(raw: unknown, _schemaVersion: number): BackupData {
  if (!raw || typeof raw !== 'object') {
    throw new Error('data가 object가 아닙니다.')
  }
  const r = raw as Record<string, unknown>

  const sessions = validateArray<Session>(r.sessions, 'sessions', validateSession)
  const phrases = validateArray<PhraseItem>(r.phrases, 'phrases', validatePhrase)
  const vocabulary = validateArray<VocabItem>(
    r.vocabulary,
    'vocabulary',
    validateVocab,
  )
  const scenarios = validateArray<ScenarioTemplate>(
    r.scenarios,
    'scenarios',
    validateScenario,
  )

  const turns = r.turns
  let validatedTurns: Turn[] | undefined
  if (turns !== undefined) {
    validatedTurns = validateArray<Turn>(turns, 'turns', validateTurn)
  }

  const nickname = r.nickname
  let validatedNickname: string | undefined
  if (nickname !== undefined) {
    if (typeof nickname !== 'string' || nickname.length > 100) {
      throw new Error('nickname 형식 오류')
    }
    validatedNickname = nickname
  }

  return {
    sessions,
    turns: validatedTurns,
    phrases,
    vocabulary,
    scenarios,
    nickname: validatedNickname,
  }
}

function validateArray<T>(
  raw: unknown,
  fieldName: string,
  itemValidator: (item: unknown, index: number) => T,
): T[] {
  if (!Array.isArray(raw)) {
    throw new Error(`${fieldName}가 배열이 아닙니다.`)
  }
  if (raw.length > MAX_ENTRIES) {
    throw new Error(`${fieldName} 항목이 너무 많습니다 (max ${MAX_ENTRIES})`)
  }
  return raw.map((item, i) => itemValidator(item, i))
}

function validateSession(raw: unknown, i: number): Session {
  if (!raw || typeof raw !== 'object')
    throw new Error(`sessions[${i}] object 아님`)
  const r = raw as Record<string, unknown>
  if (typeof r.scenarioTitle !== 'string')
    throw new Error(`sessions[${i}].scenarioTitle 누락`)
  if (typeof r.scenarioBrief !== 'string')
    throw new Error(`sessions[${i}].scenarioBrief 누락`)
  if (typeof r.difficulty !== 'string')
    throw new Error(`sessions[${i}].difficulty 누락`)
  if (!Array.isArray(r.tags))
    throw new Error(`sessions[${i}].tags 배열 아님`)
  if (r.mode !== 'solo' && r.mode !== 'pair')
    throw new Error(`sessions[${i}].mode 형식 오류`)
  if (typeof r.startedAt !== 'number')
    throw new Error(`sessions[${i}].startedAt 누락`)
  // endedAt: number | null
  if (r.endedAt !== null && typeof r.endedAt !== 'number')
    throw new Error(`sessions[${i}].endedAt 형식 오류`)
  return r as unknown as Session
}

function validateTurn(raw: unknown, i: number): Turn {
  if (!raw || typeof raw !== 'object') throw new Error(`turns[${i}] object 아님`)
  const r = raw as Record<string, unknown>
  if (typeof r.sessionId !== 'number')
    throw new Error(`turns[${i}].sessionId 누락`)
  if (r.role !== 'user' && r.role !== 'assistant' && r.role !== 'system')
    throw new Error(`turns[${i}].role 형식 오류`)
  if (typeof r.content !== 'string')
    throw new Error(`turns[${i}].content 누락`)
  if (typeof r.createdAt !== 'number')
    throw new Error(`turns[${i}].createdAt 누락`)
  return r as unknown as Turn
}

function validatePhrase(raw: unknown, i: number): PhraseItem {
  if (!raw || typeof raw !== 'object')
    throw new Error(`phrases[${i}] object 아님`)
  const r = raw as Record<string, unknown>
  if (typeof r.expressionEn !== 'string')
    throw new Error(`phrases[${i}].expressionEn 누락`)
  if (typeof r.intentKo !== 'string')
    throw new Error(`phrases[${i}].intentKo 누락`)
  if (r.type !== 'stuck' && r.type !== 'new' && r.type !== 'good')
    throw new Error(`phrases[${i}].type 형식 오류`)
  if (typeof r.capturedAt !== 'number')
    throw new Error(`phrases[${i}].capturedAt 누락`)
  if (r.source !== 'self' && r.source !== 'imported')
    throw new Error(`phrases[${i}].source 형식 오류`)
  if (typeof r.mastery !== 'number')
    throw new Error(`phrases[${i}].mastery 누락`)
  return r as unknown as PhraseItem
}

function validateVocab(raw: unknown, i: number): VocabItem {
  if (!raw || typeof raw !== 'object')
    throw new Error(`vocabulary[${i}] object 아님`)
  const r = raw as Record<string, unknown>
  if (typeof r.term !== 'string') throw new Error(`vocabulary[${i}].term 누락`)
  if (typeof r.meaningKo !== 'string')
    throw new Error(`vocabulary[${i}].meaningKo 누락`)
  if (typeof r.capturedAt !== 'number')
    throw new Error(`vocabulary[${i}].capturedAt 누락`)
  if (r.source !== 'self' && r.source !== 'imported')
    throw new Error(`vocabulary[${i}].source 형식 오류`)
  if (typeof r.mastery !== 'number')
    throw new Error(`vocabulary[${i}].mastery 누락`)
  return r as unknown as VocabItem
}

function validateScenario(raw: unknown, i: number): ScenarioTemplate {
  if (!raw || typeof raw !== 'object')
    throw new Error(`scenarios[${i}] object 아님`)
  const r = raw as Record<string, unknown>
  if (typeof r.title !== 'string')
    throw new Error(`scenarios[${i}].title 누락`)
  if (typeof r.brief !== 'string')
    throw new Error(`scenarios[${i}].brief 누락`)
  return r as unknown as ScenarioTemplate
}

// =============================================================================
// IMPORT — Apply
// =============================================================================

export function summarizeBackup(backup: BackupFile): BackupSummary {
  return {
    exportedAt: backup.exportedAt,
    schemaVersion: backup.schemaVersion,
    sessions: backup.data.sessions.length,
    turns: backup.data.turns?.length ?? 0,
    phrases: backup.data.phrases.length,
    vocabulary: backup.data.vocabulary.length,
    scenarios: backup.data.scenarios.length,
    hasNickname: !!backup.data.nickname,
  }
}

/**
 * Merge 모드 — 기존 데이터 유지하고 백업과 dedup 머지.
 * - phrases: 복합키 [expressionEn+intentKo] 로 dedup
 * - vocabulary: 복합키 [term+meaningKo] 로 dedup
 * - sessions: 같은 (startedAt + scenarioTitle) 조합이면 skip — sessionId는 dexie가 새로 발급
 * - turns: sessions 매핑이 깨지므로 import 시 turns는 skip (Merge 모드에서)
 *   → Replace 모드일 때만 turns 의미 있음
 * - scenarios: 같은 title이면 skip
 *
 * id는 모두 새로 발급 (dexie의 auto-increment).
 */
export async function importBackupMerge(
  backup: BackupFile,
): Promise<ImportResult> {
  const result: ImportResult = {
    mode: 'merge',
    sessions: { inserted: 0, skipped: 0 },
    turns: { inserted: 0, skipped: 0 },
    phrases: { inserted: 0, skipped: 0 },
    vocabulary: { inserted: 0, skipped: 0 },
    scenarios: { inserted: 0, skipped: 0 },
    nicknameUpdated: false,
  }

  // phrases
  for (const p of backup.data.phrases) {
    const existing = await db.phrases
      .where('[expressionEn+intentKo]')
      .equals([p.expressionEn, p.intentKo])
      .first()
    if (existing) {
      result.phrases.skipped++
      continue
    }
    const { id: _id, ...rest } = p
    void _id
    await db.phrases.add({
      ...rest,
      source: 'imported',
    })
    result.phrases.inserted++
  }

  // vocabulary
  for (const v of backup.data.vocabulary) {
    const existing = await db.vocabulary
      .where('[term+meaningKo]')
      .equals([v.term, v.meaningKo])
      .first()
    if (existing) {
      result.vocabulary.skipped++
      continue
    }
    const { id: _id, ...rest } = v
    void _id
    await db.vocabulary.add({
      ...rest,
      source: 'imported',
    })
    result.vocabulary.inserted++
  }

  // sessions
  const existingSessions = await db.sessions.toArray()
  const sessionKey = (s: Session) => `${s.startedAt}|${s.scenarioTitle}`
  const seenSessions = new Set(existingSessions.map(sessionKey))

  for (const s of backup.data.sessions) {
    if (seenSessions.has(sessionKey(s))) {
      result.sessions.skipped++
      continue
    }
    const { id: _id, ...rest } = s
    void _id
    await db.sessions.add(rest)
    result.sessions.inserted++
  }

  // scenarios
  const existingScenarios = await db.scenarios.toArray()
  const seenScenarioTitles = new Set(existingScenarios.map((s) => s.title))

  for (const sc of backup.data.scenarios) {
    if (seenScenarioTitles.has(sc.title)) {
      result.scenarios.skipped++
      continue
    }
    const { id: _id, ...rest } = sc
    void _id
    await db.scenarios.add(rest)
    result.scenarios.inserted++
  }

  // turns: Merge 모드에서는 sessionId 매핑이 깨지므로 skip
  if (backup.data.turns) {
    result.turns.skipped = backup.data.turns.length
  }

  // nickname
  if (backup.data.nickname && !getNickname()) {
    setNickname(backup.data.nickname)
    result.nicknameUpdated = true
  }

  return result
}

/**
 * Replace 모드 — 모든 데이터 지우고 백업으로 교체.
 * 위험! 사용자가 명시적 확인해야 함.
 */
export async function importBackupReplace(
  backup: BackupFile,
): Promise<ImportResult> {
  const result: ImportResult = {
    mode: 'replace',
    sessions: { inserted: 0, skipped: 0 },
    turns: { inserted: 0, skipped: 0 },
    phrases: { inserted: 0, skipped: 0 },
    vocabulary: { inserted: 0, skipped: 0 },
    scenarios: { inserted: 0, skipped: 0 },
    nicknameUpdated: false,
  }

  await db.transaction(
    'rw',
    [db.sessions, db.turns, db.phrases, db.vocabulary, db.scenarios],
    async () => {
      // 1. 모두 비움
      await Promise.all([
        db.sessions.clear(),
        db.turns.clear(),
        db.phrases.clear(),
        db.vocabulary.clear(),
        db.scenarios.clear(),
      ])

      // 2. sessions 먼저 (id 매핑 위해)
      // 백업의 sessions[i].id → 새 id 매핑 테이블
      const sessionIdMap = new Map<number, number>()
      for (const s of backup.data.sessions) {
        const oldId = s.id
        const { id: _id, ...rest } = s
        void _id
        const newId = await db.sessions.add(rest)
        if (oldId !== undefined) sessionIdMap.set(oldId, newId)
        result.sessions.inserted++
      }

      // 3. turns — sessionId 매핑 적용
      if (backup.data.turns) {
        for (const t of backup.data.turns) {
          const newSessionId = sessionIdMap.get(t.sessionId)
          if (newSessionId === undefined) {
            result.turns.skipped++
            continue
          }
          const { id: _id, ...rest } = t
          void _id
          await db.turns.add({
            ...rest,
            sessionId: newSessionId,
          })
          result.turns.inserted++
        }
      }

      // 4. phrases — sessionOrigin 매핑 적용 (있을 때만)
      for (const p of backup.data.phrases) {
        const { id: _id, ...rest } = p
        void _id
        const mappedSessionOrigin =
          rest.sessionOrigin !== undefined
            ? sessionIdMap.get(rest.sessionOrigin)
            : undefined
        await db.phrases.add({
          ...rest,
          sessionOrigin: mappedSessionOrigin,
        })
        result.phrases.inserted++
      }

      // 5. vocabulary
      for (const v of backup.data.vocabulary) {
        const { id: _id, ...rest } = v
        void _id
        const mappedSessionOrigin =
          rest.sessionOrigin !== undefined
            ? sessionIdMap.get(rest.sessionOrigin)
            : undefined
        await db.vocabulary.add({
          ...rest,
          sessionOrigin: mappedSessionOrigin,
        })
        result.vocabulary.inserted++
      }

      // 6. scenarios
      for (const sc of backup.data.scenarios) {
        const { id: _id, ...rest } = sc
        void _id
        await db.scenarios.add(rest)
        result.scenarios.inserted++
      }
    },
  )

  // nickname
  if (backup.data.nickname) {
    setNickname(backup.data.nickname)
    result.nicknameUpdated = true
  }

  return result
}
