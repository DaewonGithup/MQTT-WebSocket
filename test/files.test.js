import { test } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import mqtt from 'mqtt'
import { startSession } from '../server.js'

const connect = (s, pin = s.pin) => mqtt.connectAsync(`ws://127.0.0.1:${s.port}/mqtt`, { reconnectPeriod: 0, forceNativeWebSocket: true, username: 'guest', password: pin })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

function upload (s, name, body, topic = s.topic) {
  return fetch(`http://127.0.0.1:${s.port}/files`, {
    method: 'POST',
    headers: { 'X-Topic': topic, 'X-Pin': s.pin, 'X-Filename': encodeURIComponent(name) },
    body
  })
}

test('파일을 올리면 MQTT로 알림이 가고, 내려받을 수 있다', async () => {
  const s = await startSession(0)
  const c = await connect(s)
  await c.subscribeAsync(s.topic)
  const got = []
  c.on('message', (_, p) => { const m = JSON.parse(p); if (m.type !== 'hello') got.push(m) }) // hello: 입장 시 서버가 주는 내 id

  const r = await upload(s, '사진.png', 'hello')
  assert.strictEqual(r.status, 200)
  const { id } = await r.json()
  await wait(100)
  assert.deepStrictEqual({ ...got[0], expiresAt: 0 }, { type: 'file', id, name: '사진.png', size: 5, expiresAt: 0 })

  const d = await fetch(`http://127.0.0.1:${s.port}/files/${id}`)
  assert.strictEqual(await d.text(), 'hello')
  assert.match(d.headers.get('content-disposition'), /^attachment; filename\*=UTF-8''/)

  c.end(true)
  await s.close()
})

test('토픽이 틀리거나, 형식이 안 맞거나, 너무 크면 거부한다', async () => {
  const s = await startSession(0, { maxFileBytes: 10 })
  assert.strictEqual((await upload(s, 'a.png', 'x', 'room/guess')).status, 403)
  assert.strictEqual((await upload(s, 'a.exe', 'x')).status, 415)
  assert.strictEqual((await upload(s, 'a.png', 'x'.repeat(11))).status, 413)
  assert.deepStrictEqual(fs.readdirSync(s.dir), [])
  await s.close()
})

test('파일 이름의 경로는 지워진다', async () => {
  const s = await startSession(0)
  const { id } = await (await upload(s, '..\\..\\evil.txt', 'x')).json()
  const d = await fetch(`http://127.0.0.1:${s.port}/files/${id}`)
  assert.strictEqual(d.headers.get('content-disposition'), "attachment; filename*=UTF-8''evil.txt")
  await s.close()
})

test('만료 시간이 지나면 파일이 지워지고, 세션 종료 시 폴더도 지워진다', async () => {
  const s = await startSession(0, { fileTtlMs: 100 })
  const { id } = await (await upload(s, 'a.txt', 'x')).json()
  await wait(300)
  assert.strictEqual((await fetch(`http://127.0.0.1:${s.port}/files/${id}`)).status, 404)
  assert.deepStrictEqual(fs.readdirSync(s.dir), [])
  await s.close()
  assert.strictEqual(fs.existsSync(s.dir), false)
})

test('파일 알림의 보낸 사람 id는 글과 같은 서버 id이고, 없으면 비운다', async () => {
  const s = await startSession(0)
  const c = await mqtt.connectAsync(`ws://127.0.0.1:${s.port}/mqtt`, { reconnectPeriod: 0, forceNativeWebSocket: true, username: 'guest', password: s.pin, clientId: 'web-abc123' })
  const got = []
  let myId
  c.on('message', (_, p) => { const m = JSON.parse(p); if (m.type === 'hello') myId = m.you; else got.push(m) })
  await c.subscribeAsync(s.topic)
  const send = (headers) => fetch(`http://127.0.0.1:${s.port}/files`, {
    method: 'POST',
    headers: { 'X-Topic': s.topic, 'X-Pin': s.pin, 'X-Filename': 'a.txt', ...headers },
    body: 'x'
  })
  await send({ 'X-Client-Id': 'web-abc123' })
  await send({})
  await wait(100)
  assert.strictEqual(got[0].from, myId)
  assert.strictEqual(got[1].from, undefined)
  c.end(true)
  await s.close()
})
