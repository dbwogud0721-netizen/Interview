/**
 * 3-way 병합. base(마지막으로 서버와 맞췄던 내용)를 기준으로
 * local(내가 바꾼 것)과 remote(그사이 다른 사람이 저장한 것)를 칸 단위로 합친다.
 *
 * - 한쪽만 바꾼 칸은 바꾼 쪽을 따른다.
 * - 같은 칸을 둘 다 바꿨다면 내 것(local)을 남긴다.
 * - id가 있는 배열(항목 목록)은 항목별로 합친다. 어느 한쪽이 지운 항목은 지우고,
 *   어느 한쪽이 새로 만든 항목은 살린다. 순서는 내가 순서를 바꿨으면 내 순서, 아니면 상대 순서.
 */

type Json = unknown

export function deepEqual(a: Json, b: Json): boolean {
  if (a === b) return true
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a)) {
    const bb = b as Json[]
    return a.length === bb.length && a.every((v, i) => deepEqual(v, bb[i]))
  }
  const ao = a as Record<string, Json>
  const bo = b as Record<string, Json>
  const keys = Object.keys(ao)
  return keys.length === Object.keys(bo).length && keys.every((k) => k in bo && deepEqual(ao[k], bo[k]))
}

const isPlainObject = (v: Json): v is Record<string, Json> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const hasId = (v: Json): v is { id: string } & Record<string, Json> =>
  isPlainObject(v) && typeof v.id === 'string'

function isIdList(v: Json): v is Array<{ id: string } & Record<string, Json>> {
  return Array.isArray(v) && v.every(hasId)
}

function mergeIdLists(
  base: Array<{ id: string }>,
  local: Array<{ id: string }>,
  remote: Array<{ id: string }>,
): Json[] {
  const baseMap = new Map(base.map((x) => [x.id, x]))
  const localMap = new Map(local.map((x) => [x.id, x]))
  const remoteMap = new Map(remote.map((x) => [x.id, x]))

  const keep = (id: string) => {
    const inBase = baseMap.has(id)
    const inLocal = localMap.has(id)
    const inRemote = remoteMap.has(id)
    if (inBase) return inLocal && inRemote // 한쪽이라도 지웠으면 지운다
    return inLocal || inRemote // 새로 만든 항목은 살린다
  }

  const baseOrder = base.map((x) => x.id).filter((id) => localMap.has(id) && remoteMap.has(id))
  const localOrder = local.map((x) => x.id).filter((id) => baseMap.has(id) && remoteMap.has(id))
  const localReordered = !deepEqual(baseOrder, localOrder)
  const primary = localReordered ? local : remote
  const secondary = localReordered ? remote : local

  const ids: string[] = []
  const seen = new Set<string>()
  const push = (id: string) => {
    if (!seen.has(id) && keep(id)) {
      seen.add(id)
      ids.push(id)
    }
  }
  primary.forEach((x) => push(x.id))
  // 반대쪽에만 있는 새 항목은 원래 앞에 있던 항목 바로 뒤에 끼워 넣는다.
  secondary.forEach((x, i) => {
    if (seen.has(x.id) || !keep(x.id)) return
    const prev = i > 0 ? secondary[i - 1].id : null
    const at = prev ? ids.indexOf(prev) + 1 : 0
    ids.splice(at > 0 ? at : prev ? ids.length : 0, 0, x.id)
    seen.add(x.id)
  })

  return ids.map((id) => {
    const l = localMap.get(id)
    const r = remoteMap.get(id)
    const b = baseMap.get(id)
    if (l && r) return merge3(b ?? r, l, r)
    return l ?? r
  })
}

export function merge3<T>(base: T, local: T, remote: T): T {
  if (deepEqual(local, base)) return remote
  if (deepEqual(remote, base) || deepEqual(local, remote)) return local

  if (isIdList(base) && isIdList(local) && isIdList(remote)) {
    return mergeIdLists(base, local, remote) as T
  }
  if (isPlainObject(base) && isPlainObject(local) && isPlainObject(remote)) {
    const out: Record<string, Json> = {}
    const keys = new Set([...Object.keys(local), ...Object.keys(remote)])
    keys.forEach((k) => {
      out[k] = merge3(base[k], local[k], remote[k])
    })
    return out as T
  }
  // 같은 칸을 양쪽이 다르게 바꿨다: 지금 내가 보고 있는 내 것을 남긴다.
  return local
}
