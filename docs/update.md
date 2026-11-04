# 업데이트 내역

정식 버전이 `main`에 합쳐질 때마다 이 파일에 내용을 추가합니다. 최신 버전이 맨 위에 옵니다.

- 버전 규칙: `MAJOR.MINOR.PATCH` (큰 변화 · 기능 추가 · 버그 수정)
- 구분: **기능** 새로 생긴 것 · **수정** 고친 것 · **디자인** 화면 · **보안** 안전장치 · **기타**

---

## v1.1.0 (2026-11-04)

**기능**
- 호스트 화면에 접속 주소별 **QR 코드** 표시. 찍으면 토픽이 자동 입력됨 ([#9](https://github.com/DaewonGithup/MQTT-WebSocket/pull/9))
- 세션마다 6자리 **PIN** 생성. MQTT 접속과 파일 업로드 때 확인 ([#9](https://github.com/DaewonGithup/MQTT-WebSocket/pull/9))

**보안**
- 같은 기기가 PIN을 5번 틀리면 1분 동안 입장 금지
- QR에는 PIN을 넣지 않음 (화면 사진만으로 입장 방지)

**디자인**
- 카드형 화면, 채팅 말풍선, 밝은/어두운 모드 자동 전환, 휴대폰 화면 대응 ([#10](https://github.com/DaewonGithup/MQTT-WebSocket/pull/10))

---

## v1.0.1 (2026-11-04) · 핫픽스

**수정**
- 호스트가 입장하지 않은 상태에서 "세션 종료"를 누르면 화면이 바뀌지 않던 문제 수정 ([#5](https://github.com/DaewonGithup/MQTT-WebSocket/pull/5))

---

## v1.0.0 (2026-11-04) · 첫 출시

**기능**
- 메모리 전용 MQTT 브로커(aedes)와 웹서버를 호스트 PC에서 실행 ([#3](https://github.com/DaewonGithup/MQTT-WebSocket/pull/3))
- 랜덤 토픽으로 입장, 텍스트 채팅
- 파일 전송: HTTP 업로드·다운로드, 진행률 표시, MQTT로 도착 알림 ([#4](https://github.com/DaewonGithup/MQTT-WebSocket/pull/4))
- 세션 종료 시 메시지·토픽·파일 모두 삭제

**보안**
- 세션 토픽 외 구독·발행 거부
- 파일 형식 허용 목록, 크기 제한(100MB), 파일 이름 경로 제거, 30분 뒤 자동 삭제
