'use client'

import { useId, type InputHTMLAttributes } from 'react'
import c from './TextInput.module.scss'

interface Props
    extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
    inputTitle: string
    value: string
    onChange: (value: string) => void
    hint?: string
}

export function TextInput({
    inputTitle,
    value,
    onChange,
    hint,
    id,
    className = '',
    'aria-describedby': describedBy,
    ...props
}: Props) {
    const generatedId = useId()

    const fieldId = id ?? generatedId

    const description = [describedBy, hint ? `${fieldId}-hint` : undefined]
        .filter(Boolean)
        .join(' ')

    return (
        <div className={c.field}>
            <label className={c.label} htmlFor={fieldId}>
                {inputTitle}
            </label>
            <input
                type="text"
                {...props}
                id={fieldId}
                className={`${c.input} ${className}`}
                value={value}
                aria-describedby={description || undefined}
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
