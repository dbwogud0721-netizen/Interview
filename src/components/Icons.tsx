interface IconProps {
  size?: number
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
})

export const ArrowLeft = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </svg>
)

export const Plus = ({ size = 15 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
)

export const Chevron = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
)

export const Search = ({ size = 15 }: IconProps) => (
  <svg {...base(size)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </svg>
)

export const Grip = ({ size = 14 }: IconProps) => (
  <svg {...base(size)} strokeWidth={2.2}>
    <circle cx="9" cy="6" r="0.6" />
    <circle cx="9" cy="12" r="0.6" />
    <circle cx="9" cy="18" r="0.6" />
    <circle cx="15" cy="6" r="0.6" />
    <circle cx="15" cy="12" r="0.6" />
    <circle cx="15" cy="18" r="0.6" />
  </svg>
)

export const Download = ({ size = 15 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M12 3v12" />
    <path d="m7 11 5 5 5-5" />
    <path d="M4 20h16" />
  </svg>
)

export const Upload = ({ size = 15 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M12 16V4" />
    <path d="m7 8 5-5 5 5" />
    <path d="M4 20h16" />
  </svg>
)

export const Trash = ({ size = 15 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M4 7h16" />
    <path d="M9 7V5h6v2" />
    <path d="M6 7l1 13h10l1-13" />
  </svg>
)
