import { db } from '@/db/schema'
import type { CaptureShare } from './share'

export interface MergeResult {
  phrasesInserted: number
  phrasesSkipped: number
  vocabInserted: number
  vocabSkipped: number
}

/**
 * 받은 capture share를 자기 DB에 머지. 복합 unique 인덱스로 dedup.
 * sessionOrigin은 의도적으로 비움 (다른 디바이스의 sessionId라 의미 없음).
 * 자기 sessionId를 sessionOrigin으로 넣을 수도 있지만, 헷갈림. import는 source='imported'로만 표시.
 */
export async function mergeCaptureShare(
  share: CaptureShare,
  ownSessionId?: number,
): Promise<MergeResult> {
  let phrasesInserted = 0
  let phrasesSkipped = 0
  let vocabInserted = 0
  let vocabSkipped = 0

  for (const p of share.phrases) {
    const existing = await db.phrases
      .where('[expressionEn+intentKo]')
      .equals([p.expressionEn, p.intentKo])
      .first()
    if (existing) {
      phrasesSkipped++
      continue
    }
    await db.phrases.add({
      expressionEn: p.expressionEn,
      intentKo: p.intentKo,
      type: p.type,
      sessionOrigin: ownSessionId,
      capturedAt: p.capturedAt,
      source: 'imported',
      mastery: 0,
      lastReviewedAt: null,
      nextReviewAt: null,
    })
    phrasesInserted++
  }

  for (const v of share.vocabulary) {
    const existing = await db.vocabulary
      .where('[term+meaningKo]')
      .equals([v.term, v.meaningKo])
      .first()
    if (existing) {
      vocabSkipped++
      continue
    }
    await db.vocabulary.add({
      term: v.term,
      meaningKo: v.meaningKo,
      contextSentence: v.contextSentence,
      sessionOrigin: ownSessionId,
      capturedAt: v.capturedAt,
      source: 'imported',
      mastery: 0,
      lastReviewedAt: null,
      nextReviewAt: null,
    })
    vocabInserted++
  }

  return { phrasesInserted, phrasesSkipped, vocabInserted, vocabSkipped }
}
