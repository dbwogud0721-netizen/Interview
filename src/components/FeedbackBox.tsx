import AutoTextarea from './AutoTextarea'

interface Props {
  value: string
  onChange: (value: string) => void
  /** 스크린 리더용: 어떤 항목에 대한 첨삭인지 */
  target: string
}

/**
 * 다른 사람이 남기는 첨삭 칸. 본문과 구분되도록 빨간 펜 느낌의 색을 쓴다.
 * 비어 있으면 인쇄(PDF)에서는 숨긴다.
 */
export default function FeedbackBox({ value, onChange, target }: Props) {
  const empty = value.trim().length === 0
  return (
    <div className={empty ? 'feedback-box feedback-empty' : 'feedback-box'}>
      <span className="feedback-label">
        <PenIcon />
        첨삭
      </span>
      <AutoTextarea
        className="feedback-textarea"
        minRows={1}
        value={value}
        ariaLabel={`${target} 첨삭`}
        placeholder="고칠 점이나 의견을 남겨주세요."
        onChange={onChange}
      />
    </div>
  )
}

function PenIcon() {
  return (
    <svg
      width={13}
      height={13}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable={false}
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}
