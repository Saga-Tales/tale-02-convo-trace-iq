import { callOnce } from './anthropic'
import type { Difficulty, DialogTurn, SessionMode } from '@/db/schema'

export interface Scenario {
  title: string
  brief: string
  userRole: string
  aiRole: string
  objectives: string[]
  keyExpressions: DialogTurn[]
  learningGoals: string[]
  openingLine: string
}

export interface RecallPhraseHint {
  english: string
  intentKo: string
}

const SOLO_MODE_GUIDE = `
# 솔로 모드
사용자가 AI(partner)와 1:1로 회화. AI가 회화를 자연스럽게 이끌어감.

- keyExpressions: 5-8 turns. 회화 흐름 파악용 짧은 가이드.
- 각 turn은 1-2 짧은 문장.
`

const PAIR_MODE_GUIDE = `
# 페어 모드
두 사람이 디바이스 없이 직접 음성으로 회화 (AI는 시나리오만 만듦).
영어 회화 동아리에서 페어 (또는 4인 그룹의 페어 단위) 진행.

## 시나리오 형식은 상황에 따라 다르게
시나리오 형식과 길이는 상황·카테고리·맥락에 자연스럽게 맞춰야 함. 일률적 cookie cutter X.

### 상황별 자연스러운 분량 가이드
- **거래성 회화** (쇼핑·식당·점원): 10-20 turns. 명확한 단계, 짧고 실용적.
- **인사·짧은 만남** (지나가다 만난 동료): 10-15 turns.
- **친구 카페 잡담**: 20-35 turns. 자유로운 흐름, 화제 자연스럽게 변경.
- **면접·인터뷰**: 25-40 turns. 한쪽이 주로 질문, 다른쪽이 답변·부연.
- **깊은 토론·storytelling**: 35-50 turns. 한쪽이 길게 풀고 후속 질문, 의견 차이.
- **비즈니스 협상·미팅**: 25-40 turns. 명확한 의제, 입장 차이.

상황이 짧으면 짧게, 깊으면 깊게. 사용자의 hint나 카테고리 보고 자연스러운 분량 결정.

## Dialogue 흐름 (참고용 권장 구조 — 강제 X)
긴 회화 (25+ turns) 의 경우 자연스럽게 4 phase로 흐르면 좋음:
- **Opening**: 인사·근황·분위기 설정
- **Main exchange**: 본 주제 깊이 들어가기
- **Development**: 전개 변화·plot twist·의견 차이
- **Closing**: 마무리·다음 약속

짧은 거래 회화 (10-20 turns) 는 Opening + 거래 + Closing 정도로도 충분. 무리하게 4 phase 안 쓸 것.

## 정보 비대칭 — 깊이의 핵심
긴 회화일수록 두 역할이 각자 다른 정보·입장·맥락을 가져야 함:
- 한쪽이 새로운 경험·계획 공유, 다른쪽이 점점 깊은 질문
- 또는 두 사람의 입장 차이 (예: 도시 vs 시골 선호, 모험 vs 안정)
- 단순 정보 교환 X — 감정·이유·미래 계획까지

짧은 거래 회화는 정보 비대칭이 명확함 (점원 vs 손님 등) — 이건 자연스러우니 OK.

## 두 역할 균형
두 역할(userRole, aiRole)이 균형 있게 등장. 한쪽이 압도적이면 안 됨.
정확히 50:50일 필요는 없지만 한쪽이 80% 이상은 X.

## 동아리 컨텍스트
시나리오는 페어가 ②③ 두 번 (역할 바꿔서) 진행할 수 있어야 함.
양쪽 입장 모두 학습 가치 있게.
누가 어떤 역할 맡을지는 페어가 자유 결정. 이름 없는 역할 (예: '대학 친구', '점원')으로.
`

function buildSystemPrompt(mode: SessionMode): string {
  return `너는 영어 회화 학습 도구의 시나리오 생성기다.
사용자가 시나리오를 보면서 회화를 따라할 수 있도록 충분한 가이드를 제공해야 한다.
${mode === 'pair' ? PAIR_MODE_GUIDE : SOLO_MODE_GUIDE}

응답은 반드시 아래 JSON 형식으로만 (markdown 백틱 X, 설명 X, JSON 외 텍스트 X):

{
  "title": "짧은 한국어 제목 (10자 이내)",
  "brief": "상황 묘사 (한국어, 4-6문장). 어디서, 누구와, 어떤 분위기인지, 왜 이 회화가 시작됐는지 구체적으로.",
  "userRole": "${mode === 'pair' ? '한 명이 맡을 역할 (한국어, 짧게, 일반명사 — 예: 대학 친구, 점원)' : '사용자가 맡을 역할 (한국어, 짧게)'}",
  "aiRole": "${mode === 'pair' ? '다른 한 명이 맡을 역할 (한국어, 짧게, 일반명사)' : 'AI가 맡을 역할 (한국어, 짧게)'}",
  "objectives": ["회화 진행 단계 (한국어, 짧게)", "..."],
  "keyExpressions": [
    {"speaker": "partner", "english": "Hi, glad you could make it.", "intentKo": "환영 인사"},
    {"speaker": "user", "english": "Thanks for having me.", "intentKo": "초대해줘서 감사"}
  ],
  "learningGoals": ["만나게 될 표현·단어 (한국어, 짧게)", "..."],
  "openingLine": "${mode === 'pair' ? 'aiRole의 첫 발화 (1-2문장)' : 'AI가 회화를 여는 첫 영어 문장 (1-2문장)'}"
}

규칙:
- brief: 단순 상황만 던지지 말고 분위기·배경·동기까지. 사용자가 시나리오만 읽어도 회화 흐름이 그려지게.
- objectives: 3-5개. 회화가 어떻게 흘러갈지 단계별 가이드.
- keyExpressions:
  * speaker는 정확히 'user' 또는 'partner'.
  * 첫 turn은 보통 partner부터 시작 (openingLine과 자연스럽게 이어지게).
  * intentKo는 한국어로 그 turn의 의도를 짧게 (1줄, 30자 이내).
  * 사용자가 "내 차례에 뭘 말해야 하지?" 알 수 있게 user turn에 자연스러운 대답 패턴.
- learningGoals: 2-4개. 만나게 될 표현·단어를 한국어로 짧게.
- 난이도에 맞는 어휘 수준
- 일상적이고 실용적인 상황만`
}

const DIFFICULTY_HINT: Record<Difficulty, string> = {
  A1: 'A1 입문 — 기본 인사, 단순 자기소개, 한 단어 또는 짧은 문장 위주',
  A2: 'A2 기초 — 일상 어휘, 짧은 문장, 단순 과거/현재 시제',
  'A2+': 'A2+ 초중급 — 익숙한 주제 일상 대화 가능',
  B1: 'B1 중하급 — 익숙한 주제 표현, 간단한 의견 제시',
  'B1+': 'B1+ 중급 — 다양한 주제 토론 가능, 자연스러운 회화 표현',
  B2: 'B2 중상급 — 복잡한 주제, 추상적 개념, 가끔 관용 표현',
  C1: 'C1 상급 — 정교한 표현, 비유, 문화적 뉘앙스',
  'C1+': 'C1+ 고급 — 거의 원어민 수준, 미묘한 차이 구분',
  C2: 'C2 최상급 — 원어민 수준, 모든 주제 자유롭게',
}

const TAG_KO: Record<string, string> = {
  business: '비즈니스 (미팅, 협상, 프레젠테이션)',
  daily: '일상 (카페, 친구, 가족)',
  office: '사무실 (동료, 잡담, 출근)',
  shopping: '쇼핑 (옷가게, 마트, 점원과의 대화)',
  travel: '여행 (공항, 호텔, 길 묻기)',
  cafe: '카페·음식점 (주문, 추천, 결제)',
}

export async function generateScenario(opts: {
  difficulty: Difficulty
  tags: string[]
  hint: string
  recallPhrases?: RecallPhraseHint[]
  mode: SessionMode
}): Promise<Scenario> {
  const tagDesc =
    opts.tags.length > 0
      ? opts.tags.map((t) => TAG_KO[t] ?? t).join(', ')
      : '제한 없음'

  const recallSection =
    opts.recallPhrases && opts.recallPhrases.length > 0
      ? `\n\n학습 중인 표현 (가능하면 자연스럽게 1-2개를 시나리오 흐름에 녹일 것; 강제 X — 시나리오와 안 맞으면 무시):
${opts.recallPhrases
  .map((p, i) => `${i + 1}. "${p.english}" — ${p.intentKo}`)
  .join('\n')}

위 표현은 keyExpressions의 turn이나 objectives, brief 어디든 자연스럽게 등장시키면 됩니다. 어색하게 끼워넣지 말고 시나리오 흐름이 우선.`
      : ''

  const userPrompt = `난이도: ${opts.difficulty} (${DIFFICULTY_HINT[opts.difficulty]})
카테고리: ${tagDesc}
모드: ${opts.mode === 'pair' ? '페어 (사람 두 명이 직접 음성 회화, 동아리 페어 활동)' : '솔로 (AI와 1:1)'}
추가 요청: ${opts.hint || '(없음)'}${recallSection}

위 조건에 맞는 시나리오 1개를 JSON으로 생성.${
    opts.mode === 'pair'
      ? `

페어 모드 가이드:
- 카테고리·hint·상황에 자연스러운 분량으로 (거래 회화면 짧게 10-20 turns, 깊은 회화면 35-50 turns).
- 두 역할(userRole, aiRole)은 이름 없는 일반명사로 (예: '대학 친구', '점원').
- 두 역할이 균형 있게 등장 (한쪽 80% 이상 X).`
      : ''
  }`

  const text = await callOnce({
    system: buildSystemPrompt(opts.mode),
    user: userPrompt,
    maxTokens: opts.mode === 'pair' ? 7000 : 2000,
  })

  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(
      `시나리오 응답이 JSON 형식이 아닙니다.\n원문: ${text.slice(0, 120)}...`,
    )
  }

  return validateScenario(parsed, opts.mode)
}

function validateScenario(raw: unknown, mode: SessionMode): Scenario {
  if (!raw || typeof raw !== 'object') {
    throw new Error('시나리오 형식이 올바르지 않습니다.')
  }
  const r = raw as Record<string, unknown>

  const title = r.title
  if (typeof title !== 'string' || title.length < 1 || title.length > 30) {
    throw new Error(`title 검증 실패 (1-30자)`)
  }

  const brief = r.brief
  if (typeof brief !== 'string' || brief.length < 30 || brief.length > 2000) {
    throw new Error(
      `brief 검증 실패 (30-2000자, 받음 ${typeof brief === 'string' ? brief.length : 'non-string'}자)`,
    )
  }

  const userRole = r.userRole
  if (typeof userRole !== 'string' || userRole.length < 1 || userRole.length > 100) {
    throw new Error('userRole 검증 실패 (1-100자)')
  }

  const aiRole = r.aiRole
  if (typeof aiRole !== 'string' || aiRole.length < 1 || aiRole.length > 100) {
    throw new Error('aiRole 검증 실패 (1-100자)')
  }

  const objectives = r.objectives
  if (
    !Array.isArray(objectives) ||
    objectives.length < 2 ||
    objectives.length > 7
  ) {
    throw new Error(
      `objectives 검증 실패 (2-7개, 받음 ${Array.isArray(objectives) ? objectives.length : 'non-array'}개)`,
    )
  }
  if (!objectives.every((o) => typeof o === 'string' && o.length > 0 && o.length < 200)) {
    throw new Error('objectives 항목 검증 실패')
  }

  // 모드별 keyExpressions 길이 cap
  // - 솔로: 5-10 turns (AI streaming 회화 흐름 가이드)
  // - 페어: 8-50 turns (상황별 자연스러운 분량 — 거래 회화부터 깊은 토론까지)
  const keyExpressions = r.keyExpressions
  const minTurns = mode === 'pair' ? 8 : 3
  const maxTurns = mode === 'pair' ? 50 : 10
  if (
    !Array.isArray(keyExpressions) ||
    keyExpressions.length < minTurns ||
    keyExpressions.length > maxTurns
  ) {
    throw new Error(
      `keyExpressions 검증 실패 (${minTurns}-${maxTurns} turns, 받음 ${Array.isArray(keyExpressions) ? keyExpressions.length : 'non-array'}개)`,
    )
  }
  const dialogTurns: DialogTurn[] = []
  for (let i = 0; i < keyExpressions.length; i++) {
    const t = keyExpressions[i]
    if (!t || typeof t !== 'object') {
      throw new Error(`keyExpressions[${i}] object 아님`)
    }
    const tt = t as Record<string, unknown>
    const speaker = tt.speaker
    if (speaker !== 'user' && speaker !== 'partner') {
      throw new Error(
        `keyExpressions[${i}].speaker 검증 실패 (user|partner, 받음 ${JSON.stringify(speaker)})`,
      )
    }
    const english = tt.english
    if (typeof english !== 'string' || english.length < 1 || english.length > 250) {
      throw new Error(`keyExpressions[${i}].english 검증 실패 (1-250자)`)
    }
    let intentKo: string | undefined
    if (tt.intentKo !== undefined && tt.intentKo !== null && tt.intentKo !== '') {
      if (typeof tt.intentKo !== 'string' || tt.intentKo.length > 100) {
        throw new Error(`keyExpressions[${i}].intentKo 검증 실패 (string, max 100자)`)
      }
      intentKo = tt.intentKo
    }
    dialogTurns.push({ speaker, english, intentKo })
  }

  // 페어 모드 균형 검증 — 한쪽이 80% 이상 차지하면 reject (압도 방지)
  // 정확한 50:50은 강제 X. 다양한 형식 (인터뷰는 한쪽이 주로 질문 등) 허용.
  if (mode === 'pair') {
    const userTurns = dialogTurns.filter((t) => t.speaker === 'user').length
    const partnerTurns = dialogTurns.filter((t) => t.speaker === 'partner').length
    const total = dialogTurns.length
    const userRatio = userTurns / total
    const partnerRatio = partnerTurns / total
    if (userRatio > 0.8 || partnerRatio > 0.8) {
      throw new Error(
        `페어 모드 두 역할 균형 실패 (한쪽이 80% 이상 차지: user ${userTurns}/${total}, partner ${partnerTurns}/${total})`,
      )
    }
  }

  const learningGoals = r.learningGoals
  if (
    !Array.isArray(learningGoals) ||
    learningGoals.length < 1 ||
    learningGoals.length > 6
  ) {
    throw new Error('learningGoals 검증 실패 (1-6개)')
  }
  if (
    !learningGoals.every(
      (g) => typeof g === 'string' && g.length > 0 && g.length < 200,
    )
  ) {
    throw new Error('learningGoals 항목 검증 실패')
  }

  const openingLine = r.openingLine
  if (
    typeof openingLine !== 'string' ||
    openingLine.length < 1 ||
    openingLine.length > 500
  ) {
    throw new Error('openingLine 검증 실패 (1-500자)')
  }

  return {
    title,
    brief,
    userRole,
    aiRole,
    objectives: objectives as string[],
    keyExpressions: dialogTurns,
    learningGoals: learningGoals as string[],
    openingLine,
  }
}
