'use client'

import { useEffect, useRef, useState, useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Ellipsis } from 'lucide-react'
import c from './ActionMenu.module.scss'

interface ActionMenuItem {
    label: string
    icon?: ReactNode
    onSelect: () => void
    disabled?: boolean
    danger?: boolean
}

export function ActionMenu({
    label,
    items,
    disabled,
}: {
    label: string
    items: ActionMenuItem[]
    disabled?: boolean
}) {
    const id = useId()

    const trigger = useRef<HTMLButtonElement>(null)

    const menu = useRef<HTMLDivElement>(null)

    const [position, setPosition] = useState<{ top: number; right: number }>()

    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)

    const close = (restoreFocus = false) => {
        setPosition(undefined)

        if (restoreFocus) trigger.current?.focus()
    }

    useEffect(() => {
        if (!position) return

        const element = menu.current

        const reposition = () => {
            const box = trigger.current?.getBoundingClientRect()

            if (!element || !box) return

            const below = box.bottom + 4

            element.style.top = `${Math.max(8, below + element.offsetHeight > window.innerHeight - 8 ? box.top - element.offsetHeight - 4 : below)}px`

            element.style.right = `${Math.max(8, Math.min(window.innerWidth - element.offsetWidth - 8, window.innerWidth - box.right))}px`
        }

        reposition()

        element
            ?.querySelector<HTMLButtonElement>('button:not(:disabled)')
            ?.focus({ preventScroll: true })

        const outside = (event: PointerEvent) => {
            if (
                event.target instanceof Node &&
                !menu.current?.contains(event.target) &&
                !trigger.current?.contains(event.target)
            )
                setPosition(undefined)
        }

        const dismiss = () => setPosition(undefined)

        document.addEventListener('pointerdown', outside)

        window.addEventListener('resize', dismiss)

        window.addEventListener('scroll', reposition, true)

        return () => {
            document.removeEventListener('pointerdown', outside)

            window.removeEventListener('resize', dismiss)

            window.removeEventListener('scroll', reposition, true)
        }
    }, [position])

    return (
        <>
            <button
                ref={trigger}
                type="button"
                className={c.trigger}
                aria-label={label}
                aria-expanded={!!position}
                aria-controls={position ? id : undefined}
                disabled={disabled}
                onClick={() => {
                    if (position) return close(true)

                    const box = trigger.current?.getBoundingClientRect()

                    setPortalTarget(
                        trigger.current?.closest('dialog') ?? document.body,
                    )

                    if (box)
                        setPosition({
                            top: box.bottom + 4,
                            right: Math.max(8, window.innerWidth - box.right),
                        })
                }}
            >
                <Ellipsis size={18} aria-hidden />
            </button>
            {position &&
                createPortal(
                    <div
                        ref={menu}
                        id={id}
                        className={c.menu}
                        style={position}
                        role="group"
                        aria-label={`${label}: działania`}
                        onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                                event.preventDefault()

                                event.stopPropagation()

                                close(true)
                            }

                            if (event.key === 'Tab') close()

                            if (
                                event.key !== 'ArrowDown' &&
                                event.key !== 'ArrowUp'
                            )
                                return

                            event.preventDefault()

                            const buttons = Array.from(
                                menu.current?.querySelectorAll<HTMLButtonElement>(
                                    'button:not(:disabled)',
                                ) ?? [],
                            )

                            const current = buttons.findIndex(
                                (button) => button === document.activeElement,
                            )

                            buttons[
                                (current +
                                    (event.key === 'ArrowDown' ? 1 : -1) +
                                    buttons.length) %
                                    buttons.length
                            ]?.focus()
                        }}
                    >
                        {items.map((item) => (
                            <button
                                key={item.label}
                                type="button"
                                className={item.danger ? c.danger : undefined}
                                disabled={item.disabled}
                                onClick={() => {
                                    close(true)

                                    item.onSelect()
                                }}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>,
                    portalTarget ?? document.body,
                )}
        </>
    )
}
