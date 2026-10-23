import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import c from './SettingsRow.module.scss'

export function SettingsRow({
    title,
    description,
    icon,
    href,
    children,
    onClick,
    disabled,
}: {
    title: string
    description?: string
    icon: ReactNode
    href?: string
    children?: ReactNode
    onClick?: () => void
    disabled?: boolean
}) {
    const content = (
        <>
            <span className={c.icon} aria-hidden="true">
                {icon}
            </span>
            <span className={c.content}>
                <strong>{title}</strong>
                {description && <span>{description}</span>}
            </span>
            {href || onClick ? (
                <ChevronRight
                    className={c.arrow}
                    size={17}
                    aria-hidden="true"
                />
            ) : (
                children
            )}
        </>
    )

    if (href)
        return (
            <Link className={`${c.row} ${c.link}`} href={href}>
                {content}
            </Link>
        )

    if (onClick)
        return (
            <button
                type="button"
                className={`${c.row} ${c.link} ${c.button}`}
                onClick={onClick}
                disabled={disabled}
                aria-label={title}
            >
                {content}
            </button>
        )

    return <div className={c.row}>{content}</div>
}
