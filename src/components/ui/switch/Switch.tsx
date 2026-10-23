'use client'

import type { ComponentProps } from 'react'
import c from './Switch.module.scss'

export function Switch({
    checked,
    onChange,
    className = '',
    ...props
}: Omit<ComponentProps<'button'>, 'onChange' | 'onClick' | 'aria-checked'> & {
    checked: boolean
    onChange: (checked: boolean) => void
}) {
    return (
        <button
            {...props}
            type="button"
            role="switch"
            aria-checked={checked}
            className={`${c.switch} ${checked ? c.checked : ''} ${className}`}
            onClick={() => onChange(!checked)}
        >
            <span className={c.thumb} />
        </button>
    )
}
