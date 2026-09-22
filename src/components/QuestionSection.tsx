import { memo } from 'react'
import AutoTextarea from './AutoTextarea'
import MemoNote from './MemoNote'
import { Chevron } from './Icons'
import { AddButton, DeleteButton, DragHandle, Field, Section } from './ui'
import { useDragReorder } from '../hooks/useDragReorder'
import type { QuestionItem } from '../types'

interface CardProps {
  item: QuestionItem
  index: number
  onPatch: (id: string, patch: Partial<QuestionItem>) => void
  onRemove: (id: string) => void
  dragProps: Record<string, unknown>
  handleProps: Record<string, unknown>
  /** 인쇄 중에는 접힌 카드도 펼쳐야 답변이 PDF에 들어간다. */
  forceExpanded?: boolean
}

const QuestionCard = memo(function QuestionCard({
  item,
  index,
  onPatch,
  onRemove,
  dragProps,
  handleProps,
  forceExpanded,
}: CardProps) {
  const bodyId = `q-body-${item.id}`
  const answered = item.answer.trim().length
  const collapsed = item.collapsed && !forceExpanded

  return (
    <article className="card q-card" {...dragProps}>
      <div className="q-head">
        <DragHandle {...handleProps} />
        <span className="q-badge">Q{index + 1}</span>
        <div className="q-title-wrap">
          <AutoTextarea
            className="q-title-input"
            minRows={1}
            value={item.question}
            ariaLabel={`예상 질문 ${index + 1}`}
            placeholder="예상 질문을 적어보세요."
            focusKey={`question-${item.id}`}
            onChange={(question) => onPatch(item.id, { question })}
          />
        </div>
        <div className="q-actions">
          {collapsed && answered > 0 ? <span className="mini-note">답변 {answered}자</span> : null}
          <button
            type="button"
            className="icon-btn"
            aria-expanded={!collapsed}
            aria-controls={bodyId}
            title={collapsed ? '펼치기' : '접기'}
            onClick={() => onPatch(item.id, { collapsed: !item.collapsed })}
          >
            <span className={collapsed ? 'chev' : 'chev chev-open'}>
              <Chevron />
            </span>
          </button>
          <DeleteButton onClick={() => onRemove(item.id)} />
        </div>
      </div>

      {collapsed ? null : (
        <div className="q-body" id={bodyId}>
          <Field label="내 답변" hint={`${item.answer.length}자`}>
            <AutoTextarea
              minRows={3}
              value={item.answer}
              ariaLabel="내 답변"
              placeholder="실제로 말할 문장 그대로 적어두면 좋아요."
              onChange={(answer) => onPatch(item.id, { answer })}
            />
          </Field>
          <div className="q-subgrid">
            <Field label="꼬리 질문">
              <AutoTextarea
                value={item.followUp}
                ariaLabel="꼬리 질문"
                placeholder="이어서 나올 만한 질문은?"
                onChange={(followUp) => onPatch(item.id, { followUp })}
              />
            </Field>
            <Field label="메모">
              <AutoTextarea
                value={item.memo}
                ariaLabel="메모"
                placeholder="말투, 표정, 보완할 점 등"
                onChange={(memo) => onPatch(item.id, { memo })}
              />
            </Field>
          </div>
        </div>
      )}
    </article>
  )
})

interface Props {
  items: QuestionItem[]
  onPatch: (id: string, patch: Partial<QuestionItem>) => void
  onRemove: (id: string) => void
  onAdd: () => void
  onReorder: (from: number, to: number) => void
  onToggleAll: (collapsed: boolean) => void
  memo: string
  onMemoChange: (value: string) => void
  printing?: boolean
}

export default function QuestionSection({
  items,
  onPatch,
  onRemove,
  onAdd,
  onReorder,
  onToggleAll,
  memo,
  onMemoChange,
  printing,
}: Props) {
  const { handleProps, itemProps } = useDragReorder(onReorder)
  const allCollapsed = items.length > 0 && items.every((q) => q.collapsed)

  return (
    <Section
      id="questions"
      index="02"
      title="예상 질문 및 답변"
      subtitle="질문 번호는 순서에 따라 자동으로 다시 매겨집니다."
      tone="beige"
      aside={
        <>
          <span className="pill pill-beige">총 {items.length}개</span>
          {items.length > 0 ? (
            <button type="button" className="ghost-btn" onClick={() => onToggleAll(!allCollapsed)}>
              {allCollapsed ? '모두 펼치기' : '모두 접기'}
            </button>
          ) : null}
        </>
      }
    >
      <div className="card-list">
        {items.map((item, index) => (
          <QuestionCard
            key={item.id}
            item={item}
            index={index}
            onPatch={onPatch}
            onRemove={onRemove}
            dragProps={itemProps(index)}
            handleProps={handleProps(index, items.length)}
            forceExpanded={printing}
          />
        ))}
        {items.length === 0 ? <p className="empty">아직 질문이 없습니다. 아래에서 추가해보세요.</p> : null}
      </div>
      <AddButton label="질문 추가" onClick={onAdd} />

      <MemoNote
        tone="beige"
        description={'공통적으로 반복되는 답변, 꼭 준비해야 할 질문, 답변하면서 자주 막히는 부분, 면접 연습 중 발견한 문제 등을 자유롭게 적어보세요.'}
        value={memo}
        ariaLabel="예상 질문 추가 메모"
        onChange={onMemoChange}
      />
    </Section>
  )
}
