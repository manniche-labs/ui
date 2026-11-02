// A grey stand-in for content that has not arrived yet. It has a fixed size, so the page does not move when the real
// content replaces it: give it the width and height of what it stands for. It pulses slowly; under reduced motion it
// stands still as a flat grey block. The colour is the theme's `muted`, so it follows light and dark by itself.
// Screen readers skip it (`aria-hidden`): the region around it says that something is loading (see loading-region).
import type { ComponentPropsWithoutRef, CSSProperties } from 'react'
import { cn } from '@/lib/utils'

type Size = number | string

const px = (v: Size | undefined) => (typeof v === 'number' ? `${v}px` : v)

export type SkeletonProps = Omit<ComponentPropsWithoutRef<'div'>, 'children' | 'style'> & {
  /** Width of the block. A number is pixels; a string is any CSS length ("100%", "12rem"). Default "100%". */
  width?: Size
  /** Height of the block, the same units. Default 16. */
  height?: Size
  /** A circle of the given `width` (and the same height), for avatars. */
  circle?: boolean
  /** Classes for the block. */
  className?: string
}

export function Skeleton({ width = '100%', height = 16, circle = false, className, ...rest }: SkeletonProps) {
  const style: CSSProperties = { width: px(width), height: px(circle ? width : height) }
  return (
    <div
      aria-hidden="true"
      {...rest}
      style={style}
      className={cn('max-w-full shrink-0 bg-muted motion-safe:animate-pulse', circle ? 'rounded-full' : 'rounded-md', className)}
    />
  )
}

export type SkeletonTextProps = Omit<ComponentPropsWithoutRef<'div'>, 'children' | 'style'> & {
  /** How many lines. Default 3. */
  lines?: number
  /** Height of each line in pixels. Default 14. */
  lineHeight?: number
  /** Space between the lines in pixels. Default 8. */
  gap?: number
  /** Width of the last line, as a share of the box. Default "60%". */
  lastLineWidth?: Size
  /** Classes for the box. */
  className?: string
}

/** Lines of text, the last one shorter. Its height is lines x lineHeight + gaps, so it can match a paragraph. */
export function SkeletonText({ lines = 3, lineHeight = 14, gap = 8, lastLineWidth = '60%', className, ...rest }: SkeletonTextProps) {
  const count = Math.max(1, Math.floor(lines))
  return (
    <div aria-hidden="true" {...rest} className={cn('flex w-full flex-col', className)} style={{ gap }}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} height={lineHeight} width={i === count - 1 && count > 1 ? lastLineWidth : '100%'} />
      ))}
    </div>
  )
}
