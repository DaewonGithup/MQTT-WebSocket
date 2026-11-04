# MQTT-Webtransport

같은 와이파이에 있는 사람끼리 브라우저만으로 메시지를 주고받는 로컬 MQTT 공유 사이트입니다. 설계는 [docs/design.md](docs/design.md)를 보세요.

## 실행

```bash
npm install
npm start
```

1. 호스트 PC 브라우저에서 `http://localhost:8080`을 엽니다. 토픽과 접속 주소가 보입니다.
2. 참여자는 같은 와이파이에서 접속 주소로 들어가 토픽을 입력합니다.
3. "세션 종료"를 누르거나 터미널에서 Ctrl+C를 누르면 세션이 끝나고 내용이 모두 사라집니다.

## 테스트

```bash
npm test
```
