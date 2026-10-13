import type { FollowUpItem, InterviewData, IntroItem, QuestionItem, TermCategory, TermItem } from './types'
import { TERM_CATEGORIES } from './types'

export const STORAGE_KEY = 'interview-note:v1'

let seq = 0
export function uid(prefix = 'id'): string {
  seq += 1
  return `${prefix}-${Date.now().toString(36)}-${seq.toString(36)}`
}

function today(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function emptyFollowUp(): FollowUpItem {
  return { id: uid('fu'), text: '' }
}

export function emptyQuestion(): QuestionItem {
  return { id: uid('q'), question: '', answer: '', followUps: [emptyFollowUp()], collapsed: false, feedback: '' }
}

export function emptyTerm(category: TermCategory = '기본 용어'): TermItem {
  return { id: uid('t'), term: '', description: '', category, feedback: '' }
}

export function emptyIntro(): IntroItem {
  return { id: uid('intro'), label: '', value: '', feedback: '' }
}

export function createInitialData(): InterviewData {
  return {
    version: 2,
    date: today(),
    intro: [emptyIntro()],
    introMemo: '',
    questions: [emptyQuestion(), emptyQuestion(), emptyQuestion()],
    questionsMemo: '',
    terms: [emptyTerm()],
    vocabularyMemo: '',
  }
}

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
const bool = (v: unknown, fallback = false): boolean => (typeof v === 'boolean' ? v : fallback)

/** 꼬리 질문이 하나뿐인 문자열(followUp)로 저장돼 있던 예전 데이터도 그대로 살린다. */
function normalizeFollowUps(r: Record<string, unknown>): FollowUpItem[] {
  if (Array.isArray(r.followUps)) {
    return r.followUps.map((f) => {
      const o = (f ?? {}) as Record<string, unknown>
      return { id: str(o.id) || uid('fu'), text: str(o.text) }
    })
  }
  const legacy = str(r.followUp)
  return [{ id: uid('fu'), text: legacy }]
}

function asCategory(v: unknown): TermCategory {
  return TERM_CATEGORIES.includes(v as TermCategory) ? (v as TermCategory) : '기본 용어'
}

/**
 * 외부에서 들어온 값(localStorage / 불러온 JSON)을 앱이 기대하는 형태로 정규화한다.
 * 필드가 비거나 깨져 있어도 화면이 죽지 않도록 항상 완전한 InterviewData를 돌려준다.
 */
export function normalize(raw: unknown): InterviewData {
  const base = createInitialData()
  if (!raw || typeof raw !== 'object') return base
  const o = raw as Record<string, unknown>

  const intro: IntroItem[] = Array.isArray(o.intro)
    ? o.intro.map((item) => {
        const r = (item ?? {}) as Record<string, unknown>
        return {
          id: str(r.id) || uid('intro'),
          label: str(r.label),
          value: str(r.value),
          feedback: str(r.feedback),
        }
      })
    : base.intro

  const questions: QuestionItem[] = Array.isArray(o.questions)
    ? o.questions.map((item) => {
        const r = (item ?? {}) as Record<string, unknown>
        return {
          id: str(r.id) || uid('q'),
          question: str(r.question),
          answer: str(r.answer),
          followUps: normalizeFollowUps(r),
          collapsed: bool(r.collapsed),
          feedback: str(r.feedback),
        }
      })
    : base.questions

  const terms: TermItem[] = Array.isArray(o.terms)
    ? o.terms.map((item) => {
        const r = (item ?? {}) as Record<string, unknown>
        return {
          id: str(r.id) || uid('t'),
          term: str(r.term),
          description: str(r.description),
          category: asCategory(r.category),
          feedback: str(r.feedback),
        }
      })
    : base.terms

  return {
    version: 2,
    date: str(o.date, base.date),
    intro,
    introMemo: str(o.introMemo),
    questions,
    questionsMemo: str(o.questionsMemo),
    terms,
    vocabularyMemo: str(o.vocabularyMemo),
  }
}

/** 서버 동기화 전에 화면을 바로 띄우기 위한 로컬 사본. 서버가 없을 때는 이것만 쓴다. */
export function loadData(): InterviewData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createInitialData()
    return normalize(JSON.parse(raw))
  } catch {
    return createInitialData()
  }
}

export function saveData(data: InterviewData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
