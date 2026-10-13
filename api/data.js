/**
 * 면접 노트 공유 저장소.
 *
 * 문서 하나를 Redis(Upstash, Vercel Marketplace)에 JSON으로 두고 버전 번호를 함께 관리한다.
 * 저장할 때 클라이언트가 "내가 마지막으로 본 버전"을 보내고, 그 사이 다른 사람이 저장했다면
 * 덮어쓰지 않고 최신 문서를 돌려준다. 클라이언트는 칸 단위로 합친 뒤 다시 저장한다.
 *
 * 환경 변수: Vercel에서 Upstash Redis를 프로젝트에 연결하면 자동으로 들어온다.
 *   KV_REST_API_URL / KV_REST_API_TOKEN  (또는 UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN)
 */

const DATA_KEY = 'interview-note:data'
const VERSION_KEY = 'interview-note:version'
const MAX_BYTES = 1_000_000

// 버전이 맞을 때만 저장하고 버전을 올린다. 원자적으로 실행되므로 동시 저장에도 안전하다.
const SAVE_SCRIPT = `
local cur = tonumber(redis.call('GET', KEYS[2]) or '0')
if cur ~= tonumber(ARGV[2]) then
  return {0, cur, redis.call('GET', KEYS[1]) or ''}
end
redis.call('SET', KEYS[1], ARGV[1])
redis.call('SET', KEYS[2], cur + 1)
return {1, cur + 1}
`

function config() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  return url && token ? { url, token } : null
}

async function redis(cfg, command) {
  const res = await fetch(cfg.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || body.error) throw new Error(body.error || `redis ${res.status}`)
  return body.result
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

function parseDoc(raw) {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export async function GET() {
  const cfg = config()
  if (!cfg) return json(503, { error: 'not-configured' })
  try {
    const [raw, ver] = await redis(cfg, ['MGET', DATA_KEY, VERSION_KEY])
    return json(200, { version: Number(ver || 0), data: parseDoc(raw) })
  } catch (e) {
    return json(502, { error: 'store-failed', detail: String(e.message || e) })
  }
}

export async function PUT(request) {
  const cfg = config()
  if (!cfg) return json(503, { error: 'not-configured' })

  let body
  try {
    body = await request.json()
  } catch {
    return json(400, { error: 'bad-json' })
  }
  const baseVersion = Number(body?.baseVersion)
  if (!Number.isInteger(baseVersion) || baseVersion < 0 || !body.data || typeof body.data !== 'object') {
    return json(400, { error: 'bad-request' })
  }
  const serialized = JSON.stringify(body.data)
  if (serialized.length > MAX_BYTES) return json(413, { error: 'too-large' })

  try {
    const result = await redis(cfg, ['EVAL', SAVE_SCRIPT, '2', DATA_KEY, VERSION_KEY, serialized, String(baseVersion)])
    if (Number(result[0]) === 1) return json(200, { ok: true, version: Number(result[1]) })
    return json(409, { ok: false, version: Number(result[1]), data: parseDoc(result[2]) })
  } catch (e) {
    return json(502, { error: 'store-failed', detail: String(e.message || e) })
  }
}
