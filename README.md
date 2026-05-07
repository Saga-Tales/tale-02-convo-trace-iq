# tale-02-convo-trace-iq

> 회화의 흔적을 남기는 영어 회화 보조 노트북.
> 모든 데이터는 너의 브라우저에만 산다.

🔗 **Live**: https://saga-tales.github.io/tale-02-convo-trace-iq/ (배포 후)
📁 **Repo**: https://github.com/Saga-Tales/tale-02-convo-trace-iq

[Saga-Tales](https://github.com/Saga-Tales) venture studio의 두 번째 tale. BYOK, 백엔드 0대.

---

## 무엇

영어 회화 스터디 도중 만나는 모든 학습 모먼트를 컨텍스트와 함께 박제하는 도구.
시나리오 받고 회화하는 것 자체보다, 그 안에서 발생하는:

- "한국어 X를 영어로?" → 짧은 한 줄 답변, 자동 저장 (페인 1)
- 모르는 단어 → 등장한 문장 통째로 저장 (페인 2)
- AI가 사용한 좋은 표현 → 회화 종료 후 추출, keep/discard (페인 3)
- 다음 회화에 자연스럽게 이전 표현 등장 (페인 4 — 의식적 복습 X)

ChatGPT/Claude로 회화하면 끝나면 다 휘발된다는 페인을 직접 해결.

## 누구

**Primary**: 한동희 (IQ) — 매일 dogfooder.
**Secondary**: 우테코 동아리 영어 회화 스터디 멤버. 직접 만나서 페어 회화할 때
각자 디바이스에 캡처하고 끝나면 QR로 동기화.

## 빠른 시작

### 사용자 입장

1. [Live 사이트](https://saga-tales.github.io/tale-02-convo-trace-iq/) 접속
2. [console.anthropic.com](https://console.anthropic.com)에서 API 키 발급
3. **설정** → API 키 입력
4. **회화** → 시나리오 받고 시작

### 개발자 입장

요구사항: **Node 20+**

```bash
git clone https://github.com/Saga-Tales/tale-02-convo-trace-iq
cd tale-02-convo-trace-iq
npm install      # .npmrc에 ignore-scripts=true (sharp 등 native binary 스킵)
npm run dev      # http://localhost:5173/tale-02-convo-trace-iq/
```

빌드:

```bash
npm run build    # dist/ 정적 파일 생성
```

`main` 브랜치 push 시 GitHub Actions가 자동 배포.

---

## 진행 상황

- [x] **Day 1**: 프로젝트 골격 — Vite + React + TypeScript + Tailwind v4 + IndexedDB schema + BYOK + GH Pages 자동 배포 + SPA fallback
- [x] **Day 2**: 시나리오 생성 (Claude Haiku 4.5 + hard-constraint validator) + 솔로/페어 모드 + streaming 회화 + 활성 세션 localStorage 복구 + 종료 다이얼로그(rating·note) + 세션 기록 + 홈 대시보드
- [ ] **Day 3**: 캡처 (ko→en 짧은 답변 모드 + 단어 lookup + 자동 저장)
- [ ] **Day 4**: 회화 종료 후 표현 추출 + validator + keep/discard
- [ ] **Day 5**: 회상 (시나리오 생성 시 mastery 낮은 표현 주입) + 홈 대시보드 정교화 + SM-2
- [ ] **Day 6**: 페어 모드 (QR 시나리오 공유 + 캡처 동기화) + PWA + 백업

## Tech stack

| 영역 | 선택 | 이유 |
|---|---|---|
| Build | Vite | 빠른 dev, 정적 빌드, GH Pages 친화 |
| UI | React 18 + TypeScript | 타입 안정성 |
| Styling | Tailwind v4 | cream + deep teal + 형광펜 yellow 디자인 토큰 |
| Storage | IndexedDB via Dexie | 브라우저 NoSQL, 트랜잭션 |
| LLM | Anthropic Claude Haiku 4.5 | 한국어 가성비, streaming, 짧은 응답에 충분 |
| Hosting | GitHub Pages | 무료, public, 자동 배포 |

## 디자인 토큰

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-bg` | `#f7f3ea` | cream 베이스 |
| `--color-ink` | `#1a1a1a` | 본문 텍스트 |
| `--color-accent` | `#2d6a6f` | deep teal — 강조, 액션 |
| `--color-highlight` | `#ffe8a3` | 형광펜 — 캡처된 표현/단어 마킹 |
| `--font-display` | `Fraunces` italic | 페이지 타이틀 (시그니처) |
| `--font-body` | `Pretendard Variable` | 한국어 first 본문 |

## Privacy & 데이터 소유권

- 모든 데이터(API 키, 회화 기록, 단어/표현)는 IndexedDB + localStorage에만 저장
- 회화 메시지는 응답을 받기 위해 Anthropic API로 일시 전송 ([Anthropic 데이터 정책](https://www.anthropic.com/privacy))
- 백엔드 서버 없음, 분석/트래킹 없음

## 만든 사람

- **한동희 (IQ)** — 설계, 구현, dogfooding

## License

MIT
