import { useCallback, useState } from 'react'

/**
 * 카드 순서를 드래그로 바꾸는 최소 구현.
 *
 * 드래그 소스는 카드가 아니라 손잡이다. 카드 전체를 draggable로 두면 카드 안
 * textarea에서 텍스트 선택이 막히고, 반대로 "누를 때만 카드를 draggable로 켜는" 방식은
 * 크로미움이 mousedown 시점의 상태로 드래그 시작 여부를 판단해 동작하지 않는다.
 * 손잡이를 잡고 끌면 드래그 이미지로 카드 전체를 보여준다.
 *
 * 터치에서는 네이티브 DnD가 동작하지 않으므로 손잡이에 포커스를 두고
 * 위/아래 방향키로도 이동할 수 있게 해 둔다.
 */
export function useDragReorder(onReorder: (from: number, to: number) => void) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  const reset = useCallback(() => {
    setDragIndex(null)
    setOverIndex(null)
  }, [])

  const handleProps = useCallback(
    (index: number, total: number) => ({
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        setDragIndex(index)
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', String(index))
        const card = (e.currentTarget as HTMLElement).closest('.card, .intro-row')
        if (card) e.dataTransfer.setDragImage(card, 24, 20)
      },
      onDragEnd: reset,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowUp' && index > 0) {
          e.preventDefault()
          onReorder(index, index - 1)
        } else if (e.key === 'ArrowDown' && index < total - 1) {
          e.preventDefault()
          onReorder(index, index + 1)
        }
      },
    }),
    [onReorder, reset],
  )

  const itemProps = useCallback(
    (index: number) => ({
      'data-drag-over':
        overIndex === index && dragIndex !== null && dragIndex !== index ? '' : undefined,
      'data-dragging': dragIndex === index ? '' : undefined,
      onDragOver: (e: React.DragEvent) => {
        if (dragIndex === null) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        if (overIndex !== index) setOverIndex(index)
      },
      onDrop: (e: React.DragEvent) => {
        if (dragIndex === null) return
        e.preventDefault()
        if (dragIndex !== index) onReorder(dragIndex, index)
        reset()
      },
    }),
    [dragIndex, overIndex, onReorder, reset],
  )

  return { handleProps, itemProps }
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list
  const next = list.slice()
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}
