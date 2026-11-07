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

test('참여자가 보낸 가짜 시스템 알림(세션 종료·파일)은 다른 사람에게 가지 않는다', async () => {
  const s = await startSession(0)
  const a = await connect(s)
  const bad = await connect(s)
  await a.subscribeAsync(s.topic)
  const got = []
  a.on('message', (_, p) => got.push(JSON.parse(p)))

  bad.on('error', () => {}) // 브로커가 끊어 버림
  bad.publish(s.topic, JSON.stringify({ type: 'session-closed' }), { qos: 1 })
  const bad2 = await connect(s)
  bad2.on('error', () => {})
  bad2.publish(s.topic, JSON.stringify({ type: 'file', id: 'a'.repeat(32), name: 'x.exe' }), { qos: 1 })
  const ok = await connect(s)
  await ok.publishAsync(s.topic, JSON.stringify({ type: 'text', text: '진짜' }))
  await new Promise((r) => setTimeout(r, 100))

  assert.deepStrictEqual(got, [{ type: 'text', text: '진짜' }])
  a.end(true); bad.end(true); bad2.end(true); ok.end(true)
  await s.close()
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

test('휴대폰처럼 잠깐 끊겼다 다시 연결하면, 끊긴 동안 온 메시지를 받는다', async () => {
  const s = await startSession(0)
  const opts = { reconnectPeriod: 0, forceNativeWebSocket: true, username: 'guest', password: s.pin, clean: false, clientId: 'web-phone1' }
  const url = `ws://127.0.0.1:${s.port}/mqtt`
  const phone = await mqtt.connectAsync(url, opts)
  await phone.subscribeAsync(s.topic, { qos: 1 })
  await phone.endAsync() // 사진 고르러 간 사이 연결 끊김

  const host = await connect(s)
  await host.publishAsync(s.topic, JSON.stringify({ type: 'text', text: '끊긴 동안 보낸 말' }), { qos: 1 })

  const back = await mqtt.connectAsync(url, opts) // 같은 clientId로 다시 연결
  const got = await new Promise((resolve) => back.once('message', (_, p) => resolve(JSON.parse(p))))
  assert.strictEqual(got.text, '끊긴 동안 보낸 말')
  back.end(true); host.end(true)
  await s.close()
})
