'use client'

import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { Upload } from 'lucide-react'
import c from './MediaFileInput.module.scss'

interface Props
    extends Omit<
        InputHTMLAttributes<HTMLInputElement>,
        'type' | 'value' | 'onChange' | 'multiple'
    > {
    setFile: (file: File | null) => void
    value?: File | null
    inputTitle?: string
    hint?: string
    preview?: ReactNode
}

export function MediaFileInput({
    setFile,
    value,
    inputTitle = 'Plik',
    hint,
    preview,
    className = '',
    ...props
}: Props) {
    const id = useId()

    return (
        <div className={`${c.field} ${className}`}>
            <label className={c.label} htmlFor={id}>
                {inputTitle}
            </label>
            <div className={c.control}>
                <input
                    {...props}
                    id={id}
                    type="file"
                    className={c.input}
                    aria-describedby={hint ? `${id}-hint` : undefined}
                    onChange={(event) =>
                        setFile(event.target.files?.[0] ?? null)
                    }
                />
                <div className={c.preview}>
                    {preview ?? <Upload size={26} aria-hidden="true" />}
                </div>
                <div className={c.selection} aria-hidden="true">
                    <strong>{value?.name ?? 'Wybierz plik'}</strong>
                    <span>
                        {value
                            ? 'Kliknij, aby zmienić plik'
                            : 'Kliknij, aby wybrać z komputera'}
                    </span>
                </div>
            </div>
            {hint && (
                <p id={`${id}-hint`} className={c.hint}>
                    {hint}
                </p>
            )}
        </div>
    )
}
