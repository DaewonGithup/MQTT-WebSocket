import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { Aedes } from 'aedes'
import { WebSocketServer, createWebSocketStream } from 'ws'

const MQTT_JS = fs.readFileSync(new URL('./node_modules/mqtt/dist/mqtt.min.js', import.meta.url))
const INDEX = fs.readFileSync(new URL('./public/index.html', import.meta.url))

const isLocal = (req) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)

export async function startSession (port = 8080) {
  // 랜덤 토픽: 추측해서 들어오기 어렵게 함
  const topic = 'room/' + crypto.randomBytes(8).toString('hex')

  // 메모리 전용 브로커. 이 세션 토픽 말고는 구독·발행 금지
  const broker = await Aedes.createBroker({
    authorizeSubscribe (client, sub, cb) {
      // null을 넘기면 연결은 유지하고 구독만 거부(qos 128)
      cb(null, sub.topic === topic ? sub : null)
    },
    authorizePublish (client, packet, cb) {
      if (packet.topic !== topic) return cb(new Error('topic denied'))
      packet.retain = false // 종료 후 남는 메시지가 없게
      cb(null)
    }
  })

  const server = http.createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    if (req.method === 'GET' && req.url === '/') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      return res.end(INDEX)
    }
    if (req.method === 'GET' && req.url === '/mqtt.min.js') {
      res.setHeader('Content-Type', 'text/javascript')
      return res.end(MQTT_JS)
    }
    // 호스트(이 PC에서 연 브라우저)만 토픽을 보고 세션을 끝낼 수 있음
    if (req.url === '/host' && isLocal(req)) {
      if (req.method === 'GET') {
        res.setHeader('Content-Type', 'application/json')
        return res.end(JSON.stringify({ topic, addresses: lanAddresses(port) }))
      }
      if (req.method === 'POST') {
        res.end('ok')
        return session.close()
      }
    }
    res.statusCode = 404
    res.end()
  })

  const wss = new WebSocketServer({ server, path: '/mqtt' })
  wss.on('connection', (ws) => broker.handle(createWebSocketStream(ws)))

  await new Promise((resolve) => server.listen(port, '0.0.0.0', resolve))

  let closed = false
  const session = {
    topic,
    port: server.address().port,
    async close () {
      if (closed) return
      closed = true
      // 참여자 화면을 비우라고 알린 뒤 모두 끊음
      await new Promise((resolve) => broker.publish({ topic, payload: JSON.stringify({ type: 'session-closed' }), qos: 0, retain: false }, resolve))
      for (const ws of wss.clients) ws.terminate()
      await new Promise((resolve) => broker.close(resolve))
      const closing = new Promise((resolve) => server.close(resolve))
      server.closeAllConnections()
      await closing
      server.emit('session-closed')
    },
    server
  }
  return session
}

function lanAddresses (port) {
  return Object.values(os.networkInterfaces()).flat()
    .filter((a) => a.family === 'IPv4' && !a.internal)
    .map((a) => `http://${a.address}:${port}`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const session = await startSession(Number(process.env.PORT) || 8080)
  console.log(`세션 토픽: ${session.topic}`)
  console.log(`호스트 화면: http://localhost:${session.port}`)
  for (const a of lanAddresses(session.port)) console.log(`참여자 접속 주소: ${a}`)
  session.server.on('session-closed', () => {
    console.log('세션 종료: 메시지와 토픽을 모두 지웠습니다.')
    process.exit(0)
  })
  process.on('SIGINT', () => session.close())
}
