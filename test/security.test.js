import { test } from 'node:test'
import assert from 'node:assert'
import http from 'node:http'
import mqtt from 'mqtt'
import { startSession } from '../server.js'

const connect = (s, pin = s.pin) => mqtt.connectAsync(`ws://127.0.0.1:${s.port}/mqtt`, { reconnectPeriod: 0, forceNativeWebSocket: true, username: 'guest', password: pin })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
// fetch는 Host 머리글을 바꿀 수 없어서 http.get 사용
const getWithHost = (s, pathname, host) => new Promise((resolve, reject) => http.get({ port: s.port, host: '127.0.0.1', path: pathname, headers: { Host: host } }, (r) => { r.resume(); resolve(r.statusCode) }).on('error', reject))
const upload = (s, body) => fetch(`http://127.0.0.1:${s.port}/files`, { method: 'POST', headers: { 'X-Topic': s.topic, 'X-Pin': s.pin, 'X-Filename': 'a.txt' }, body })

test('다른 사이트(Origin)나 가짜 주소(Host)에서 온 호스트 요청은 거부한다', async () => {
  const s = await startSession(0)
  const base = `http://127.0.0.1:${s.port}`
  assert.strictEqual((await fetch(`${base}/host/pin/off`, { method: 'POST', headers: { Origin: 'http://evil.example' } })).status, 404)
  assert.strictEqual(await getWithHost(s, '/host', 'evil.example:8080'), 404)
  assert.strictEqual(await getWithHost(s, '/host', `localhost:${s.port}`), 200)
  assert.strictEqual((await fetch(`${base}/host`, { method: 'POST', headers: { Origin: 'http://evil.example' } })).status, 404)
  const h = await (await fetch(`${base}/host`)).json()
  assert.strictEqual(h.pinOn, true) // 위 요청으로 꺼지지 않음
  // 호스트 화면 자신의 요청(같은 주소 Origin)은 그대로 됨
  assert.strictEqual((await fetch(`${base}/host/pin/off`, { method: 'POST', headers: { Origin: base } })).status, 200)
  await s.close()
})

test('모든 응답에 클릭재킹 차단 헤더가 붙는다', async () => {
  const s = await startSession(0)
  const r = await fetch(`http://127.0.0.1:${s.port}/`)
  assert.strictEqual(r.headers.get('x-frame-options'), 'DENY')
  assert.match(r.headers.get('content-security-policy'), /frame-ancestors 'none'/)
  await s.close()
})

test('너무 긴 글은 다른 사람에게 가지 않는다', async () => {
  const s = await startSession(0)
  const a = await connect(s)
  await a.subscribeAsync(s.topic)
  const got = []
  a.on('message', (_, p) => { const m = JSON.parse(p); if (m.type === 'text') got.push(m.text.length) })
  for (const len of [10001, 2 * 1024 * 1024]) {
    const bad = await connect(s)
    bad.on('error', () => {})
    bad.publish(s.topic, JSON.stringify({ type: 'text', text: 'x'.repeat(len) }))
    await wait(200)
    bad.end(true)
  }
  const ok = await connect(s)
  await ok.publishAsync(s.topic, JSON.stringify({ type: 'text', text: 'x'.repeat(10000) }))
  await wait(200)
  assert.deepStrictEqual(got, [10000])
  a.end(true); ok.end(true)
  await s.close()
})

test('올린 파일 합계가 한도를 넘으면 거부하고, 지워지면 다시 받는다', async () => {
  const s = await startSession(0, { maxFileBytes: 10, maxTotalBytes: 10 })
  const first = await upload(s, 'x'.repeat(6))
  assert.strictEqual(first.status, 200)
  assert.strictEqual((await upload(s, 'x'.repeat(6))).status, 507)
  // 토픽을 바꾸면 파일이 지워져 공간이 돌아옴
  await fetch(`http://127.0.0.1:${s.port}/host/topic`, { method: 'POST', body: JSON.stringify({ topic: 'newroom' }) })
  assert.strictEqual((await upload(s, 'x'.repeat(6))).status, 200)
  await s.close()
})

test('토픽을 바꾸면 옛 방 파일은 링크로도 받을 수 없다', async () => {
  const s = await startSession(0)
  const { id } = await (await upload(s, 'secret')).json()
  await fetch(`http://127.0.0.1:${s.port}/host/topic`, { method: 'POST', body: JSON.stringify({ topic: 'newroom' }) })
  assert.strictEqual((await fetch(`http://127.0.0.1:${s.port}/files/${id}`)).status, 404)
  await s.close()
})

test('PIN을 다시 켜면 PIN 없이 들어온 사람은 끊긴다', async () => {
  const s = await startSession(0)
  await fetch(`http://127.0.0.1:${s.port}/host/pin/off`, { method: 'POST' })
  const c = await connect(s, '')
  const closed = new Promise((resolve) => c.once('close', resolve))
  await fetch(`http://127.0.0.1:${s.port}/host/pin/on`, { method: 'POST' })
  await closed
  await assert.rejects(connect(s, ''))
  c.end(true)
  await s.close()
})
