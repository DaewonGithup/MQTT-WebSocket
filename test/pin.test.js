import { test } from 'node:test'
import assert from 'node:assert'
import mqtt from 'mqtt'
import { startSession } from '../server.js'

const connect = (s, pin) => mqtt.connectAsync(`ws://127.0.0.1:${s.port}/mqtt`, { reconnectPeriod: 0, forceNativeWebSocket: true, username: 'guest', password: pin })
const wrongPin = (s) => String((Number(s.pin) + 1) % 1e6).padStart(6, '0')

test('PIN이 틀리면 MQTT 접속과 파일 업로드가 거부된다', async () => {
  const s = await startSession(0)
  assert.match(s.pin, /^\d{6}$/)
  await assert.rejects(connect(s, wrongPin(s)))
  const r = await fetch(`http://127.0.0.1:${s.port}/files`, {
    method: 'POST',
    headers: { 'X-Topic': s.topic, 'X-Pin': wrongPin(s), 'X-Filename': 'a.txt' },
    body: 'x'
  })
  assert.strictEqual(r.status, 403)
  await s.close()
})

test('PIN을 5번 틀리면 맞는 PIN도 잠시 거부된다', async () => {
  const s = await startSession(0)
  for (let i = 0; i < 5; i++) await assert.rejects(connect(s, wrongPin(s)))
  await assert.rejects(connect(s, s.pin))
  await s.close()
})

test('호스트 화면은 PIN과 QR(SVG)을 받고, 토픽 자동입력은 기본 꺼짐·켜면 QR에 토픽이 담긴다', async () => {
  const s = await startSession(0)
  const h = await (await fetch(`http://127.0.0.1:${s.port}/host`)).json()
  assert.strictEqual(h.pin, s.pin)
  assert.strictEqual(h.qrTopic, false)
  for (const j of h.joins) assert.ok(!j.url.includes('#t='))
  const on = await (await fetch(`http://127.0.0.1:${s.port}/host/qr-topic/on`, { method: 'POST' })).json()
  assert.strictEqual(on.qrTopic, true)
  for (const j of on.joins) {
    assert.ok(j.url.endsWith(`/#t=${encodeURIComponent(s.topic)}`))
    assert.ok(!j.url.includes(s.pin))
    assert.match(j.qr, /^<svg/)
  }
  await s.close()
})

test('호스트가 PIN을 끄면 PIN 없이 입장·업로드되고, 다시 켜면 거부된다', async () => {
  const s = await startSession(0)
  const toggle = (on) => fetch(`http://127.0.0.1:${s.port}/host/pin/${on}`, { method: 'POST' }).then((r) => r.json())
  const up = () => fetch(`http://127.0.0.1:${s.port}/files`, { method: 'POST', headers: { 'X-Topic': s.topic, 'X-Filename': 'a.txt' }, body: 'x' })

  assert.strictEqual((await toggle('off')).pinOn, false)
  const c = await connect(s, '')
  assert.strictEqual((await up()).status, 200)
  c.end(true)

  assert.strictEqual((await toggle('on')).pinOn, true)
  await assert.rejects(connect(s, ''))
  assert.strictEqual((await up()).status, 403)
  await s.close()
})
