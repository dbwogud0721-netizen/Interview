import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef } from 'react'

/**
 * 창 너비가 바뀌면 줄바꿈이 달라져 높이도 달라진다.
 * textarea마다 resize 리스너를 붙이면 수백 개가 되므로 하나만 두고 구독자에게 뿌린다.
 */
const subscribers = new Set<() => void>()
let pendingFrame = 0

if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    if (pendingFrame) return
    pendingFrame = window.requestAnimationFrame(() => {
      pendingFrame = 0
      subscribers.forEach((fn) => fn())
    })
  })
}

export function autosize(el: HTMLTextAreaElement | null): void {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minRows?: number
  ariaLabel?: string
  /** 새로 추가된 항목으로 포커스를 옮길 때 App이 찾아 쓰는 표식. */
  focusKey?: string
  className?: string
}

const AutoTextarea = forwardRef<HTMLTextAreaElement, Props>(function AutoTextarea(
  { value, onChange, placeholder, minRows = 2, ariaLabel, focusKey, className },
  forwardedRef,
) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null)

  const setRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      innerRef.current = node
      if (typeof forwardedRef === 'function') forwardedRef(node)
      else if (forwardedRef) forwardedRef.current = node
    },
    [forwardedRef],
  )

  // 값이 바뀔 때마다 scrollHeight에 맞춰 높이를 다시 잡는다. 페인트 전에 실행되어 깜빡임이 없다.
  useLayoutEffect(() => {
    autosize(innerRef.current)
  }, [value])

  useEffect(() => {
    const resize = () => autosize(innerRef.current)
    subscribers.add(resize)
    // 웹폰트가 늦게 로드되면 줄 수가 달라지므로 폰트 준비 후 한 번 더 맞춘다.
    document.fonts?.ready.then(resize).catch(() => {})
    return () => {
      subscribers.delete(resize)
    }
  }, [])

  const classes = className ? `auto-textarea ${className}` : 'auto-textarea'
  return (
    <>
      <textarea
        ref={setRef}
        className={classes}
        rows={minRows}
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        data-focus-key={focusKey}
        onChange={(e) => onChange(e.target.value)}
      />
      {/*
        인쇄용 사본. textarea는 페이지 경계에서 나뉘지 못해 긴 글이 잘리므로,
        PDF로 저장할 때는 textarea를 숨기고 같은 모양의 일반 텍스트 블록을 대신 보여준다.
      */}
      <div className={`${classes} print-text`} aria-hidden="true">
        {value || '\u00a0'}
      </div>
    </>
  )
})

export default AutoTextarea
