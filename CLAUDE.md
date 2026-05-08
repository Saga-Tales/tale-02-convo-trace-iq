# CLAUDE.md — convo·trace 작업 컨텍스트

> 이 파일은 Claude Code (또는 IQ 본인) 가 새 세션에서 이 프로젝트를 즉시 picking up하기 위한 마스터 컨텍스트.
> README는 외부 청자용 (무엇·왜·사용법). 이 파일은 **작업 컨텍스트** (어떻게 작업·왜 이 결정·다음 어디로).

**마지막 업데이트**: 2026-05-08 (마이크로 fix #3 직후)

---

## 프로젝트 한눈에

영어 회화 학습 모먼트 박제 도구. **Saga-Tales venture studio의 두 번째 tale.**
ChatGPT/Claude로 회화하면 끝나면 다 휘발된다는 페인을 직접 해결. 핵심 차별화는 **회상 폐쇄 루프** — 박제된 표현이 다음 회화에 자연스럽게 다시 등장.

- **로컬 위치**: `/Users/ibm514/Saga-Tales/tale-02-convo-trace-iq`
- **GitHub**: https://github.com/Saga-Tales/tale-02-convo-trace-iq
- **Live**: https://saga-tales.github.io/tale-02-convo-trace-iq/
- **Studio prologue**: https://github.com/Saga-Tales/prologue
- **Tale-01 참조**: `/Users/ibm514/Saga-Tales/tale-01-personal-diary-iq`

---

## 즉시 시작

### 개발

```bash
cd /Users/ibm514/Saga-Tales/tale-02-convo-trace-iq
npm install      # .npmrc에 ignore-scripts=true (native binary 스킵)
npm run dev      # http://localhost:5173/tale-02-convo-trace-iq/
```

### 빌드 검증 (zip 만들기 전 필수)

```bash
npx tsc -b       # 타입체크 — 에러 0개여야 함
npx vite build   # production 빌드 — 성공해야 함 (warning은 OK)
```

### Saga-Tales 표준 한 사이클 (Anthropic Claude → 사용자 전달)

```bash
# Claude가 작업 후 zip 생성:
cd /home/claude/tale-02-convo-trace-iq && rm -rf node_modules dist *.tsbuildinfo
cd /home/claude && rm -f tale-02-convo-trace-iq.zip
zip -r tale-02-convo-trace-iq.zip tale-02-convo-trace-iq -x "*.DS_Store" "*/node_modules/*" "*/dist/*"
mv tale-02-convo-trace-iq.zip /mnt/user-data/outputs/
# present_files로 사용자에게 전달

# 사용자가 받은 후 로컬에서:
cd /Users/ibm514/Saga-Tales/tale-02-convo-trace-iq && git status
unzip -q ~/Downloads/tale-02-convo-trace-iq.zip -d ~/Downloads/ \
  && cp -R ~/Downloads/tale-02-convo-trace-iq/. /Users/ibm514/Saga-Tales/tale-02-convo-trace-iq/ \
  && rm -rf ~/Downloads/tale-02-convo-trace-iq && rm -f ~/Downloads/tale-02-convo-trace-iq.zip
npm install && npm run dev
git add . && git commit -m "..." && git push
```

**커밋 메시지는 한국어로** (tale-01의 영어 컨벤션과 다름).

---

## 현재 상태

### 완성된 사이클

#### 초기 7일 — 기능 완성
- **Day 1**: Vite + React + TypeScript + Tailwind v4 + IndexedDB schema + BYOK + GH Pages
- **Day 2**: 시나리오 생성 + 솔로/페어 + streaming 회화 + 활성 세션 복구 + CEFR 9단계
- **Day 3**: 캡처 (페인 1·2) — ko→en 모달 + 단어 lookup + DialogTurn 구조 + 닉네임
- **Day 4**: 자동 추출 (페인 3) + 디자인 v2 — vibrant pink 리뉴얼
- **Day 5**: 회상 폐쇄 루프 (페인 4) — selectRecallPhrases + 자동 mastery 업데이트 + SM-2 단순화
- **Day 6**: N명 페어 + QR 동기화 — sessionUuid·role·participants + 호스트 중심 모델
- **Day 7**: PWA + JSON 백업 — vite-plugin-pwa + Merge/Replace

#### 마이크로 fix
- **#1**: 페어 라벨 버그 + 시나리오 quality + PairSessionView 동아리 4단계 가이드
- **#2**: PWA 설치 UX — `beforeinstallprompt` 활용 + 플랫폼별 분기
- **#3**: 페어 시나리오 자율성 풀기 — 25-40 강제 → 8-50 LLM 자율 + 4-phase 강제 → 권장

### 빌드 사이즈 (현재)
- 176 modules, gzip 161KB
- qr-scanner worker 별도 10KB
- PWA precache 18 entries (~625 KB)

---

## 아키텍처 한눈에

### 디렉토리

```
src/
├── App.tsx                       # 라우터 + nav (로고 → 홈)
├── main.tsx                      # React entry, ErrorBoundary, basename
├── index.css                     # Tailwind v4 + 디자인 토큰 v2
│
├── db/schema.ts                  # Dexie v4 + 마이그레이션 v1→v4
│
├── lib/
│   ├── anthropic.ts              # BYOK + callOnce + callStreaming
│   ├── scenario.ts               # generateScenario + mode별 prompt + recall hint 주입
│   ├── conversation.ts           # startSession (sessionUuid/role/participants) + endSession
│   ├── capture.ts                # askKoToEn + lookupWord (Day 3)
│   ├── extractor.ts              # 회화 종료 후 자동 표현 추출 (Day 4)
│   ├── recall.ts                 # selectRecallPhrases + check 함수들 + mastery 분포 (Day 5)
│   ├── srs.ts                    # SM-2 단순화 — applyReview + masteryLabel (Day 5)
│   ├── share.ts                  # QRPayload + pako gzip + magic 'CT1' (Day 6)
│   ├── sync.ts                   # mergeCaptureShare — 받은 share dedup 머지 (Day 6)
│   ├── backup.ts                 # JSON export/import + Merge/Replace (Day 7)
│   ├── pwa.ts                    # usePWAInstall + detectPlatform (마이크로 #2)
│   └── profile.ts                # 닉네임 (localStorage)
│
├── components/
│   ├── ApiKeyGate.tsx            # API 키 없으면 입력 강제
│   ├── ErrorBoundary.tsx
│   ├── ScenarioSetup.tsx         # 모드/난이도/카테고리/페어 참여자
│   ├── ScenarioPreview.tsx       # 시나리오 미리보기 + phase 마커 + 호스트 'QR 공유'
│   ├── ScenarioPanel.tsx         # 회화 중 collapsible 시나리오 가이드
│   ├── ChatView.tsx              # 솔로 회화 — streaming + 캡처 도구 인라인
│   ├── PairSessionView.tsx       # 페어 회화 — 동아리 4단계 가이드 + 캡처
│   ├── SessionEndDialog.tsx      # rating + note
│   ├── ExtractionResults.tsx     # 자동 추출 keep/discard
│   ├── AskKoreanModal.tsx        # 페인 1
│   ├── WordLookupModal.tsx       # 페인 2
│   ├── QRCodeView.tsx
│   ├── QRScanner.tsx
│   ├── ShareScenarioModal.tsx
│   ├── JoinByQRModal.tsx
│   ├── PairSyncModal.tsx         # 호스트/게스트 분기 멀티 step
│   └── BackupSection.tsx
│
└── pages/
    ├── Home.tsx                  # 스트릭 + 회상 예고 + mastery 분포 bar
    ├── Chat.tsx                  # 호스트/게스트 흐름 분기 + state machine
    ├── Sessions.tsx              # 전체 회화 기록 (페어·호스트·N명 표시)
    ├── Vocab.tsx                 # 표현·단어 탭 + mastery 라벨
    └── Settings.tsx              # 닉네임 + API 키 + BackupSection + PWA 설치
```

### 데이터 모델 (Dexie v4)

```typescript
// 핵심 테이블
sessions: '++id, startedAt, endedAt, mode, sessionUuid'
turns: '++id, sessionId, createdAt'
vocabulary: '++id, &[term+meaningKo], capturedAt, nextReviewAt, mastery'
phrases: '++id, &[expressionEn+intentKo], capturedAt, nextReviewAt, mastery, type'
scenarios: '++id, lastUsedAt'

// 복합 unique 인덱스 (& prefix)로 dedup 강제
// — 같은 phrase/vocab 두 번 박제하면 자동 reject
```

#### Session 핵심 필드 (페어 모델)
```typescript
interface Session {
  sessionUuid?: string         // 페어 매칭 UUID (crypto.randomUUID)
  role?: 'host' | 'guest'
  participants?: string[]      // 호스트 자신 외 N-1명
  scenarioKeyExpressions?: DialogTurn[]  // {speaker: 'user'|'partner', english, intentKo}
  mode: 'solo' | 'pair'
  partnerName?: string         // @deprecated, 하위호환만
  // ... rest
}
```

#### Dexie 마이그레이션 history
- v1: 초기
- v2: difficulty `beginner/intermediate/advanced` → CEFR `A1`–`C2` 9단계
- v3: scenarioKeyExpressions `string[]` → `DialogTurn[]`
- v4: sessionUuid 인덱스 + role + participants 추가, 기존 페어 `partnerName` → `participants=[partnerName]` + `role='host'`

---

## 핵심 메커니즘 (Claude가 변경 시 알아야 할 것)

### 1. 회상 폐쇄 루프 — tale-02의 핵심 차별화

```
[회화 #1] phrase 박제 → mastery=0
       ↓
[회화 #2 시작] selectRecallPhrases (mastery 낮고 nextReviewAt 만료된 top 3)
       ↓
[scenario.ts prompt] recallPhrases를 hint로 주입 ("강제 X, 자연스럽게")
       ↓
[LLM이 시나리오에 자연스럽게 녹임]
       ↓
[회화 진행]
       ↓
[종료 후 자동 mastery 업데이트]
  - user turns에 키워드 50% 매칭 → 'used' (mastery +2)
  - 시나리오 텍스트 60% 매칭 → 'seen' (mastery +1)
  - 둘 다 X → 변화 없음
```

**변경 시 절대 지킬 것**:
- ❌ LLM 호출 추가하지 말 것 (substring keyword match가 본질, 비용/지연 회피)
- ❌ 명시적 review UI 추가하지 말 것 (자동 폐쇄 루프가 본질)
- ❌ "한 주 누적 리뷰 페이지" 만들지 말 것 (회상이 이미 누적 리뷰 역할 — **사용자 명시적 결정**)
- ✓ 1시간 이내 캡처는 회상 후보 제외 유지 (자연스러움 보장)
- ✓ SM-2는 단순화 형태 유지 (mastery 0-10 + nextReviewAt만)

### 2. 페어 모드 호스트 중심 동기화

3명 시 4번 스캔 (양방향 P2P 6번 대비 절약):

```
시작:    호스트 QR → 게스트 N-1명 찍음        (N-1번)
회화:    음성 직접 회화, 각자 디바이스 캡처
종료:    게스트 N-1명 자기 캡처 QR → 호스트   (N-1번)
         호스트 통합본 QR → 게스트 N-1명 찍음 (N-1번)
종료 동기화 합계: 2(N-1)번
```

**핵심 결정 — 변경 시 주의**:
- ❌ 양방향 P2P로 회귀하지 말 것 (N(N-1) → 2(N-1) 트레이드오프 깨짐)
- ❌ QR 페이로드에 압축 없이 raw JSON 넣지 말 것 (4KB 한도 초과)
- ✓ pako gzip + base64 + magic prefix 'CT1' 유지
- ✓ MAX_ITEMS=50 cap 유지
- ✓ sessionUuid 매칭 검증으로 다른 회화 QR 잘못 찍기 방지
- ✓ 받은 share는 `[expressionEn+intentKo]` 복합 unique 인덱스로 dedup, `source='imported'` 마킹

### 3. 페어 시나리오 자율성 (마이크로 #3 결정)

**이전엔 25-40 turns + 4-phase 강제 → cookie cutter였음**.
**현재**: 8-50 turns LLM 자율 + 4-phase는 긴 회화 (20+ turns) 권장.

scenario.ts 핵심:
- `validateScenario(raw, mode)` — mode별 다른 cap
  - 솔로: 3-10 turns
  - 페어: 8-50 turns
- 균형 검증: 한쪽 80% 이상만 reject (인터뷰 형식 70:30 등 허용)
- prompt에 **상황별 권장 분량** 명시:
  - 거래성 회화 10-20 / 친구 잡담 20-35 / 면접 25-40 / 깊은 토론 35-50

**변경 시 주의**:
- ❌ 강제 cap 다시 좁히지 말 것 (cookie cutter 방지)
- ❌ 4-phase 모든 페어에 강제하지 말 것 (짧은 거래 회화엔 부자연)
- ✓ LLM이 카테고리/hint 보고 자율 결정하도록 유지
- ✓ ScenarioPreview의 phase 마커는 20+ turns 한정 표시
- ✓ max-h scroll은 15+ turns일 때만

### 4. BYOK + serverless

- API 키는 `localStorage` (`convo-trace-api-key`)
- 모든 데이터는 IndexedDB (Dexie)
- 백엔드 서버 없음, 분석/트래킹 없음, 광고 없음
- 외부 통신: Anthropic API + Google Fonts/jsdelivr CDN만

**변경 시 절대 지킬 것**:
- ❌ 백엔드 서버 추가하지 말 것 (BYOK 원칙 깨뜨림)
- ❌ 사용자 데이터 외부로 전송하지 말 것
- ❌ analytics, tracking 추가하지 말 것
- ✓ PWA 추가도 BYOK 유지 (Anthropic API는 NetworkOnly로 SW가 가로채지 않음)
- ✓ 백업은 사용자 디바이스 → 사용자 디바이스만 (클라우드 X)

### 5. PWA 설치 UX (마이크로 #2)

플랫폼별 분기:
- **iOS Safari**: JS로 trigger 절대 불가 (Apple 정책) — 3단계 수동 가이드 강조
- **Android Chrome / Desktop Chrome·Edge**: `beforeinstallprompt` 이벤트 잡아서 native prompt
- **이미 설치**: standalone 감지 → "✓ 이미 설치됨"

**변경 시 주의**:
- ❌ iOS에 자동 install 버튼 만들지 말 것 (절대 동작 안 함, 사용자 혼란 야기)
- ✓ `lib/pwa.ts`의 `usePWAInstall` hook 활용
- ✓ iPadOS 13+ 데스크탑 위장 케이스 (`navigator.maxTouchPoints > 1 && /Macintosh/`)

---

## 디자인 시스템 v2

### 컬러 토큰 (`src/index.css`)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-bg` | `#fff8ee` | warm cream — 메인 |
| `--color-bg-soft` | `#fef3e0` | 카드 sub |
| `--color-ink` | `#1a1a1a` | 본문 |
| `--color-ink-soft` | `#7a7a7a` | 캡션 |
| `--color-accent` | `#ec4899` | **vibrant pink — primary** |
| `--color-accent-soft` | `#fce7f3` | pink 흐림 |
| `--color-teal` | `#14787e` | **deep teal — secondary** |
| `--color-pop` | `#38bdf8` | sky blue — pop |
| `--color-highlight` | `#fff070` | vibrant yellow — 형광펜 |
| `--color-warn` | `#dc2626` | 경고 |
| `--color-line` | `#e7e0d0` | 보더 |

### 시그니처 요소

- `✦` sig-star (헤더 prefix, 카드 타이틀)
- `gradient-card` 클래스 (pink/teal/warm 3종)
- `rounded-2xl` (모든 카드)
- `lift` hover (`translateY(-2px)` + shadow-md)
- `animate-pop-in` (모달, 토스트 등장)
- `highlight` 클래스 (yellow 형광펜)

### 로고
```
convo·trace
^^^^^ ^^^^^
teal  pink
```

**변경 시 절대 지킬 것**:
- ❌ primary 컬러를 다른 색으로 바꾸지 말 것 (vibrant pink가 정체성)
- ❌ 다른 모서리 radius 쓰지 말 것 (rounded-2xl 통일)
- ✓ `✦` 시그니처 유지
- ✓ Pretendard Variable (body) + Fraunces italic (display)

---

## 결정 로그 (왜 이렇게 결정했는지)

### LLM에 회상 mastery 판정 시키지 않은 이유
- 비용 (API 호출당 $) + 지연 (회화 종료 후 판정 대기) 증가
- substring keyword match (4글자 이상 키워드 50% 매칭) 로 충분한 신호
- 실제 dogfooding에서 검증

### SM-2 단순화 (정통 SM-2 안 쓴 이유)
- 정통 SM-2의 `ef + interval + repetitions` 는 게임화 부담 (사용자가 점수 chase)
- mastery 0-10 단일 스케일이 더 직관적
- 명시적 review UI 없으니 정교한 SRS 불필요

### 페어 동기화 호스트 중심 (양방향 P2P 안 쓴 이유)
- 양방향 P2P: N(N-1) 스캔 (3명 = 6번)
- 호스트 중심: 2(N-1) 스캔 (3명 = 4번)
- "마스터 노트" 모델이 명확 (호스트가 통합본 보유)

### QR 페이로드 압축 (raw JSON 안 쓴 이유)
- QR 한 장 한도 ~4KB (알파뉴메릭 ECC L)
- raw JSON: 시나리오 1개 + 캡처 10개 = ~4.5KB (한계 초과)
- pako gzip + base64 + magic 'CT1' = ~1.5KB (한 장에 OK)

### 페어 시나리오 자율성 (cookie cutter 안 한 이유 — 마이크로 #3)
- 25-40 강제 + 4-phase 강제 → 쇼핑 회화에 4-phase 부자연, 깊은 토론에 25 cap 빈약
- 사용자 피드백: "페어는 상황마다 좀 바뀔 수도 있어서 확장성 여는 게 맞다"
- 8-50 LLM 자율로 변경 + 상황별 권장 분량을 prompt에 hint

### 누적 리뷰 페이지 안 만든 이유 (사용자 명시적 결정)
- 회상 폐쇄 루프가 이미 "박제 → 자동 등장 → mastery 업데이트" 루프
- 별도 review 페이지는 사용자가 의식적으로 학습하라고 강제 → 회상 본질 깨뜨림
- 사용자: "누적 리뷰는 알아서 하는 게 낫지 않나? 여기서 하는 것보다는?"

### 금요일 스피치 모드 안 만든 이유
- 시나리오 모델 (두 역할 dialogue) 와 안 맞음 (모놀로그 + 3-Question Rule 형식)
- 사용자: "일단 금요일 모드 안 만들게"

### 요일별 테마 보류 이유
- 월(일상) / 수(상황극) 는 이미 현재 페어 모드로 커버
- 금(스피치) 만 진짜 새 형식인데 사용자 보류 결정
- 동아리 운영 vs 도구 의존성 결합도 낮춰서 자율성 유지

---

## 다음 단계 후보

### 진행 가능
- **Dogfooding 사이클** (현재 진행 중)
  - 우테코 동아리 'Talking About' 매주 월/수/금 활용
  - 페어 시나리오 길이 적응 검증
  - QR 동기화 흐름 자연스러움
  - mastery 업데이트 precision
- **페어 고정** — 동아리 운영 방식 (1주일 같은 페어) 직접 반영
  - 설정에 "내 페어" 등록 (이름 + 메모)
  - 시나리오 생성 시 자동 채움
  - /sessions 페어별 필터
- **Saga-Tales promotion 검토** — 3-of-4 기준 평가 (보욱과)

### 보류 / 안 함 (사용자 결정 — 변경하지 말 것)
- ~~금요일 숏 스피치 모드~~ (사용자 명시 보류)
- ~~요일별 테마 (월/수/금)~~ (월/수 이미 커버, 금만 가치였는데 보류)
- ~~한 주 누적 리뷰 페이지~~ (회상 폐쇄 루프가 이미 함)

---

## 사용자 컨텍스트

### IQ (한동희)
- 우테코 8기 백엔드, 중앙대 SW
- INTP, 매일 dogfooder
- 닉네임 표기: "아이큐" (한글, IQ 아님)
- 커밋 메시지 언어: **한국어** (tale-01의 영어 컨벤션과 다름)
- GitHub: [@e9ua1](https://github.com/e9ua1)

### 우테코 영어회화 동아리 'Talking About' v2
- **주 3회** (월/수/금) 1:00-1:30 (30분)
- **고정 페어제** (1주일 동안 같은 페어 또는 4인 그룹)
- **요일별 테마**:
  - 월: 일상 공유 (Daily Life)
  - 수: 상황 미션 (Role-play) — 특정 장소 (여행, 비즈니스, 쇼핑 등)
  - 금: 리뷰 & 숏 스피치 — 1-2분 발표 + **3-Question Rule** (Fact / Deep Dive / Expression)
- **수요일 표준 진행** (4단계 — 본 도구의 핵심 fit):
  1. 표현 연습 (3-4분) — 페어와 핵심 표현 공유
  2. 상황극 진행 (3-4분)
  3. 역할 바꿔서 (3-4분)
  4. 추가 상황 (선택) — plot twist 후 ②③ 반복
  5. 마무리 (5분) — 잘쓴 표현 정리

### Saga-Tales venture studio
- IQ + 보욱 공동 founder
- 매주 한 tale 만드는 vibe-coding 방법론
- Promotion 기준: 3-of-4 (특정 4 criteria 중 3개 만족 시 promotion)
- prologue 레포: 모든 tale 진척 hub

### 작업 스타일
- 깊이 있는 분석 + 명확한 결정 + 트레이드오프 명시
- 한국어 first
- "깊게 고민해서" 자주 요청

---

## Dogfooding 체크포인트

다음 동아리 활동 (월/수/금) 시 확인:

### 시나리오 quality
- 상황별 분량 적응이 자연스러운가?
- 쇼핑 회화 짧게 / 깊은 토론 길게 잘 나오는가?
- Phase 마커 (20+ turns) 가 흐름과 매칭되는가?
- 균형 검증 80% threshold 가 너무 관대하지 않은가?
- "Alex" 같은 영어 이름 안 나오고 "대학 친구" 같은 일반명사 잘 나오는가?

### 페어 동기화
- QR 사이즈가 한도 안에 들어오는가? (캡처 많을 때 ~4KB 근처)
- iOS Safari 카메라 권한 (https 한정)
- 호스트 중심 흐름이 회화 끝나고 4번 스캔이 자연스러운가?
- sessionUuid 매칭이 다른 회화 QR 막아주는가?

### 회상 폐쇄 루프
- 두 번째 회화에 첫 회화 phrase 가 자연스럽게 녹는가?
- substring keyword match 50%/60% threshold 적절한가?
- 1주일 사용 후 mastery 분포 (Home 카드) 가 의미 있는가?
- 너무 빠르게 마스터 / 너무 느리게 학습되는가?

### PWA + 백업
- iOS Safari 3단계 가이드가 명확한가?
- Android/Desktop "지금 설치" 버튼이 잘 동작하는가?
- 백업 export 후 다른 디바이스 import (Merge / Replace) 정상 동작하는가?

---

## 작업 시 절대 원칙

**다음 Claude 세션이 잘못된 방향으로 가지 않게 명시:**

### 보존
- ✓ BYOK + serverless (백엔드 추가 X)
- ✓ 디자인 v2 (vibrant pink primary, ✦ sig-star, rounded-2xl)
- ✓ 회상 폐쇄 루프의 본질 (의식적 review 없음)
- ✓ 페어 시나리오 자율성 (LLM 결정 우선)
- ✓ 한국어 커밋 메시지
- ✓ 닉네임 표기 "아이큐"
- ✓ Saga-Tales 표준 사이클 (zip → unzip → push)

### 추가하지 말 것
- ❌ 백엔드 서버
- ❌ analytics, tracking
- ❌ 명시적 review/누적 리뷰 페이지
- ❌ LLM 호출 (회상 mastery 판정에)
- ❌ iOS 자동 PWA 설치 버튼 (절대 동작 안 함)
- ❌ 25-40 turns 같은 강제 cap (자율성 깨뜨림)
- ❌ 4-phase 모든 페어 강제 (cookie cutter)

### 사용자 의견 명시 결정 (변경 금지)
- 금요일 스피치 모드: **안 만듦**
- 요일별 테마: **보류**
- 누적 리뷰: **회상이 알아서 — 안 만듦**

---

## 참고 — README와 차별점

- **README** (외부 청자: 사용자, GitHub 방문자, promotion 평가자)
  - 무엇 / 왜 / 어떻게 사용
  - mermaid 다이어그램 (회상 폐쇄 루프, 페어 동기화, 데이터 모델)
  - 디자인 시스템 v2 전체

- **CLAUDE.md** (작업 컨텍스트: Claude Code, IQ 본인)
  - 어떻게 작업 / 왜 이 결정 / 다음 어디로
  - 결정 로그 + 절대 원칙
  - 사용자 의견 기록
  - Dogfooding 체크포인트

상세 내용 (예: 데이터 모델 ER 다이어그램, 페어 동기화 sequence) 은 README 참조.

---

## 즉시 다음 작업 시작할 때 체크리스트

1. **현재 상태 확인** — `git status`, `git log -5`
2. **작업 디렉토리 정리** — `npm install`, `npm run dev` 동작 확인
3. **사용자 의견 재확인** — 위 "사용자 의견 명시 결정" 섹션 + dogfooding 체크포인트
4. **무엇을 할지 명확화** — 다음 단계 후보에서 선택, 사용자 동의
5. **빌드 검증** — `npx tsc -b && npx vite build` 통과해야 zip 생성
6. **Saga-Tales 표준 사이클** — zip → unzip → push, 한국어 커밋 메시지
