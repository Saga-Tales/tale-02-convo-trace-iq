import { db, type PhraseItem, type Session, type Turn } from '@/db/schema'

const ONE_DAY = 24 * 60 * 60 * 1000

/**
 * 다음 회화에 자연스럽게 등장시킬 phrase 선정.
 * - mastery 낮을수록 우선
 * - nextReviewAt 만료될수록 우선
 * - 너무 최근에 캡처된 건 제외 (지난 회화에서 방금 만난 거 또 등장은 부자연)
 */
export async function selectRecallPhrases(
  maxCount: number = 3,
): Promise<PhraseItem[]> {
  const all = await db.phrases.toArray()
  if (all.length === 0) return []

  const now = Date.now()
  const oneHourAgo = now - 60 * 60 * 1000

  // 너무 최근 (1시간 이내) 것 제외
  const eligible = all.filter((p) => p.capturedAt < oneHourAgo)

  function score(p: PhraseItem): number {
    const masteryScore = (10 - p.mastery) * 10 // 0-100
    const overdueDays =
      p.nextReviewAt && p.nextReviewAt < now
        ? (now - p.nextReviewAt) / ONE_DAY
        : 0
    const overdueScore = Math.min(50, overdueDays * 5)
    // 마스터된 것 (>= 8)은 거의 안 뽑음
    if (p.mastery >= 8) return masteryScore + overdueScore - 100
    return masteryScore + overdueScore
  }

  return eligible.sort((a, b) => score(b) - score(a)).slice(0, maxCount)
}

/**
 * 사용자가 실제 회화에서 phrase를 사용했는지 substring 기반 체크.
 * 4글자 이상 키워드의 50% 이상이 user turns에 등장하면 'used' 판정.
 */
export function checkPhraseUsedInTurns(
  phrase: PhraseItem,
  userTurns: Turn[],
): boolean {
  const keywords = extractKeywords(phrase.expressionEn)
  if (keywords.length === 0) return false

  const allUserText = userTurns
    .map((t) => t.content.toLowerCase())
    .join(' ')

  const matched = keywords.filter((w) => allUserText.includes(w))
  return matched.length / keywords.length >= 0.5
}

/**
 * 시나리오 어딘가에 (brief, objectives, keyExpressions, learningGoals)
 * phrase가 등장했는지 체크. 'seen' 판정.
 */
export function checkPhraseSeenInScenario(
  phrase: PhraseItem,
  session: Session,
): boolean {
  const scenarioText = [
    session.scenarioBrief,
    ...(session.scenarioObjectives ?? []),
    ...(session.scenarioKeyExpressions?.map((t) => t.english) ?? []),
    ...(session.scenarioLearningGoals ?? []),
  ]
    .join(' ')
    .toLowerCase()

  const keywords = extractKeywords(phrase.expressionEn)
  if (keywords.length === 0) return false

  const matched = keywords.filter((w) => scenarioText.includes(w))
  return matched.length / keywords.length >= 0.6
}

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z']/g, ''))
    .filter((w) => w.length >= 4)
}

/**
 * 스트릭 — 연속 회화 일수 (오늘 또는 어제부터 시작).
 */
export function calculateStreak(sessions: Session[]): number {
  if (sessions.length === 0) return 0

  const days = new Set(
    sessions.map((s) => new Date(s.startedAt).toDateString()),
  )

  const today = new Date()
  const todayStr = today.toDateString()

  let streak = 0
  const cursor = new Date(today)

  // 오늘 안 했으면 어제부터
  if (!days.has(todayStr)) {
    cursor.setDate(cursor.getDate() - 1)
  }

  while (days.has(cursor.toDateString())) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

export interface MasteryDistribution {
  mastered: number // mastery >= 7
  learning: number // mastery 4-6
  fresh: number // mastery 0-3
  total: number
}

export function calculateMasteryDistribution(
  phrases: PhraseItem[],
): MasteryDistribution {
  let mastered = 0
  let learning = 0
  let fresh = 0
  for (const p of phrases) {
    if (p.mastery >= 7) mastered++
    else if (p.mastery >= 4) learning++
    else fresh++
  }
  return { mastered, learning, fresh, total: phrases.length }
}
