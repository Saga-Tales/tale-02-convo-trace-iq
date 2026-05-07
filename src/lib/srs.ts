import { db } from '@/db/schema'

export type ReviewQuality = 'used' | 'seen' | 'forgot'

export interface ReviewResult {
  newMastery: number
  nextReviewAt: number
}

const ONE_DAY = 24 * 60 * 60 * 1000

/**
 * 단순화된 SRS — SM-2 spirit를 따르되 mastery 0-10 단일 스케일.
 * - 'used'  : 사용자가 회화에서 실제로 사용 → mastery +2
 * - 'seen'  : 시나리오에 등장만 했고 사용자는 안 씀 → mastery +1
 * - 'forgot': 명시적 "기억 안 남" → mastery -1
 *
 * intervalDays는 mastery에 비례. mastery 10이면 ~15일 간격.
 */
export function applyReview(
  currentMastery: number,
  quality: ReviewQuality,
): ReviewResult {
  let newMastery = currentMastery
  let intervalDays: number

  switch (quality) {
    case 'used':
      newMastery = Math.min(10, currentMastery + 2)
      intervalDays = Math.max(1, newMastery * 1.5)
      break
    case 'seen':
      newMastery = Math.min(10, currentMastery + 1)
      intervalDays = Math.max(1, newMastery * 0.7)
      break
    case 'forgot':
      newMastery = Math.max(0, currentMastery - 1)
      intervalDays = 1
      break
  }

  const nextReviewAt = Date.now() + intervalDays * ONE_DAY
  return { newMastery, nextReviewAt }
}

export async function reviewPhrase(
  phraseId: number,
  quality: ReviewQuality,
): Promise<void> {
  const phrase = await db.phrases.get(phraseId)
  if (!phrase) return
  const { newMastery, nextReviewAt } = applyReview(phrase.mastery, quality)
  await db.phrases.update(phraseId, {
    mastery: newMastery,
    lastReviewedAt: Date.now(),
    nextReviewAt,
  })
}

export async function reviewVocab(
  vocabId: number,
  quality: ReviewQuality,
): Promise<void> {
  const v = await db.vocabulary.get(vocabId)
  if (!v) return
  const { newMastery, nextReviewAt } = applyReview(v.mastery, quality)
  await db.vocabulary.update(vocabId, {
    mastery: newMastery,
    lastReviewedAt: Date.now(),
    nextReviewAt,
  })
}

export type MasteryLabel = '새로 학습' | '익숙해지는 중' | '마스터'

export function masteryLabel(mastery: number): MasteryLabel {
  if (mastery >= 7) return '마스터'
  if (mastery >= 4) return '익숙해지는 중'
  return '새로 학습'
}
