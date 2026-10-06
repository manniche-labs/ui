import {
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react'
import { useReducedMotion } from '@/registry/manniche/hooks/use-reduced-motion'
import { cn } from '@/lib/utils'

export type KeycapProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Width of the key in pixels. The key is 72px square on top, with 6px of travel below. */
  width?: number
  /** Where the legend sits: large in the middle, or small in the top-left corner (for `esc`, `shift`, `tab`). */
  legend?: 'center' | 'corner'
  /** Latch on each press, like a held modifier, with a small light in the corner. Adds `aria-pressed`. */
  latch?: boolean
  /** Controlled latched state, with `latch`. */
  pressed?: boolean
  /** Latched state on the first render, when uncontrolled. */
  defaultPressed?: boolean
  /** Called when a latching key is pressed, with its new state. */
  onPressedChange?: (pressed: boolean) => void
  /** Hold the key down from outside, e.g. to mirror a key pressed on the real keyboard. */
  down?: boolean
}

const EASE = 'ease-[cubic-bezier(0.23,1,0.32,1)]'
// How far the cap leans towards the point that is pressed, in degrees from centre to edge.
const TILT = 4.5

/**
 * A mechanical key: a cap on a darker base, with 6px of travel and a hard bottom-out. Pressed by the pointer it leans a
 * little towards where it was pressed; Enter and Space press it straight down. With `latch` it stays partly down and
 * lights its corner until it is pressed again, and reports that as `aria-pressed`. Pass `down` to show a press that
 * happened elsewhere. Under reduced motion it moves without easing and does not lean.
 */
export function Keycap({
  width = 72,
  legend = 'center',
  latch = false,
  pressed: pressedProp,
  defaultPressed = false,
  onPressedChange,
  down = false,
  type = 'button',
  className,
  style,
  children,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onLostPointerCapture,
  onKeyDown,
  onKeyUp,
  onBlur,
  ...rest
}: KeycapProps) {
  const reduce = useReducedMotion()
  const [held, setHeld] = useState(false)
  const [pressedState, setPressedState] = useState(defaultPressed)
  const pressed = latch && (pressedProp ?? pressedState)
  const el = useRef<HTMLButtonElement>(null)

  const tilt = (x: number, y: number) => {
    el.current?.style.setProperty('--rx', `${(-y * TILT * 2).toFixed(2)}deg`)
    el.current?.style.setProperty('--ry', `${(x * TILT * 2).toFixed(2)}deg`)
  }

  const state = held || down ? 'down' : pressed ? 'latched' : undefined

  return (
    <button
      ref={el}
      type={type}
      aria-pressed={latch ? pressed : undefined}
      data-state={state}
      onPointerDown={(e: PointerEvent<HTMLButtonElement>) => {
        onPointerDown?.(e)
        if (e.button !== 0) return
        e.currentTarget.setPointerCapture?.(e.pointerId)
        const r = e.currentTarget.getBoundingClientRect()
        if (reduce) tilt(0, 0)
        else tilt((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5)
        setHeld(true)
      }}
      onPointerUp={(e: PointerEvent<HTMLButtonElement>) => {
        onPointerUp?.(e)
        setHeld(false)
      }}
      onPointerCancel={(e: PointerEvent<HTMLButtonElement>) => {
        onPointerCancel?.(e)
        setHeld(false)
      }}
      onLostPointerCapture={(e: PointerEvent<HTMLButtonElement>) => {
        onLostPointerCapture?.(e)
        setHeld(false)
      }}
      onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
        onKeyDown?.(e)
        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
          tilt(0, 0)
          setHeld(true)
        }
      }}
      onKeyUp={(e: KeyboardEvent<HTMLButtonElement>) => {
        onKeyUp?.(e)
        if (e.key === ' ' || e.key === 'Enter') setHeld(false)
      }}
      onBlur={(e: FocusEvent<HTMLButtonElement>) => {
        onBlur?.(e)
        setHeld(false)
      }}
      onClick={(e: MouseEvent<HTMLButtonElement>) => {
        onClick?.(e)
        if (!latch || e.defaultPrevented) return
        if (pressedProp === undefined) setPressedState(!pressed)
        onPressedChange?.(!pressed)
      }}
      style={{ width, height: 78, ...style } as CSSProperties}
      className={cn(
        'group/kc relative shrink-0 cursor-pointer touch-manipulation rounded-xl border-0 bg-transparent p-0 text-foreground perspective-[300px] [-webkit-tap-highlight-color:transparent] [--t:6px]',
        '[--hi:color-mix(in_oklab,white_70%,transparent)] [--side:color-mix(in_oklab,var(--muted),var(--foreground)_13%)]',
        'dark:[--hi:color-mix(in_oklab,white_14%,transparent)] dark:[--side:color-mix(in_oklab,var(--background),black_42%)]',
        'outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...rest}
    >
      {/* The base: the side wall you see below the cap. */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-(--t) bottom-0 rounded-xl bg-(--side) shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_10%,transparent),0_10px_16px_-12px_rgb(0_0_0/0.55)]"
      />
      {/* The cap: travels the full depth when down, rests 2px higher when latched. */}
      <span
        className={cn(
          'absolute inset-x-0 top-0 bottom-(--t) grid place-items-center rounded-xl bg-card',
          'shadow-[inset_0_0_0_1px_var(--border),inset_0_1px_0_var(--hi),inset_0_-3px_0_color-mix(in_oklab,var(--foreground)_6%,transparent)]',
          "before:absolute before:rounded-lg before:bg-[linear-gradient(180deg,color-mix(in_oklab,var(--foreground)_5%,transparent),transparent_72%)] before:content-[''] before:[inset:7px_7px_10px]",
          'transition-[transform] duration-150 group-data-[state=down]/kc:duration-70 motion-reduce:transition-none',
          'group-data-[state=down]/kc:[transform:translateY(var(--t))_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))]',
          'group-data-[state=latched]/kc:[transform:translateY(calc(var(--t)-2px))]',
          EASE,
        )}
      >
        {latch && (
          <span
            aria-hidden
            className={cn(
              'absolute top-[11px] size-[5px] rounded-full shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_30%,transparent)]',
              legend === 'corner' ? 'right-[11px]' : 'left-[11px]',
            )}
          >
            <span
              className={cn(
                'absolute inset-0 rounded-full bg-primary opacity-0 transition-opacity duration-100 group-aria-pressed/kc:opacity-100 motion-reduce:transition-none',
                EASE,
              )}
            />
          </span>
        )}
        <span
          className={cn(
            'relative leading-none',
            legend === 'corner'
              ? 'absolute top-[11px] left-[11px] font-mono text-[11px] font-medium tracking-[0.02em]'
              : 'font-sans text-[22px] font-normal',
          )}
        >
          {children}
        </span>
      </span>
    </button>
  )
}
