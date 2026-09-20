import type { InterviewData, IntroItem, QuestionItem, TermCategory, TermItem } from './types'
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

export function emptyQuestion(): QuestionItem {
  return { id: uid('q'), question: '', answer: '', followUp: '', memo: '', collapsed: false }
}

export function emptyTerm(category: TermCategory = '기본 용어'): TermItem {
  return { id: uid('t'), term: '', description: '', category }
}

const DEFAULT_INTRO_LABELS = ['도입', '핵심 경험 및 역량', '지원 동기', '포부 및 마무리']

export function createInitialData(): InterviewData {
  return {
    version: 2,
    date: today(),
    intro: DEFAULT_INTRO_LABELS.map((label) => ({ id: uid('intro'), label, value: '', fixed: true })),
    introMemo: '',
    questions: [emptyQuestion(), emptyQuestion(), emptyQuestion()],
    questionsMemo: '',
    terms: [emptyTerm()],
    vocabularyMemo: '',
  }
}

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
const bool = (v: unknown, fallback = false): boolean => (typeof v === 'boolean' ? v : fallback)

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
    ? o.intro.map((item, i) => {
        const r = (item ?? {}) as Record<string, unknown>
        return {
          id: str(r.id) || uid('intro'),
          label: str(r.label, DEFAULT_INTRO_LABELS[i] ?? '항목'),
          value: str(r.value),
          fixed: bool(r.fixed, i < DEFAULT_INTRO_LABELS.length),
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
          followUp: str(r.followUp),
          memo: str(r.memo),
          collapsed: bool(r.collapsed),
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
        }
      })
    : base.terms

  return {
    version: 2,
    date: str(o.date, base.date),
    intro: intro.length ? intro : base.intro,
    introMemo: str(o.introMemo),
    questions,
    questionsMemo: str(o.questionsMemo),
    terms,
    vocabularyMemo: str(o.vocabularyMemo),
  }
}

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
