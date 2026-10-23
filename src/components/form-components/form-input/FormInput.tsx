'use client'

import { useId, useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import c from './FormInput.module.scss'

export function FormInput({
    label,
    hint,
    type,
    ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
    const id = useId()

    const [visible, setVisible] = useState(false)

    const password = type === 'password'

    return (
        <div className={c.field}>
            <label htmlFor={id}>{label}</label>
            <div className={c.control}>
                <input
                    {...props}
                    id={id}
                    type={password && visible ? 'text' : type}
                    aria-describedby={hint ? `${id}-hint` : undefined}
                    className={password ? c.password : undefined}
                />
                {password && (
                    <button
                        type="button"
                        onClick={() => setVisible(!visible)}
                        aria-label={visible ? 'Ukryj hasło' : 'Pokaż hasło'}
                        aria-pressed={visible}
                        disabled={props.disabled}
                    >
                        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                )}
            </div>
            {hint && (
                <span id={`${id}-hint`} className={c.hint}>
                    {hint}
                </span>
            )}
        </div>
    )
}
