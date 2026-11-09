# 업데이트 내역 · Release Notes

정식 버전이 `main`에 합쳐질 때마다 이 파일에 내용을 추가합니다. 최신 버전이 맨 위에 옵니다. 각 버전은 한국어 설명 다음에 영어 설명이 있습니다.

Release notes are added here every time an official version is merged into `main`. The newest version is at the top. Each version has a Korean section followed by an English section.

- 버전 규칙 · Versioning: `MAJOR.MINOR.PATCH` (큰 변화 · 기능 추가 · 버그 수정 / breaking change · new feature · bug fix)
- 구분 · Categories: **기능** Features · **수정** Fixes · **디자인** Design · **보안** Security · **기타** Other

---

## v1.3.0 (2026-11-09)

### 한국어

**기능**
- 동영상(mp4) 파일 전송 지원. 파일 고르기 창에서 mp4를 고를 수 있고, 확장자가 대문자(`.MP4`)여도 됨
- 크기 제한은 기존과 같은 100MB

### English

**Features**
- Added video (mp4) file transfer. mp4 files can be picked in the file chooser, including upper-case extensions (`.MP4`)
- The size limit stays at 100 MB

---

## v1.2.2 (2026-11-07)

### 한국어

**보안**
- 참여자가 "세션 종료"·"파일 도착" 같은 가짜 시스템 알림을 보내지 못하게 막음. 참여자는 글(`type: text`)만 보낼 수 있고, 시스템 알림은 서버만 보냄
- 다른 사람인 척하지 못하게 막음. 보낸 사람 id(`from`)를 화면이 아닌 서버가 정함
  - 서버가 각 참여자의 비밀 clientId로 id를 만들어 글과 파일 알림에 붙임
  - 입장하면 서버가 그 사람에게만 자기 id를 알려 줌(`hello`)
  - 파일 업로드 헤더가 `X-From`에서 `X-Client-Id`로 바뀜

**기타**
- 서버와 화면이 함께 바뀌었으므로, 업데이트 후 서버를 다시 켜고 페이지를 새로고침해야 함

### English

**Security**
- Participants can no longer send fake system notices such as "session closed" or "file arrived". Participants may only send text (`type: text`); system notices come from the server only
- Participants can no longer pretend to be someone else. The sender id (`from`) is now set by the server, not the page
  - The server derives each participant's id from their secret clientId and attaches it to text and file notices
  - On joining, the server tells each participant their own id (`hello`)
  - The upload header changed from `X-From` to `X-Client-Id`

**Other**
- Both the server and the page changed, so restart the server and reload the page after updating

---

## v1.2.1 (2026-11-05) · 핫픽스 · Hotfix

### 한국어

**수정**
- 참여자 접속 주소가 두 개 이상 보이던 문제 수정. Windows 모바일 핫스팟·WSL·VPN 같은 가상 네트워크 주소를 빼고, 인터넷으로 나가는 와이파이(기본 경로) 주소 하나만 표시
- 같은 와이파이의 다른 기기로 QR을 찍어도 페이지가 열리지 않던 문제 수정. QR이 가상 네트워크 주소를 가리키던 것이 원인이었음
- 인터넷 연결이 없을 때는 예전처럼 모든 주소를 보여 줌
- 휴대폰 참여자 화면에 자기 메시지·파일이 보이지 않던 문제 수정. 사진을 고르거나 화면이 꺼지면 휴대폰이 연결을 끊는데, 다시 연결하지 않았던 것이 원인
  - 끊기면 2초마다 자동 재연결, 화면에 "다시 연결하는 중…" / "다시 연결되었습니다" 표시
  - 끊긴 동안 온 메시지는 브로커가 모아 뒀다가 다시 연결되면 전달 (QoS 1, 지속 세션)
- 아이폰 사진(.heic, .heif) 업로드 허용
- 주소 끝에 `?`로 시작하는 꼬리가 붙어도(QR 앱·메신저) 첫 화면이 열리도록 수정

### English

**Fixes**
- Fixed more than one participant address being shown. Virtual network addresses such as Windows Mobile Hotspot, WSL or VPN are excluded, and only the Wi-Fi address on the default route is shown
- Fixed the page not opening when another device on the same Wi-Fi scanned the QR code. The QR code was pointing to a virtual network address
- Without an internet connection, all addresses are still shown as before
- Fixed phone participants not seeing their own messages and files. Phones drop the connection while picking a photo or when the screen turns off, and the page never reconnected
  - Reconnects automatically every 2 seconds and shows "다시 연결하는 중…" (Reconnecting…) / "다시 연결되었습니다" (Reconnected)
  - Messages sent while disconnected are kept by the broker and delivered on reconnect (QoS 1, persistent session)
- Allowed iPhone photos (.heic, .heif)
- The first page now opens even if a `?` query is appended to the address (QR apps, messengers)

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
