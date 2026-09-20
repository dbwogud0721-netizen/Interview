import AutoTextarea from './AutoTextarea'

interface Props {
  tone: 'blue' | 'beige' | 'green'
  description: string
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  placeholder?: string
}

/** 탭 전용 메모. 카드처럼 무겁지 않게, 본문 아래로 부드럽게 이어지는 노트 형태. */
export default function MemoNote({ tone, description, value, onChange, ariaLabel, placeholder }: Props) {
  return (
    <div className={`memo-note memo-${tone}`}>
      <h3 className="memo-title">추가 메모</h3>
      <p className="memo-desc">{description}</p>
      <AutoTextarea
        className="memo-textarea"
        minRows={5}
        value={value}
        ariaLabel={ariaLabel}
        placeholder={placeholder}
        onChange={onChange}
      />
    </div>
  )
}
