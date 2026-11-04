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
import QRCode from 'qrcode'

const MQTT_JS = fs.readFileSync(new URL('./node_modules/mqtt/dist/mqtt.min.js', import.meta.url))
const INDEX = fs.readFileSync(new URL('./public/index.html', import.meta.url))

const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf', '.txt', '.zip', '.docx', '.xlsx', '.pptx', '.hwp'])

// 호스트가 정하는 토픽: MQTT 와일드카드(+, #)와 / 를 막기 위해 허용 문자만
const TOPIC_RE = /^[\w가-힣-]{3,40}$/u
const MAX_PIN_TRIES = 5
const PIN_LOCK_MS = 60 * 1000

const isLocal = (req) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)

// 경로 조작(../, 폴더 구분자)과 제어문자를 없앤 파일 이름
const cleanName = (name) => path.basename(name.replace(/\\/g, '/')).replace(/[\x00-\x1f<>:"|?*]/g, '_').slice(0, 200)

export async function startSession (port = 8080, { maxFileBytes = 100 * 1024 * 1024, fileTtlMs = 30 * 60 * 1000, topic: customTopic } = {}) {
  if (customTopic !== undefined && !TOPIC_RE.test(customTopic)) throw new Error('토픽은 한글·영문·숫자·-·_ 로 3~40자여야 합니다.')
  // 호스트가 정하지 않으면 랜덤 토픽: 추측해서 들어오기 어렵게 함
  let topic = customTopic ?? 'room/' + crypto.randomBytes(8).toString('hex')
  // 세션 전용 임시 폴더. 종료 시 통째로 지움
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'mqtt-share-'))
  const files = new Map() // id -> { name, size, timer }
  // 6자리 PIN: 토픽을 알아도 PIN이 없으면 못 들어옴
  const pin = String(crypto.randomInt(0, 1e6)).padStart(6, '0')
  const failures = new Map() // ip -> { count, until }

  // PIN을 5번 틀린 IP는 1분 동안 맞는 PIN도 거부 (마구 넣어 보기 방지)
  function checkPin (ip, given) {
    const f = failures.get(ip)
    if (f?.until > Date.now()) return false
    const a = Buffer.from(String(given))
    const ok = a.length === pin.length && crypto.timingSafeEqual(a, Buffer.from(pin))
    if (ok) {
      failures.delete(ip)
      return true
    }
    const count = (f?.count ?? 0) + 1
    failures.set(ip, count >= MAX_PIN_TRIES ? { count: 0, until: Date.now() + PIN_LOCK_MS } : { count, until: 0 })
    return false
  }

  // 메모리 전용 브로커. 이 세션 토픽 말고는 구독·발행 금지
  const broker = await Aedes.createBroker({
    authenticate (client, username, password, cb) {
      cb(null, checkPin(client.req?.socket.remoteAddress, password ?? ''))
    },
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
    if (req.url === '/host/topic' && req.method === 'POST' && isLocal(req)) return changeTopic(req, res)
    if (req.url === '/host' && isLocal(req)) {
      if (req.method === 'GET') return hostInfo(res)
      if (req.method === 'POST') {
        res.end('ok')
        return session.close()
      }
    }
    res.statusCode = 404
    res.end()
  })

  const notify = (msg) => broker.publish({ topic, payload: JSON.stringify(msg), qos: 0, retain: false }, () => {})

  function hostInfo (res) {
    // QR에는 주소와 토픽만 넣고 PIN은 넣지 않음: 화면을 찍은 사진만으로 들어오지 못하게
    const urls = lanAddresses(session.port).map((a) => `${a}/#t=${encodeURIComponent(topic)}`)
    return Promise.all(urls.map((u) => QRCode.toString(u, { type: 'svg', margin: 1 })))
      .then((qrs) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ topic, pin, joins: urls.map((url, i) => ({ url, qr: qrs[i] })) }))
      })
      .catch(() => { res.statusCode = 500; res.end() })
  }

  // 호스트가 토픽을 바꾸면 옛 토픽 참여자에게 알리고 모두 끊음 (새 토픽으로 다시 입장)
  async function changeTopic (req, res) {
    let body = ''
    try {
      for await (const chunk of req) {
        body += chunk
        if (body.length > 1024) throw new Error('too large')
      }
      body = JSON.parse(body)
    } catch {
      res.statusCode = 400
      return res.end('요청이 잘못되었습니다.')
    }
    const next = typeof body.topic === 'string' ? body.topic.trim() : ''
    if (!TOPIC_RE.test(next)) {
      res.statusCode = 400
      return res.end('토픽은 한글·영문·숫자·-·_ 로 3~40자여야 합니다.')
    }
    if (next !== topic) {
      const old = topic
      topic = next
      await new Promise((resolve) => broker.publish({ topic: old, payload: JSON.stringify({ type: 'topic-changed' }), qos: 0, retain: false }, resolve))
      for (const ws of wss.clients) ws.close()
    }
    hostInfo(res)
  }

  // 파일은 MQTT가 아닌 HTTP로 받고, MQTT로는 알림만 보냄
  async function upload (req, res) {
    const fail = (code, msg) => { res.statusCode = code; res.end(msg) }
    if (req.headers['x-topic'] !== topic) return fail(403, '토픽이 맞지 않습니다.')
    if (!checkPin(req.socket.remoteAddress, req.headers['x-pin'] ?? '')) return fail(403, 'PIN이 맞지 않습니다.')
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
  // req를 넘겨야 authenticate에서 접속한 IP를 알 수 있음
  wss.on('connection', (ws, req) => broker.handle(createWebSocketStream(ws), req))

  await new Promise((resolve) => server.listen(port, '0.0.0.0', resolve))

  let closed = false
  const session = {
    get topic () { return topic },
    pin,
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
  const session = await startSession(Number(process.env.PORT) || 8080, { topic: process.env.TOPIC || undefined })
  console.log(`세션 토픽: ${session.topic}`)
  console.log(`PIN: ${session.pin}`)
  console.log(`호스트 화면: http://localhost:${session.port}`)
  for (const a of lanAddresses(session.port)) console.log(`참여자 접속 주소: ${a}`)
  session.server.on('session-closed', () => {
    console.log('세션 종료: 메시지와 토픽을 모두 지웠습니다.')
    process.exit(0)
  })
  process.on('SIGINT', () => session.close())
}
