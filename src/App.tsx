import { useCallback, useEffect, useRef, useState } from 'react'
import IntroSection from './components/IntroSection'
import QuestionSection from './components/QuestionSection'
import TermSection from './components/TermSection'
import { ArrowLeft, Download, Trash, Upload } from './components/Icons'
import { moveItem } from './hooks/useDragReorder'
import { createInitialData, emptyIntro, emptyQuestion, emptyTerm, loadData, normalize, saveData } from './storage'
import type { InterviewData, IntroItem, QuestionItem, TermCategory, TermItem } from './types'

type SaveState = 'idle' | 'saving' | 'saved'

const MAIN_TABS = [
  { key: 'intro', label: '1분 자기소개', tone: 'blue' },
  { key: 'questions', label: '예상 질문 & 답변', tone: 'beige' },
  { key: 'terms', label: '단어장 / 직무 용어', tone: 'green' },
] as const
type MainTabKey = (typeof MAIN_TABS)[number]['key']

export default function App() {
  const [data, setData] = useState<InterviewData>(() => loadData())
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<MainTabKey>('intro')
  /** 인쇄(PDF 저장) 중에는 선택된 탭만이 아니라 세 탭을 모두 펼쳐서 렌더한다. */
  const [printing, setPrinting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const firstRender = useRef(true)

  // 입력이 멈춘 뒤 잠깐 기다렸다가 저장한다. 타이핑 한 글자마다 직렬화하지 않기 위해서다.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    setSaveState('saving')
    const timer = window.setTimeout(() => {
      try {
        saveData(data)
        setSaveState('saved')
      } catch {
        setSaveState('idle')
        window.alert('저장 공간이 가득 찼거나 브라우저가 저장을 막고 있어 자동 저장에 실패했습니다.')
      }
    }, 400)
    return () => window.clearTimeout(timer)
  }, [data])

  // PDF 저장은 브라우저 인쇄 기능을 쓴다. 별도 라이브러리 없이 한글 폰트가 그대로 나온다.
  // 세 탭이 모두 DOM에 올라오고 textarea 높이 계산이 끝난 다음 프레임에 인쇄 창을 연다.
  useEffect(() => {
    if (!printing) return

    const originalTitle = document.title
    // 크롬은 document.title을 PDF 기본 파일명으로 쓴다.
    document.title = `면접노트-${data.date || 'export'}`

    const finish = () => setPrinting(false)
    window.addEventListener('afterprint', finish)

    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => window.print())
    })

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('afterprint', finish)
      document.title = originalTitle
    }
  }, [printing, data.date])

  // 새로 만든 입력칸으로 포커스와 스크롤을 옮긴다. 렌더가 끝난 뒤에 DOM에서 찾는다.
  useEffect(() => {
    if (!focusKey) return
    const el = document.querySelector<HTMLElement>(`[data-focus-key="${focusKey}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.focus({ preventScroll: true })
    }
    setFocusKey(null)
  }, [focusKey])

  /* ---------- 자기소개 ---------- */
  const patchIntro = useCallback((id: string, patch: Partial<IntroItem>) => {
    setData((d) => ({ ...d, intro: d.intro.map((i) => (i.id === id ? { ...i, ...patch } : i)) }))
  }, [])

  const removeIntro = useCallback((id: string) => {
    setData((d) => ({ ...d, intro: d.intro.filter((i) => i.id !== id) }))
  }, [])

  const addIntro = useCallback(() => {
    const item = emptyIntro()
    setData((d) => ({ ...d, intro: [...d.intro, item] }))
    setFocusKey(`intro-label-${item.id}`)
  }, [])

  const setIntroMemo = useCallback((introMemo: string) => {
    setData((d) => ({ ...d, introMemo }))
  }, [])

  /* ---------- 예상 질문 ---------- */
  const patchQuestion = useCallback((id: string, patch: Partial<QuestionItem>) => {
    setData((d) => ({ ...d, questions: d.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)) }))
  }, [])

  const removeQuestion = useCallback((id: string) => {
    setData((d) => ({ ...d, questions: d.questions.filter((q) => q.id !== id) }))
  }, [])

  const addQuestion = useCallback(() => {
    const item = emptyQuestion()
    setData((d) => ({ ...d, questions: [...d.questions, item] }))
    setFocusKey(`question-${item.id}`)
  }, [])

  const reorderQuestions = useCallback((from: number, to: number) => {
    setData((d) => ({ ...d, questions: moveItem(d.questions, from, to) }))
  }, [])

  const toggleAllQuestions = useCallback((collapsed: boolean) => {
    setData((d) => ({ ...d, questions: d.questions.map((q) => ({ ...q, collapsed })) }))
  }, [])

  const setQuestionsMemo = useCallback((questionsMemo: string) => {
    setData((d) => ({ ...d, questionsMemo }))
  }, [])

  /* ---------- 단어장 ---------- */
  const patchTerm = useCallback((id: string, patch: Partial<TermItem>) => {
    setData((d) => ({ ...d, terms: d.terms.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))
  }, [])

  const removeTerm = useCallback((id: string) => {
    setData((d) => ({ ...d, terms: d.terms.filter((t) => t.id !== id) }))
  }, [])

  const addTerm = useCallback((category: TermCategory) => {
    const item = emptyTerm(category)
    setData((d) => ({ ...d, terms: [...d.terms, item] }))
    setFocusKey(`term-${item.id}`)
  }, [])

  const reorderTerms = useCallback((from: number, to: number) => {
    setData((d) => ({ ...d, terms: moveItem(d.terms, from, to) }))
  }, [])

  const setVocabularyMemo = useCallback((vocabularyMemo: string) => {
    setData((d) => ({ ...d, vocabularyMemo }))
  }, [])

  /* ---------- 상단 동작 ---------- */
  const goBack = useCallback(() => {
    if (window.history.length <= 1) {
      window.location.href = '/'
      return
    }
    // history.length만으로는 "뒤로 갈 곳이 실제로 있는지"를 늘 알 수 없다.
    // back()을 부른 뒤에도 페이지를 벗어나지 않으면 메인으로 보낸다.
    const fallback = window.setTimeout(() => {
      window.location.href = '/'
    }, 400)
    window.addEventListener('pagehide', () => window.clearTimeout(fallback), { once: true })
    window.history.back()
  }, [])

  const exportPdf = useCallback(() => setPrinting(true), [])

  const importJson = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = normalize(JSON.parse(String(reader.result)))
        setData(parsed)
        window.alert('불러오기가 완료되었습니다.')
      } catch {
        window.alert('JSON 파일을 읽지 못했습니다. 내보내기로 만든 파일인지 확인해주세요.')
      }
    }
    reader.readAsText(file)
  }, [])

  const resetAll = useCallback(() => {
    if (!window.confirm('작성한 내용이 모두 지워집니다. 정말 초기화할까요?')) return
    setData(createInitialData())
  }, [])

  return (
    <div className="page">
      <div className="shell">
        <button type="button" className="back-btn" onClick={goBack}>
          <ArrowLeft />
          <span>뒤로 가기</span>
        </button>

        <header className="page-head">
          <div className="page-head-main">
            <p className="eyebrow">Interview Note</p>
            <h1 className="page-title">INTERVIEW PREPARATION</h1>
            <p className="page-subtitle">Better Me, A Brighter Tomorrow</p>
          </div>

          <div className="page-head-side">
            <label className="date-field">
              <span className="date-label">DATE</span>
              <input
                type="date"
                className="date-input"
                value={data.date}
                onChange={(e) => setData((d) => ({ ...d, date: e.target.value }))}
              />
            </label>
            <div className="toolbar">
              <span className={`save-state save-${saveState}`} role="status" aria-live="polite">
                <span className="save-dot" />
                {saveState === 'saving' ? '저장 중...' : saveState === 'saved' ? '저장됨' : '자동 저장'}
              </span>
              <button type="button" className="ghost-btn" onClick={exportPdf}>
                <Download />
                <span>PDF 내보내기</span>
              </button>
              <button type="button" className="ghost-btn" onClick={() => fileInputRef.current?.click()}>
                <Upload />
                <span>JSON 불러오기</span>
              </button>
              <button type="button" className="ghost-btn ghost-danger" onClick={resetAll}>
                <Trash />
                <span>전체 초기화</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="visually-hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) importJson(file)
                  e.target.value = ''
                }}
              />
            </div>
          </div>
        </header>

        <nav className="main-tabs" role="tablist" aria-label="면접 노트 탭">
          {MAIN_TABS.map((tab, i) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              className={
                activeTab === tab.key ? `main-tab tab-${tab.tone} main-tab-on` : `main-tab tab-${tab.tone}`
              }
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="main-tab-index">{String(i + 1).padStart(2, '0')}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        <main className="stack">
          {printing || activeTab === 'intro' ? (
            <IntroSection
              items={data.intro}
              onPatch={patchIntro}
              onRemove={removeIntro}
              onAdd={addIntro}
              memo={data.introMemo}
              onMemoChange={setIntroMemo}
            />
          ) : null}

          {printing || activeTab === 'questions' ? (
            <QuestionSection
              items={data.questions}
              onPatch={patchQuestion}
              onRemove={removeQuestion}
              onAdd={addQuestion}
              onReorder={reorderQuestions}
              onToggleAll={toggleAllQuestions}
              memo={data.questionsMemo}
              onMemoChange={setQuestionsMemo}
              printing={printing}
            />
          ) : null}

          {printing || activeTab === 'terms' ? (
            <TermSection
              items={data.terms}
              onPatch={patchTerm}
              onRemove={removeTerm}
              onAdd={addTerm}
              onReorder={reorderTerms}
              memo={data.vocabularyMemo}
              onMemoChange={setVocabularyMemo}
              printing={printing}
            />
          ) : null}
        </main>

        <footer className="page-foot">
          <span>모든 내용은 이 브라우저에만 저장됩니다.</span>
          <span>Better Me, A Brighter Tomorrow</span>
        </footer>
      </div>
    </div>
  )
}
