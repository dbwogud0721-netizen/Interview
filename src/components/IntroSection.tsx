import { memo, useMemo } from 'react'
import AutoTextarea from './AutoTextarea'
import FeedbackBox from './FeedbackBox'
import MemoNote from './MemoNote'
import { AddButton, DeleteButton, Section } from './ui'
import type { IntroItem } from '../types'

/** 한국어 기준 대략 초당 5자 정도를 말한다고 보고 예상 시간을 추정한다. */
const CHARS_PER_SECOND = 5

export function estimateSeconds(items: IntroItem[]): number {
  const chars = items.reduce((sum, item) => sum + item.value.replace(/\s/g, '').length, 0)
  return Math.round(chars / CHARS_PER_SECOND)
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}초`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s === 0 ? `${m}분` : `${m}분 ${s}초`
}

interface RowProps {
  item: IntroItem
  onPatch: (id: string, patch: Partial<IntroItem>) => void
  onRemove: (id: string) => void
}

const IntroRow = memo(function IntroRow({ item, onPatch, onRemove }: RowProps) {
  return (
    <div className="intro-row">
      <div className="intro-row-head">
        <input
          className="text-input intro-label-input"
          value={item.label}
          placeholder="항목 제목 (예: 도입 / 핵심 경험 / 지원 동기)"
          aria-label="항목 제목"
          data-focus-key={`intro-label-${item.id}`}
          onChange={(e) => onPatch(item.id, { label: e.target.value })}
        />
        <DeleteButton onClick={() => onRemove(item.id)} />
      </div>
      <AutoTextarea
        value={item.value}
        ariaLabel={item.label || '내용'}
        placeholder="내용을 자유롭게 적어보세요."
        onChange={(value) => onPatch(item.id, { value })}
      />
      <div className="char-count">{item.value.length}자</div>
      <FeedbackBox
        value={item.feedback}
        target={item.label || '자기소개 항목'}
        onChange={(feedback) => onPatch(item.id, { feedback })}
      />
    </div>
  )
})

interface Props {
  items: IntroItem[]
  onPatch: (id: string, patch: Partial<IntroItem>) => void
  onRemove: (id: string) => void
  onAdd: () => void
  memo: string
  onMemoChange: (value: string) => void
}

export default function IntroSection({ items, onPatch, onRemove, onAdd, memo, onMemoChange }: Props) {
  const seconds = useMemo(() => estimateSeconds(items), [items])

  return (
    <Section
      id="intro"
      index="01"
      title="1분 자기소개"
      subtitle="항목을 직접 추가해서 원하는 순서로 구성하세요."
      tone="blue"
      aside={
        <span className="pill pill-blue" aria-live="polite">
          예상 말하기 시간 <strong>{formatDuration(seconds)}</strong>
        </span>
      }
    >
      <div className="intro-grid">
        {items.map((item) => (
          <IntroRow key={item.id} item={item} onPatch={onPatch} onRemove={onRemove} />
        ))}
      </div>
      {items.length === 0 ? (
        <p className="empty">아직 항목이 없습니다. 아래에서 추가해보세요.</p>
      ) : null}
      <AddButton label="항목 추가" onClick={onAdd} />

      <MemoNote
        tone="blue"
        description="면접에서 강조할 점, 수정할 문장, 기억해야 할 내용 등을 자유롭게 적어보세요."
        value={memo}
        ariaLabel="자기소개 추가 메모"
        onChange={onMemoChange}
      />
    </Section>
  )
}
