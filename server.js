import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import fsp from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { pathToFileURL } from 'node:url'
import { Aedes } from 'aedes'
import { WebSocketServer, createWebSocketStream } from 'ws'

const MQTT_JS = fs.readFileSync(new URL('./node_modules/mqtt/dist/mqtt.min.js', import.meta.url))
const INDEX = fs.readFileSync(new URL('./public/index.html', import.meta.url))

const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf', '.txt', '.zip', '.docx', '.xlsx', '.pptx', '.hwp'])

const isLocal = (req) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)

// 경로 조작(../, 폴더 구분자)과 제어문자를 없앤 파일 이름
const cleanName = (name) => path.basename(name.replace(/\\/g, '/')).replace(/[\x00-\x1f<>:"|?*]/g, '_').slice(0, 200)

export async function startSession (port = 8080, { maxFileBytes = 100 * 1024 * 1024, fileTtlMs = 30 * 60 * 1000 } = {}) {
  // 랜덤 토픽: 추측해서 들어오기 어렵게 함
  const topic = 'room/' + crypto.randomBytes(8).toString('hex')
  // 세션 전용 임시 폴더. 종료 시 통째로 지움
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'mqtt-share-'))
  const files = new Map() // id -> { name, size, timer }

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
    if (req.method === 'POST' && req.url === '/files') return upload(req, res)
    const fileId = req.method === 'GET' && req.url.match(/^\/files\/([0-9a-f]{32})$/)?.[1]
    if (fileId) return download(fileId, res)
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

  const notify = (msg) => broker.publish({ topic, payload: JSON.stringify(msg), qos: 0, retain: false }, () => {})

  // 파일은 MQTT가 아닌 HTTP로 받고, MQTT로는 알림만 보냄
  async function upload (req, res) {
    const fail = (code, msg) => { res.statusCode = code; res.end(msg) }
    if (req.headers['x-topic'] !== topic) return fail(403, '토픽이 맞지 않습니다.')
    let name
    try { name = cleanName(decodeURIComponent(req.headers['x-filename'] || '')) } catch { return fail(400, '파일 이름이 잘못되었습니다.') }
    if (!ALLOWED_EXT.has(path.extname(name).toLowerCase())) return fail(415, '허용되지 않는 파일 형식입니다.')
    if (Number(req.headers['content-length']) > maxFileBytes) return fail(413, '파일이 너무 큽니다.')

    const id = crypto.randomBytes(16).toString('hex')
    const file = path.join(dir, id)
    let size = 0
    // content-length 없이 보내도 크기 제한이 지켜지게 받으면서 셈
    const limit = new Transform({
      transform (chunk, _, cb) {
        size += chunk.length
        cb(size > maxFileBytes ? new Error('too large') : null, chunk)
      }
    })
    try {
      await pipeline(req, limit, fs.createWriteStream(file))
    } catch {
      await fsp.rm(file, { force: true, maxRetries: 3 })
      return fail(size > maxFileBytes ? 413 : 400, size > maxFileBytes ? '파일이 너무 큽니다.' : '업로드가 중단되었습니다.')
    }

    const timer = setTimeout(() => removeFile(id), fileTtlMs)
    files.set(id, { name, size, timer })
    notify({ type: 'file', id, name, size, expiresAt: Date.now() + fileTtlMs })
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ id }))
  }

  function download (id, res) {
    const f = files.get(id)
    if (!f) { res.statusCode = 404; return res.end() }
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Length', f.size)
    // attachment: 브라우저가 열지 않고 저장만 하게 함
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(f.name)}`)
    res.setHeader('X-Content-Type-Options', 'nosniff')
    fs.createReadStream(path.join(dir, id)).on('error', () => res.destroy()).pipe(res)
  }

  async function removeFile (id) {
    const f = files.get(id)
    if (!f) return
    clearTimeout(f.timer)
    files.delete(id)
    await fsp.rm(path.join(dir, id), { force: true, maxRetries: 3 })
    notify({ type: 'file-removed', id })
  }

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
      for (const f of files.values()) clearTimeout(f.timer)
      files.clear()
      await fsp.rm(dir, { recursive: true, force: true, maxRetries: 5 })
      server.emit('session-closed')
    },
    server,
    dir
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
