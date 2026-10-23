import type { CSSProperties } from 'react'
import { publicAssetsApi } from '@/api/public-assets/public-assets.api'
import c from './ThemedIcon.module.scss'

type IconSource =
    | { iconId: number; src?: never }
    | { src: string; iconId?: never }

type ThemedIconProps = IconSource & {
    size?: number
    color?: CSSProperties['color']
    className?: string
} & (
        | { decorative?: true; label?: never }
        | { decorative: false; label: string }
    )

export function ThemedIcon({
    iconId,
    src,
    size = 24,
    color = 'currentColor',
    className,
    decorative = true,
    label,
}: ThemedIconProps) {
    const source = src ?? publicAssetsApi.fileUrl(iconId)

    const maskImage = `url(${JSON.stringify(source)})`

    return (
        <span
            className={`${c.icon} ${className ?? ''}`}
            style={{
                width: size,
                height: size,
                color,
                maskImage,
                WebkitMaskImage: maskImage,
            }}
            role={decorative ? undefined : 'img'}
            aria-label={decorative ? undefined : label}
            aria-hidden={decorative ? true : undefined}
        />
    )
}
