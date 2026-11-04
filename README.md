# MQTT-WebSocket

[한국어](#한국어) · [English](#english)

## 한국어

같은 와이파이에 있는 사람끼리 브라우저만으로 메시지를 주고받는 로컬 MQTT 공유 사이트입니다. 설계는 [docs/design.md](docs/design.md), 버전별 변경 내용은 [docs/update.md](docs/update.md)를 보세요.

### 실행

```bash
npm install
npm start
```

1. 호스트 PC 브라우저에서 `http://localhost:8080`을 엽니다. 토픽, PIN, 접속 QR 코드가 보입니다.
2. 참여자는 같은 와이파이에서 QR을 찍거나 접속 주소로 들어가 토픽과 PIN을 입력합니다. PIN을 5번 틀리면 1분 동안 입장할 수 없습니다.
3. 호스트는 화면의 "토픽 변경"으로 원하는 토픽(한글·영문·숫자·-·_ 3~40자)을 정할 수 있습니다. 바꾸면 입장한 사람은 새 토픽으로 다시 들어와야 합니다. 처음부터 정하려면 `TOPIC=우리반 npm start`(macOS·Linux) 또는 `$env:TOPIC="우리반"; npm start`(Windows PowerShell)처럼 실행합니다.
4. "파일 보내기"로 파일을 올리면 모두에게 내려받기 링크가 보입니다. 파일은 100MB까지, 이미지·PDF·문서·zip 형식만 되며 30분 뒤 자동으로 지워집니다.
5. "세션 종료"를 누르거나 터미널에서 Ctrl+C를 누르면 세션이 끝나고 내용이 모두 사라집니다.

> Windows PowerShell에서 `npm`이 실행 정책 때문에 막히면 `npm.cmd`를 쓰세요.

### 테스트

```bash
npm test
```

### 브랜치 규칙 (Gitflow)

| 브랜치 | 용도 | 시작 → 합칠 곳 |
|---|---|---|
| `main` | 출시된 버전. 합칠 때마다 `vX.Y.Z` 태그 | - |
| `develop` | 다음 출시를 위한 개발 통합 | - |
| `feature/이름` | 기능 하나 개발 | `develop` → `develop` |
| `release/X.Y.0` | 출시 전 테스트·수정, 버전 올리기 | `develop` → `main` + `develop` |
| `hotfix/X.Y.Z` | 운영 중 긴급 버그 수정 | `main` → `main` + `develop` |

- 임시 브랜치(feature, release, hotfix)는 PR로 합친 뒤 삭제합니다.
- 커밋 메시지는 `feat:`, `fix:`, `style:`, `docs:`, `test:`, `chore:`로 시작합니다.

---

## English

A local MQTT sharing site that lets people on the same Wi-Fi exchange messages and files using only a web browser. See [docs/design.md](docs/design.md) for the design (Korean) and [docs/update.md](docs/update.md) for release notes.

### Run

```bash
npm install
npm start
```

1. On the host PC, open `http://localhost:8080`. The topic, PIN, and join QR codes are shown.
2. Participants on the same Wi-Fi scan the QR code or open the join address, then enter the topic and PIN. After 5 wrong PINs, that device is blocked for 1 minute.
3. The host can set a custom topic (Korean/English letters, digits, `-`, `_`, 3–40 chars) with "토픽 변경" (Change topic). Everyone who already joined must rejoin with the new topic. To set it at startup, run `TOPIC=myroom npm start` (macOS/Linux) or `$env:TOPIC="myroom"; npm start` (Windows PowerShell).
4. Upload a file with "파일 보내기" (Send file) and everyone gets a download link. Files up to 100 MB; only images, PDF, documents and zip are allowed; files are deleted automatically after 30 minutes.
5. Press "세션 종료" (End session) or Ctrl+C in the terminal to end the session and delete everything.

> On Windows PowerShell, if `npm` is blocked by the execution policy, use `npm.cmd` instead.

### Test

```bash
npm test
```

### Branch rules (Gitflow)

| Branch | Purpose | From → Merge into |
|---|---|---|
| `main` | Released versions. Tagged `vX.Y.Z` on every merge | - |
| `develop` | Integration for the next release | - |
| `feature/name` | One feature | `develop` → `develop` |
| `release/X.Y.0` | Pre-release testing, fixes, version bump | `develop` → `main` + `develop` |
| `hotfix/X.Y.Z` | Urgent fix for a released version | `main` → `main` + `develop` |

- Temporary branches (feature, release, hotfix) are merged via PR and then deleted.
- Commit messages start with `feat:`, `fix:`, `style:`, `docs:`, `test:`, or `chore:`.
