# 업데이트 내역 · Release Notes

정식 버전이 `main`에 합쳐질 때마다 이 파일에 내용을 추가합니다. 최신 버전이 맨 위에 옵니다. 각 버전은 한국어 설명 다음에 영어 설명이 있습니다.

Release notes are added here every time an official version is merged into `main`. The newest version is at the top. Each version has a Korean section followed by an English section.

- 버전 규칙 · Versioning: `MAJOR.MINOR.PATCH` (큰 변화 · 기능 추가 · 버그 수정 / breaking change · new feature · bug fix)
- 구분 · Categories: **기능** Features · **수정** Fixes · **디자인** Design · **보안** Security · **기타** Other

---

## v1.2.0 (2026-11-04)

### 한국어

**기능**
- 호스트가 **토픽을 직접 정하는** 기능 ([#13](https://github.com/DaewonGithup/MQTT-WebSocket/pull/13))
  - 시작할 때 `TOPIC` 환경변수로 지정 (없으면 지금처럼 랜덤 토픽)
  - 실행 중 호스트 화면의 "토픽 변경"으로 바꾸기. QR과 토픽 표시가 바로 갱신됨
  - 토픽이 바뀌면 입장한 사람은 입장 화면으로 돌아가 새 토픽으로 다시 입장

**수정**
- 다른 사람이 보낸 파일도 내가 보낸 것처럼(또는 반대로) 표시되던 문제 수정. 파일 알림에 보낸 사람 정보를 담아, 내 파일만 오른쪽 말풍선으로 표시
- 호스트가 "세션 종료"를 눌러도 호스트 화면이 바뀌지 않을 수 있던 문제 수정. 서버가 응답을 다 보낸 뒤 연결을 끊고, 응답 전에 연결이 끊겨도 종료 화면을 표시
- 종료 화면을 크게 바꿔 종료 여부를 바로 알 수 있게 함

**보안**
- 토픽은 한글·영문·숫자·`-`·`_` 3~40자만 허용 (MQTT 와일드카드 `+`, `#`와 `/` 차단)
- 토픽 변경은 호스트 PC에서만 가능

**기타**
- QR 주소의 토픽을 URL 인코딩 (한글 토픽 대응)
- README, 업데이트 내역, 설계도에 영어 설명 추가

### English

**Features**
- The host can **set the topic** ([#13](https://github.com/DaewonGithup/MQTT-WebSocket/pull/13))
  - At startup with the `TOPIC` environment variable (a random topic is used if not set)
  - While running with "토픽 변경" (Change topic) on the host screen; the QR code and topic update immediately
  - When the topic changes, joined users return to the join screen and rejoin with the new topic

**Fixes**
- Fixed files from other people being shown as if I sent them (and vice versa). File notices now carry the sender, so only my own files appear as right-side bubbles
- Fixed the host screen sometimes not changing after pressing "End session". The server now closes connections only after the response is sent, and the end screen is shown even if the connection drops first
- Made the end screen larger so it is obvious the session has ended

**Security**
- Topics allow only Korean/English letters, digits, `-`, `_`, 3–40 characters (blocks MQTT wildcards `+`, `#` and `/`)
- Only the host PC can change the topic

**Other**
- The topic in the QR URL is URL-encoded (supports Korean topics)
- Added English descriptions to the README, release notes and design report

---

## v1.1.0 (2026-11-04)

### 한국어

**기능**
- 호스트 화면에 접속 주소별 **QR 코드** 표시. 찍으면 토픽이 자동 입력됨 ([#9](https://github.com/DaewonGithup/MQTT-WebSocket/pull/9))
- 세션마다 6자리 **PIN** 생성. MQTT 접속과 파일 업로드 때 확인 ([#9](https://github.com/DaewonGithup/MQTT-WebSocket/pull/9))

**보안**
- 같은 기기가 PIN을 5번 틀리면 1분 동안 입장 금지
- QR에는 PIN을 넣지 않음 (화면 사진만으로 입장 방지)

**디자인**
- 카드형 화면, 채팅 말풍선, 밝은/어두운 모드 자동 전환, 휴대폰 화면 대응 ([#10](https://github.com/DaewonGithup/MQTT-WebSocket/pull/10))

### English

**Features**
- **QR codes** for each join address on the host screen; scanning fills in the topic automatically ([#9](https://github.com/DaewonGithup/MQTT-WebSocket/pull/9))
- A 6-digit **PIN** per session, checked on MQTT connect and file upload ([#9](https://github.com/DaewonGithup/MQTT-WebSocket/pull/9))

**Security**
- A device that enters a wrong PIN 5 times is blocked for 1 minute
- The QR code does not contain the PIN (a photo of the screen alone is not enough to join)

**Design**
- Card layout, chat bubbles, automatic light/dark mode, mobile-friendly layout ([#10](https://github.com/DaewonGithup/MQTT-WebSocket/pull/10))

---

## v1.0.1 (2026-11-04) · 핫픽스 · Hotfix

### 한국어

**수정**
- 호스트가 입장하지 않은 상태에서 "세션 종료"를 누르면 화면이 바뀌지 않던 문제 수정 ([#5](https://github.com/DaewonGithup/MQTT-WebSocket/pull/5))

### English

**Fixes**
- Fixed the host screen not changing when "End session" was pressed before the host had joined ([#5](https://github.com/DaewonGithup/MQTT-WebSocket/pull/5))

---

## v1.0.0 (2026-11-04) · 첫 출시 · First release

### 한국어

**기능**
- 메모리 전용 MQTT 브로커(aedes)와 웹서버를 호스트 PC에서 실행 ([#3](https://github.com/DaewonGithup/MQTT-WebSocket/pull/3))
- 랜덤 토픽으로 입장, 텍스트 채팅
- 파일 전송: HTTP 업로드·다운로드, 진행률 표시, MQTT로 도착 알림 ([#4](https://github.com/DaewonGithup/MQTT-WebSocket/pull/4))
- 세션 종료 시 메시지·토픽·파일 모두 삭제

**보안**
- 세션 토픽 외 구독·발행 거부
- 파일 형식 허용 목록, 크기 제한(100MB), 파일 이름 경로 제거, 30분 뒤 자동 삭제

### English

**Features**
- In-memory MQTT broker (aedes) and web server run on the host PC ([#3](https://github.com/DaewonGithup/MQTT-WebSocket/pull/3))
- Join with a random topic and chat with text
- File transfer: HTTP upload/download, progress bar, arrival notice over MQTT ([#4](https://github.com/DaewonGithup/MQTT-WebSocket/pull/4))
- Ending the session deletes all messages, the topic and files

**Security**
- Subscribing or publishing to any topic other than the session topic is refused
- File type allowlist, size limit (100 MB), path removal from file names, automatic deletion after 30 minutes
