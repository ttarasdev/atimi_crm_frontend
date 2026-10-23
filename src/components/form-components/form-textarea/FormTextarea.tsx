'use client'

import { useId, type TextareaHTMLAttributes } from 'react'
import c from './FormTextarea.module.scss'

export function FormTextarea({
    inputTitle,
    value,
    onChange,
    id,
    className = '',
    hint,
    'aria-describedby': describedBy,
    ...props
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> & {
    inputTitle: string
    value: string
    onChange: (value: string) => void
    hint?: string
}) {
    const generatedId = useId()

    const fieldId = id ?? generatedId

    return (
        <div className={c.field}>
            <label htmlFor={fieldId}>{inputTitle}</label>
            <textarea
                {...props}
                id={fieldId}
                className={`${c.input} ${className}`}
                value={value}
                aria-describedby={
                    [describedBy, hint ? `${fieldId}-hint` : undefined]
                        .filter(Boolean)
                        .join(' ') || undefined
                }
                onChange={(event) => onChange(event.target.value)}
            />
            {hint && (
                <p id={`${fieldId}-hint`} className={c.hint}>
                    {hint}
                </p>
            )}
        </div>
    )
}
