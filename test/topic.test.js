import { test } from 'node:test'
import assert from 'node:assert'
import mqtt from 'mqtt'
import { startSession } from '../server.js'

const connect = (s) => mqtt.connectAsync(`ws://127.0.0.1:${s.port}/mqtt`, { reconnectPeriod: 0, forceNativeWebSocket: true, username: 'guest', password: s.pin })
const setTopic = (s, topic) => fetch(`http://127.0.0.1:${s.port}/host/topic`, { method: 'POST', body: JSON.stringify({ topic }) })

test('시작할 때 호스트가 토픽을 정할 수 있고, 잘못된 토픽은 거부한다', async () => {
  const s = await startSession(0, { topic: '우리반-1' })
  assert.strictEqual(s.topic, '우리반-1')
  await s.close()
  await assert.rejects(startSession(0, { topic: 'a/#' }))
})

test('호스트가 토픽을 바꾸면 참여자에게 알리고 끊으며, 새 토픽만 허용한다', async () => {
  const s = await startSession(0)
  const old = s.topic
  const a = await connect(s)
  await a.subscribeAsync(old)
  const got = []
  a.on('message', (_, p) => { const m = JSON.parse(p); if (m.type !== 'hello') got.push(m) }) // hello: 입장 시 서버가 주는 내 id
  const closed = new Promise((resolve) => a.once('close', resolve))

  const r = await setTopic(s, 'study_room')
  assert.strictEqual(r.status, 200)
  assert.strictEqual((await r.json()).topic, 'study_room')
  await closed
  assert.deepStrictEqual(got, [{ type: 'topic-changed' }])
  a.end(true)

  const b = await connect(s)
  await assert.rejects(b.subscribeAsync(old), (e) => e.packet.granted[0] === 128)
  await b.subscribeAsync('study_room')
  b.end(true)
  await s.close()
})

test('와일드카드나 너무 짧은 토픽, 잘못된 요청은 400', async () => {
  const s = await startSession(0)
  for (const t of ['#', 'a+b', 'x/y', 'ab', 'a'.repeat(41)]) assert.strictEqual((await setTopic(s, t)).status, 400)
  const bad = await fetch(`http://127.0.0.1:${s.port}/host/topic`, { method: 'POST', body: 'not json' })
  assert.strictEqual(bad.status, 400)
  await s.close()
})
