'use client'

import type { FormHTMLAttributes } from 'react'
import { FormFooter } from '../form-footer/FormFooter'
import c from './FormContainer.module.scss'

interface Props extends FormHTMLAttributes<HTMLFormElement> {
    error?: string
    isPending?: boolean
    submitTitle?: string
    pendingTitle?: string
    submitDisabled?: boolean
    onCancel?: () => void
}

export function FormContainer({
    children,
    error,
    isPending = false,
    submitTitle = 'Zapisz',
    pendingTitle = 'Zapisywanie…',
    submitDisabled = false,
    onCancel,
    onSubmit,
    className = '',
    ...props
}: Props) {
    return (
        <form
            {...props}
            className={`${c.form} ${className}`}
            aria-busy={isPending}
            onSubmit={(event) => {
                event.preventDefault()

                if (!isPending) onSubmit?.(event)
            }}
        >
            <fieldset disabled={isPending} className={c.fields}>
                {children}
            </fieldset>
            {error && (
                <p className={c.error} role="alert">
                    {error}
                </p>
            )}
            <FormFooter
                title={submitTitle}
                pendingTitle={pendingTitle}
                isPending={isPending}
                submitDisabled={submitDisabled}
                onCancel={onCancel}
            />
        </form>
    )
}
