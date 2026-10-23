'use client'

import {
    useEffect,
    useId,
    useRef,
    useSyncExternalStore,
    type ReactNode,
    type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button/Button'
import c from './Popup.module.scss'

const subscribe = () => () => {}

export function Popup({
    open = true,
    title,
    description,
    children,
    footer,
    onClose,
    closeDisabled = false,
    fallbackFocusRef,
    size = 'default',
}: {
    open?: boolean
    title: string
    description?: string
    children: ReactNode
    footer?: ReactNode
    onClose: () => void
    closeDisabled?: boolean
    fallbackFocusRef?: RefObject<HTMLElement | null>
    size?: 'default' | 'wide'
}) {
    const ready = useSyncExternalStore(
        subscribe,
        () => true,
        () => false,
    )

    const titleId = useId()

    const descriptionId = useId()

    const dialog = useRef<HTMLDialogElement>(null)

    useEffect(() => {
        const element = dialog.current

        if (!element || !open) return

        const previous = document.activeElement

        const fallback = fallbackFocusRef?.current

        const overflow = document.body.style.overflow

        document.body.style.overflow = 'hidden'

        element.showModal()

        return () => {
            element.close()

            document.body.style.overflow = overflow

            if (previous instanceof HTMLElement && previous.isConnected)
                previous.focus({ preventScroll: true })
            else if (fallback?.isConnected)
                fallback.focus({ preventScroll: true })
        }
    }, [open, ready, fallbackFocusRef])

    if (!ready || !open) return null

    return createPortal(
        <dialog
            ref={dialog}
            className={c.overlay}
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            onCancel={(event) => {
                event.preventDefault()

                if (!closeDisabled) onClose()
            }}
            onClick={(event) => {
                if (!closeDisabled && event.target === event.currentTarget)
                    onClose()
            }}
        >
            <div
                className={`${c.panel} ${size === 'wide' ? c.wide : ''}`}
                data-popup-panel
            >
                <header className={c.header}>
                    <div>
                        <h2 id={titleId}>{title}</h2>
                        {description && <p id={descriptionId}>{description}</p>}
                    </div>
                    <Button
                        type="button"
                        className={c.close}
                        onClick={onClose}
                        disabled={closeDisabled}
                        aria-label="Zamknij okno"
                    >
                        <X size={20} aria-hidden="true" />
                    </Button>
                </header>
                <div className={c.content}>{children}</div>
                {footer && <footer className={c.footer}>{footer}</footer>}
            </div>
        </dialog>,
        document.body,
    )
}
