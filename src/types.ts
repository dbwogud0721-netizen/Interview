export const TERM_CATEGORIES = ['기본 용어', '직무 관련 용어', '기타'] as const
export type TermCategory = (typeof TERM_CATEGORIES)[number]

/** 1분 자기소개의 한 구성 요소. fixed 항목은 삭제되지 않는 기본 항목. */
export interface IntroItem {
  id: string
  label: string
  value: string
  fixed: boolean
}

export interface QuestionItem {
  id: string
  question: string
  answer: string
  followUp: string
  memo: string
  /** 아코디언 접힘 상태. 접혀도 DOM에서 제거만 할 뿐 내용은 보존된다. */
  collapsed: boolean
}

export interface TermItem {
  id: string
  term: string
  description: string
  category: TermCategory
}

export interface InterviewData {
  version: 2
  date: string
  intro: IntroItem[]
  introMemo: string
  questions: QuestionItem[]
  questionsMemo: string
  terms: TermItem[]
  vocabularyMemo: string
}
