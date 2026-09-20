import type { ReactNode } from 'react'
import { Grip, Plus } from './Icons'

export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="add-btn" onClick={onClick}>
      <Plus />
      <span>{label}</span>
    </button>
  )
}

export function DeleteButton({
  onClick,
  label = '삭제',
  title,
}: {
  onClick: () => void
  label?: string
  title?: string
}) {
  return (
    <button type="button" className="delete-btn" onClick={onClick} title={title ?? label}>
      {label}
    </button>
  )
}

/**
 * 드래그 소스는 이 손잡이 자체다.
 * <button>은 크로미움이 드래그 시작을 막는 경우가 있어 span에 role을 준다.
 */
export function DragHandle(props: Record<string, unknown>) {
  return (
    <span
      className="drag-handle"
      role="button"
      tabIndex={0}
      title="드래그해서 순서 변경 (방향키로도 이동)"
      aria-label="순서 변경"
      {...props}
    >
      <Grip />
    </span>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {hint ? <span className="field-hint">{hint}</span> : null}
      </span>
      {children}
    </label>
  )
}

export function Section({
  id,
  index,
  title,
  subtitle,
  tone,
  aside,
  children,
}: {
  id?: string
  index: string
  title: string
  subtitle?: string
  tone: 'blue' | 'beige' | 'green' | 'plain'
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <section className={`section tone-${tone}`} id={id}>
      <header className="section-head">
        <div className="section-head-text">
          <span className="section-index">{index}</span>
          <h2 className="section-title">{title}</h2>
          {subtitle ? <p className="section-subtitle">{subtitle}</p> : null}
        </div>
        {aside ? <div className="section-aside">{aside}</div> : null}
      </header>
      {children}
    </section>
  )
}
