import { memo, useMemo, useState } from 'react'
import AutoTextarea from './AutoTextarea'
import FeedbackBox from './FeedbackBox'
import MemoNote from './MemoNote'
import { Search } from './Icons'
import { AddButton, DeleteButton, DragHandle, Field, Section } from './ui'
import { useDragReorder } from '../hooks/useDragReorder'
import { TERM_CATEGORIES } from '../types'
import type { TermCategory, TermItem } from '../types'

interface CardProps {
  item: TermItem
  onPatch: (id: string, patch: Partial<TermItem>) => void
  onRemove: (id: string) => void
  dragProps: Record<string, unknown>
  handleProps: Record<string, unknown>
}

const TermCard = memo(function TermCard({ item, onPatch, onRemove, dragProps, handleProps }: CardProps) {
  return (
    <article className="card term-card" {...dragProps}>
      <div className="term-head">
        <DragHandle {...handleProps} />
        <input
          className="text-input term-input"
          value={item.term}
          placeholder="용어 (예: DOF)"
          aria-label="용어"
          data-focus-key={`term-${item.id}`}
          onChange={(e) => onPatch(item.id, { term: e.target.value })}
        />
        <select
          className="select"
          value={item.category}
          aria-label="카테고리 (다른 카테고리를 고르면 해당 탭으로 옮겨갑니다)"
          onChange={(e) => onPatch(item.id, { category: e.target.value as TermCategory })}
        >
          {TERM_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <DeleteButton onClick={() => onRemove(item.id)} />
      </div>
      <Field label="내가 이해한 설명">
        <AutoTextarea
          value={item.description}
          ariaLabel="내가 이해한 설명"
          placeholder={'예) Depth of Field.\n초점이 유지되는 상태에서 피사체를 앞뒤로 움직일 수 있는 범위.'}
          onChange={(description) => onPatch(item.id, { description })}
        />
      </Field>
      <FeedbackBox
        value={item.feedback}
        target={item.term || '용어'}
        onChange={(feedback) => onPatch(item.id, { feedback })}
      />
    </article>
  )
})

interface Props {
  items: TermItem[]
  onPatch: (id: string, patch: Partial<TermItem>) => void
  onRemove: (id: string) => void
  onAdd: (category: TermCategory) => void
  onReorder: (from: number, to: number) => void
  memo: string
  onMemoChange: (value: string) => void
  printing?: boolean
}

export default function TermSection({
  items,
  onPatch,
  onRemove,
  onAdd,
  onReorder,
  memo,
  onMemoChange,
  printing,
}: Props) {
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<TermCategory>(TERM_CATEGORIES[0])
  const { handleProps, itemProps } = useDragReorder(onReorder)

  // 인쇄 중에는 검색어와 선택된 카테고리를 무시하고 모든 단어를 카테고리별로 내보낸다.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => {
        if (printing) return true
        if (item.category !== activeTab) return false
        if (!q) return true
        return item.term.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
      })
  }, [items, query, activeTab, printing])

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    items.forEach((t) => map.set(t.category, (map.get(t.category) ?? 0) + 1))
    return map
  }, [items])

  return (
    <Section
      id="terms"
      index="03"
      title="단어장 / 직무 용어"
      subtitle="카테고리별로 창이 나뉘어 있습니다. 탭을 눌러 이동하세요."
      tone="green"
      aside={<span className="pill pill-green">총 {items.length}개</span>}
    >
      <div className="term-toolbar">
        <div className="search-box">
          <Search />
          <input
            className="search-input"
            type="search"
            value={query}
            placeholder="용어 검색 (예: DOF)"
            aria-label="용어 검색"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="tab-row" role="tablist" aria-label="단어장 카테고리">
        {TERM_CATEGORIES.map((cat, i) => (
          <button
            key={cat}
            type="button"
            role="tab"
            aria-selected={cat === activeTab}
            className={cat === activeTab ? 'tab tab-on' : 'tab'}
            onClick={() => setActiveTab(cat)}
          >
            <span className="tab-index">{i + 1}</span>
            {cat}
            <span className="tab-count">{counts.get(cat) ?? 0}</span>
          </button>
        ))}
      </div>

      {printing ? (
        TERM_CATEGORIES.map((cat) => {
          const group = visible.filter(({ item }) => item.category === cat)
          if (group.length === 0) return null
          return (
            <div key={cat} className="term-print-group">
              <h3 className="term-print-heading">{cat}</h3>
              <div className="term-grid">
                {group.map(({ item, index }) => (
                  <TermCard
                    key={item.id}
                    item={item}
                    onPatch={onPatch}
                    onRemove={onRemove}
                    dragProps={itemProps(index)}
                    handleProps={handleProps(index, items.length)}
                  />
                ))}
              </div>
            </div>
          )
        })
      ) : (
        <div className="term-grid" role="tabpanel">
          {visible.map(({ item, index }) => (
            <TermCard
              key={item.id}
              item={item}
              onPatch={onPatch}
              onRemove={onRemove}
              dragProps={itemProps(index)}
              handleProps={handleProps(index, items.length)}
            />
          ))}
        </div>
      )}
      {!printing && visible.length === 0 ? (
        <p className="empty">
          {counts.get(activeTab) ? '검색 조건에 맞는 단어가 없습니다.' : `"${activeTab}"에 아직 단어가 없습니다. 아래에서 추가해보세요.`}
        </p>
      ) : null}
      <AddButton label="단어 추가" onClick={() => onAdd(activeTab)} />

      <MemoNote
        tone="green"
        description="추가로 공부해야 할 개념, 서로 연결되는 용어, 면접에서 설명하기 어려운 부분 등을 자유롭게 적어보세요."
        value={memo}
        ariaLabel="단어장 추가 메모"
        onChange={onMemoChange}
      />
    </Section>
  )
}
