import { test } from 'node:test'
import assert from 'node:assert'
import mqtt from 'mqtt'
import { startSession } from '../server.js'

// 브라우저처럼 내장 WebSocket 사용 (mqtt.js의 ws 경로는 Node 26에서 연결이 멈춤)
const connect = (s, pin = s.pin) => mqtt.connectAsync(`ws://127.0.0.1:${s.port}/mqtt`, { reconnectPeriod: 0, forceNativeWebSocket: true, username: 'guest', password: pin })

test('같은 토픽끼리 메시지를 주고받고, 다른 토픽은 거부되며, 종료 시 알림이 간다', async () => {
  const s = await startSession(0)
  const a = await connect(s)
  const b = await connect(s)

  await assert.rejects(b.subscribeAsync('room/guess'), (e) => e.packet.granted[0] === 128)

  await a.subscribeAsync(s.topic)
  await b.subscribeAsync(s.topic)
  const got = []
  a.on('message', (_, p) => got.push(JSON.parse(p)))

  await b.publishAsync(s.topic, JSON.stringify({ type: 'text', text: '안녕' }))
  await new Promise((r) => setTimeout(r, 100))
  assert.deepStrictEqual(got[0], { type: 'text', text: '안녕' })

  await s.close()
  assert.strictEqual(got.at(-1).type, 'session-closed')
  a.end(true); b.end(true)
})

test('이 PC에서 연 호스트 화면은 토픽을 받는다', async () => {
  const s = await startSession(0)
  const r = await fetch(`http://127.0.0.1:${s.port}/host`)
  assert.strictEqual((await r.json()).topic, s.topic)
  await s.close()
})

test('세션 종료 요청은 입장한 사람이 있어도 ok 응답을 받은 뒤 끊긴다', async () => {
  const s = await startSession(0)
  const a = await connect(s)
  await a.subscribeAsync(s.topic)
  const r = await fetch(`http://127.0.0.1:${s.port}/host`, { method: 'POST' })
  assert.strictEqual(await r.text(), 'ok')
  await new Promise((resolve) => s.server.once('session-closed', resolve))
  a.end(true)
})
