import { test } from 'node:test'
import assert from 'node:assert'
import os from 'node:os'
import { startSession, lanAddresses } from '../server.js'

test('참여자 주소는 이 PC의 실제 주소 중에서 고르고, 기본 경로가 있으면 하나만 보여 준다', async () => {
  const mine = Object.values(os.networkInterfaces()).flat().filter((a) => a.family === 'IPv4' && !a.internal).map((a) => a.address)
  const addrs = await lanAddresses(8080)
  for (const a of addrs) assert.ok(mine.some((ip) => a === `http://${ip}:8080`), a)
  // 네트워크가 여러 개여도(핫스팟 등) 인터넷에 연결돼 있으면 하나만
  if (mine.length > 1 && addrs.length > 1) assert.fail(`주소가 여러 개: ${addrs}`)
})

test('알려 준 참여자 주소로 실제로 페이지가 열린다', async () => {
  const s = await startSession(0)
  const [addr] = await lanAddresses(s.port)
  if (addr) assert.strictEqual((await fetch(addr + '/')).status, 200)
  await s.close()
})
