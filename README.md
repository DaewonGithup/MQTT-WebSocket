# MQTT-Webtransport

같은 와이파이에 있는 사람끼리 브라우저만으로 메시지를 주고받는 로컬 MQTT 공유 사이트입니다. 설계는 [docs/design.md](docs/design.md), 버전별 변경 내용은 [docs/update.md](docs/update.md)를 보세요.

## 실행

```bash
npm install
npm start
```

1. 호스트 PC 브라우저에서 `http://localhost:8080`을 엽니다. 토픽, PIN, 접속 QR 코드가 보입니다.
2. 참여자는 같은 와이파이에서 QR을 찍거나 접속 주소로 들어가 토픽과 PIN을 입력합니다. PIN을 5번 틀리면 1분 동안 입장할 수 없습니다.
3. "파일 보내기"로 파일을 올리면 모두에게 내려받기 링크가 보입니다. 파일은 100MB까지, 이미지·PDF·문서·zip 형식만 되며 30분 뒤 자동으로 지워집니다.
4. "세션 종료"를 누르거나 터미널에서 Ctrl+C를 누르면 세션이 끝나고 내용이 모두 사라집니다.

## 테스트

```bash
npm test
```

## 브랜치 규칙 (Gitflow)

| 브랜치 | 용도 | 시작 → 합칠 곳 |
|---|---|---|
| `main` | 출시된 버전. 합칠 때마다 `vX.Y.Z` 태그 | - |
| `develop` | 다음 출시를 위한 개발 통합 | - |
| `feature/이름` | 기능 하나 개발 | `develop` → `develop` |
| `release/X.Y.0` | 출시 전 테스트·수정, 버전 올리기 | `develop` → `main` + `develop` |
| `hotfix/X.Y.Z` | 운영 중 긴급 버그 수정 | `main` → `main` + `develop` |

- 임시 브랜치(feature, release, hotfix)는 PR로 합친 뒤 삭제합니다.
- 커밋 메시지는 `feat:`, `fix:`, `docs:`, `test:`, `chore:`로 시작합니다.
