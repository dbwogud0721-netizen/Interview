import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { deepEqual, merge3 } from './merge'
import { loadData, normalize, saveData } from './storage'
import type { InterviewData } from './types'

/**
 * 서버(공유 저장소)와 화면 데이터를 맞춰주는 훅.
 *
 * - 입력이 멈추면 잠깐 뒤 서버에 저장한다. 그사이 다른 사람이 저장했다면 칸 단위로 합쳐서 다시 저장한다.
 * - 몇 초마다(그리고 창으로 돌아올 때마다) 서버를 확인해서 다른 사람이 쓴 내용을 불러온다.
 * - 서버 저장소가 아직 연결되지 않았거나 인터넷이 끊기면 이 브라우저에만 저장하고, 다시 연결되면 이어서 맞춘다.
 */

export type SyncStatus = 'connecting' | 'saving' | 'saved' | 'offline' | 'local'

const API = '/api/data'
const SAVE_DELAY = 600
const POLL_INTERVAL = 4000
const SYNCED_FLAG = 'interview-note:synced'

interface RemoteDoc {
  version: number
  data: InterviewData | null
}

class NotConfigured extends Error {}

async function fetchRemote(): Promise<RemoteDoc> {
  const res = await fetch(API, { cache: 'no-store' })
  if (res.status === 503 || res.status === 404) throw new NotConfigured()
  if (!res.ok) throw new Error(`load ${res.status}`)
  const body = await res.json()
  // 배포 환경이 아닌 곳(로컬 개발 서버)에서는 /api 대신 index.html이 돌아올 수 있다.
  if (typeof body?.version !== 'number') throw new NotConfigured()
  return { version: body.version, data: body.data ? normalize(body.data) : null }
}

type SaveResult = { ok: true; version: number } | { ok: false; version: number; data: InterviewData }

async function pushRemote(data: InterviewData, baseVersion: number): Promise<SaveResult> {
  const res = await fetch(API, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, baseVersion }),
  })
  if (res.status === 409) {
    const body = await res.json()
    return { ok: false, version: body.version, data: normalize(body.data) }
  }
  if (!res.ok) throw new Error(`save ${res.status}`)
  const body = await res.json()
  return { ok: true, version: body.version }
}

/** 처음 만들 때 생기는 빈 칸은 서버에 올릴 때 굳이 끼워 넣지 않는다. */
function withoutBlankItems(d: InterviewData): InterviewData {
  return {
    ...d,
    intro: d.intro.filter((i) => i.label.trim() || i.value.trim() || i.feedback.trim()),
    questions: d.questions.filter(
      (q) => q.question.trim() || q.answer.trim() || q.feedback.trim() || q.followUps.some((f) => f.text.trim()),
    ),
    terms: d.terms.filter((t) => t.term.trim() || t.description.trim() || t.feedback.trim()),
  }
}

const BLANK: InterviewData = {
  version: 2,
  date: '',
  intro: [],
  introMemo: '',
  questions: [],
  questionsMemo: '',
  terms: [],
  vocabularyMemo: '',
}

function readFlag(): boolean {
  try {
    return localStorage.getItem(SYNCED_FLAG) === '1'
  } catch {
    return false
  }
}

function writeFlag(): void {
  try {
    localStorage.setItem(SYNCED_FLAG, '1')
  } catch {
    /* 저장 공간 문제는 무시한다. 서버가 원본이다. */
  }
}

export function useSyncedData(): {
  data: InterviewData
  setData: Dispatch<SetStateAction<InterviewData>>
  status: SyncStatus
} {
  const [data, setDataState] = useState<InterviewData>(() => loadData())
  const [status, setStatus] = useState<SyncStatus>('connecting')

  const dataRef = useRef(data)
  /** 마지막으로 서버와 일치했던 문서. 병합의 기준점이다. */
  const syncedRef = useRef<InterviewData | null>(null)
  const versionRef = useRef(0)
  const modeRef = useRef<'pending' | 'remote' | 'local'>('pending')
  const busyRef = useRef(false)
  const saveTimer = useRef<number | undefined>(undefined)

  const setData: Dispatch<SetStateAction<InterviewData>> = useCallback((action) => {
    setDataState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action
      dataRef.current = next
      return next
    })
  }, [])

  /** 서버에서 받은 문서를 지금 화면 내용과 합쳐서 반영한다. */
  const absorbRemote = useCallback(
    (remote: InterviewData, version: number) => {
      const base = syncedRef.current ?? remote
      const merged = merge3(base, dataRef.current, remote)
      syncedRef.current = remote
      versionRef.current = version
      if (!deepEqual(merged, dataRef.current)) setData(merged)
    },
    [setData],
  )

  const refreshStatus = useCallback(() => {
    if (modeRef.current === 'local') return setStatus('local')
    if (modeRef.current === 'pending') return setStatus('offline')
    setStatus(deepEqual(dataRef.current, syncedRef.current) ? 'saved' : 'saving')
  }, [])

  const flush = useCallback(async () => {
    if (modeRef.current !== 'remote' || busyRef.current) return
    if (deepEqual(dataRef.current, syncedRef.current)) return refreshStatus()

    busyRef.current = true
    setStatus('saving')
    const snapshot = dataRef.current
    try {
      const result = await pushRemote(snapshot, versionRef.current)
      if (result.ok) {
        syncedRef.current = snapshot
        versionRef.current = result.version
        writeFlag()
      } else {
        absorbRemote(result.data, result.version)
      }
    } catch {
      busyRef.current = false
      setStatus('offline')
      return // 다음 확인 주기에 다시 시도한다
    }
    busyRef.current = false
    // 저장하는 동안 더 입력했거나 병합으로 내용이 바뀌었으면 이어서 저장한다.
    if (!deepEqual(dataRef.current, syncedRef.current)) {
      window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => void flush(), 50)
    } else {
      refreshStatus()
    }
  }, [absorbRemote, refreshStatus])

  /** 처음 연결: 서버에 내용이 있으면 받아오고, 비어 있으면 이 브라우저 내용을 올린다. */
  const connect = useCallback(async () => {
    try {
      const remote = await fetchRemote()
      modeRef.current = 'remote'
      versionRef.current = remote.version
      const local = withoutBlankItems(dataRef.current)
      const localHasContent = !deepEqual(local, { ...BLANK, date: local.date })

      if (!remote.data) {
        // 서버가 비어 있다: 지금 화면 내용이 첫 원본이 된다.
        syncedRef.current = null
      } else if (!readFlag() && localHasContent) {
        // 서버 연결 전 이 브라우저에만 써 둔 내용이 있다: 서버 내용을 기준으로 빠진 항목만 더한다.
        syncedRef.current = remote.data
        setData(merge3({ ...BLANK, date: remote.data.date }, remote.data, local))
      } else {
        syncedRef.current = remote.data
        setData(remote.data)
        writeFlag()
      }
      await flush()
      refreshStatus()
    } catch (e) {
      if (e instanceof NotConfigured) {
        modeRef.current = 'local'
        setStatus('local')
      } else {
        setStatus('offline')
      }
    }
  }, [flush, refreshStatus, setData])

  const poll = useCallback(async () => {
    if (document.hidden || busyRef.current) return
    if (modeRef.current === 'pending') return void connect()
    if (modeRef.current !== 'remote') return
    try {
      const remote = await fetchRemote()
      if (busyRef.current) return
      if (remote.data && remote.version > versionRef.current) absorbRemote(remote.data, remote.version)
      if (!deepEqual(dataRef.current, syncedRef.current)) void flush()
      else refreshStatus()
    } catch {
      setStatus('offline')
    }
  }, [absorbRemote, connect, flush, refreshStatus])

  useEffect(() => {
    void connect()
    const timer = window.setInterval(() => void poll(), POLL_INTERVAL)
    const onVisible = () => {
      if (!document.hidden) void poll()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
    // 마운트 때 한 번만 연결한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 내용이 바뀌면: 이 브라우저에 사본을 남기고, 입력이 멈춘 뒤 서버에 저장한다.
  useEffect(() => {
    try {
      saveData(data)
    } catch {
      /* 로컬 사본은 보조 수단이다. */
    }
    if (modeRef.current !== 'remote') return
    if (deepEqual(data, syncedRef.current)) return refreshStatus()
    setStatus('saving')
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => void flush(), SAVE_DELAY)
  }, [data, flush, refreshStatus])

  // 탭을 닫기 직전에 아직 못 올린 내용이 있으면 경고한다.
  useEffect(() => {
    const onLeave = (e: BeforeUnloadEvent) => {
      if (modeRef.current === 'remote' && !deepEqual(dataRef.current, syncedRef.current)) {
        void flush()
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [flush])

  return { data, setData, status }
}
