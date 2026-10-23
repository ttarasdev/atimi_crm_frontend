import type { ComponentProps } from 'react'
import { LoaderCircle } from 'lucide-react'
import c from './Button.module.scss'

export function Button({
    children,
    pending = false,
    ...props
}: ComponentProps<'button'> & { pending?: boolean }) {
    return (
        <button
            {...props}
            disabled={pending || props.disabled}
            className={`${c.button} ${props.className ?? ''}`}
            aria-busy={pending}
        >
            {children}
            {pending && (
                <LoaderCircle
                    className={c.spinner}
                    size={18}
                    aria-hidden="true"
                />
            )}
        </button>
    )
}
