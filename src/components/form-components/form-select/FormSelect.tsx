'use client'

import {
    useEffect,
    useId,
    useRef,
    useState,
    type CSSProperties,
    type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Search } from 'lucide-react'
import c from './FormSelect.module.scss'

interface Position {
    left: number
    width: number
    maxHeight: number
    top?: number
    bottom?: number
}

function menuPosition(trigger: HTMLElement): Position {
    const rect = trigger.getBoundingClientRect()

    const viewport = window.visualViewport

    const leftEdge = viewport?.offsetLeft ?? 0

    const topEdge = viewport?.offsetTop ?? 0

    const viewportWidth = viewport?.width ?? window.innerWidth

    const viewportHeight = viewport?.height ?? window.innerHeight

    const width = Math.min(Math.max(rect.width, 220), viewportWidth - 16)

    const below = topEdge + viewportHeight - rect.bottom - 14

    const above = rect.top - topEdge - 14

    const placeBelow = below >= 160 || below >= above

    return {
        left: Math.max(
            leftEdge + 8,
            Math.min(rect.left, leftEdge + viewportWidth - width - 8),
        ),
        width,
        maxHeight: Math.min(320, Math.max(80, placeBelow ? below : above)),
        ...(placeBelow
            ? { top: rect.bottom + 6 }
            : { bottom: window.innerHeight - rect.top + 6 }),
    }
}

export function FormSelect<T extends string | number | null>({
    selectTitle,
    options,
    value,
    onChange,
    disabled,
    required,
    hint,
    searchable = options.length >= 8,
}: {
    selectTitle: string
    options: readonly { title: string; value: T }[]
    value: T
    onChange: (value: T) => void
    disabled?: boolean
    required?: boolean
    hint?: string
    searchable?: boolean
}) {
    const id = useId()

    const trigger = useRef<HTMLButtonElement>(null)

    const menu = useRef<HTMLDivElement>(null)

    const searchInput = useRef<HTMLInputElement>(null)

    const [open, setOpen] = useState(false)

    const [query, setQuery] = useState('')

    const [activeIndex, setActiveIndex] = useState(0)

    const [position, setPosition] = useState<Position | null>(null)

    const [portal, setPortal] = useState<HTMLElement | null>(null)

    const [invalid, setInvalid] = useState(false)

    const expanded = open && !disabled

    const selected = options.find((option) => option.value === value)

    const filtered = options.filter((option) =>
        option.title
            .toLocaleLowerCase('pl-PL')
            .includes(query.trim().toLocaleLowerCase('pl-PL')),
    )

    const active = filtered[Math.min(activeIndex, filtered.length - 1)]

    const activeId = active
        ? `${id}-option-${options.indexOf(active)}`
        : undefined

    function close(restoreFocus = true) {
        setOpen(false)

        if (restoreFocus) trigger.current?.focus({ preventScroll: true })
    }

    function show() {
        const element = trigger.current

        if (!element || element.matches(':disabled')) return

        setQuery('')

        setActiveIndex(
            Math.max(
                0,
                options.findIndex((option) => option.value === value),
            ),
        )

        setPosition(menuPosition(element))

        setPortal(
            element.closest<HTMLDialogElement>('dialog[open]') ?? document.body,
        )

        setOpen(true)
    }

    function choose(option: (typeof options)[number]) {
        if (trigger.current?.matches(':disabled')) {
            close()

            return
        }

        setInvalid(false)

        onChange(option.value)

        close()
    }

    function keyboard(event: KeyboardEvent<HTMLElement>) {
        if (event.key === 'Escape' && expanded) {
            event.preventDefault()

            event.stopPropagation()

            close()

            return
        }

        if (event.key === 'Tab' && expanded) {
            close(false)

            if (event.target === searchInput.current) {
                event.preventDefault()

                const boundary =
                    trigger.current?.closest('dialog[open]') ?? document

                const controls = Array.from(
                    boundary.querySelectorAll<HTMLElement>(
                        'button, input, textarea, a[href], [tabindex="0"]',
                    ),
                ).filter(
                    (element) =>
                        !menu.current?.contains(element) &&
                        !element.matches(':disabled') &&
                        element.tabIndex >= 0 &&
                        element.getClientRects().length,
                )

                const index = controls.findIndex(
                    (element) => element === trigger.current,
                )

                controls[index + (event.shiftKey ? -1 : 1)]?.focus()
            }

            return
        }

        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
            if (
                (event.key === 'Home' || event.key === 'End') &&
                event.target === searchInput.current
            )
                return

            event.preventDefault()

            if (!expanded) {
                show()

                if (event.key === 'Home') setActiveIndex(0)

                if (event.key === 'End') setActiveIndex(options.length - 1)

                return
            }

            setActiveIndex((index) => {
                if (event.key === 'Home') return 0

                if (event.key === 'End') return filtered.length - 1

                return Math.max(
                    0,
                    Math.min(
                        filtered.length - 1,
                        index + (event.key === 'ArrowDown' ? 1 : -1),
                    ),
                )
            })

            return
        }

        if (event.key === 'Enter' && expanded) {
            event.preventDefault()

            if (active) choose(active)

            return
        }

        if (
            event.key.length === 1 &&
            event.key !== ' ' &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey &&
            event.target !== searchInput.current
        ) {
            event.preventDefault()

            if (!expanded) show()

            if (searchable) {
                setQuery((current) =>
                    expanded ? current + event.key : event.key,
                )

                setActiveIndex(0)
            } else {
                const index = options.findIndex((option) =>
                    option.title
                        .toLocaleLowerCase('pl-PL')
                        .startsWith(event.key.toLocaleLowerCase('pl-PL')),
                )

                if (index >= 0) setActiveIndex(index)
            }
        }
    }

    useEffect(() => {
        if (!expanded) return

        const update = () => {
            if (trigger.current) setPosition(menuPosition(trigger.current))
        }

        const outside = (event: PointerEvent) => {
            if (
                event.target instanceof Node &&
                !trigger.current?.contains(event.target) &&
                !menu.current?.contains(event.target)
            )
                setOpen(false)
        }

        const escape = (event: globalThis.KeyboardEvent) => {
            if (event.key !== 'Escape') return

            event.preventDefault()

            event.stopPropagation()

            setOpen(false)

            trigger.current?.focus({ preventScroll: true })
        }

        const observer = new ResizeObserver(update)

        if (trigger.current) observer.observe(trigger.current)

        window.addEventListener('resize', update)

        window.addEventListener('scroll', update, true)

        window.visualViewport?.addEventListener('resize', update)

        window.visualViewport?.addEventListener('scroll', update)

        document.addEventListener('pointerdown', outside, true)

        document.addEventListener('keydown', escape, true)

        return () => {
            observer.disconnect()

            window.removeEventListener('resize', update)

            window.removeEventListener('scroll', update, true)

            window.visualViewport?.removeEventListener('resize', update)

            window.visualViewport?.removeEventListener('scroll', update)

            document.removeEventListener('pointerdown', outside, true)

            document.removeEventListener('keydown', escape, true)
        }
    }, [expanded])

    useEffect(() => {
        if (!expanded || !activeId) return

        document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' })
    }, [expanded, activeId])

    useEffect(() => {
        if (expanded && query)
            searchInput.current?.focus({ preventScroll: true })
    }, [expanded, query])

    const menuStyle: CSSProperties | undefined = position ?? undefined

    return (
        <div className={c.field}>
            <label id={`${id}-label`} htmlFor={id}>
                {selectTitle}
            </label>
            <button
                type="button"
                id={id}
                ref={trigger}
                className={c.trigger}
                data-form-select-trigger
                role="combobox"
                aria-labelledby={`${id}-label`}
                aria-expanded={expanded}
                aria-haspopup="listbox"
                aria-controls={expanded ? `${id}-list` : undefined}
                aria-activedescendant={expanded ? activeId : undefined}
                aria-required={required || undefined}
                aria-invalid={invalid || undefined}
                aria-describedby={hint ? `${id}-hint` : undefined}
                disabled={disabled}
                onClick={() => (expanded ? close(false) : show())}
                onKeyDown={keyboard}
            >
                <span>{selected?.title ?? 'Wybierz…'}</span>
                <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className={expanded ? c.rotated : ''}
                />
            </button>
            {required && (
                <input
                    className={c.validation}
                    tabIndex={-1}
                    aria-hidden="true"
                    required
                    disabled={disabled}
                    value={value === null ? '' : String(value)}
                    onChange={() => {}}
                    onInvalid={(event) => {
                        event.preventDefault()

                        setInvalid(true)

                        trigger.current?.focus()
                    }}
                />
            )}
            {hint && <p id={`${id}-hint`}>{hint}</p>}
            {expanded &&
                portal &&
                position &&
                createPortal(
                    <div
                        ref={menu}
                        className={c.menu}
                        style={menuStyle}
                        onKeyDown={keyboard}
                    >
                        {searchable && (
                            <div className={c.search}>
                                <Search size={15} aria-hidden="true" />
                                <input
                                    ref={searchInput}
                                    type="search"
                                    value={query}
                                    role="searchbox"
                                    aria-label={`Szukaj: ${selectTitle}`}
                                    aria-controls={`${id}-list`}
                                    aria-activedescendant={activeId}
                                    placeholder="Szukaj…"
                                    autoComplete="off"
                                    onChange={(event) => {
                                        setQuery(event.target.value)

                                        setActiveIndex(0)
                                    }}
                                />
                            </div>
                        )}
                        <div
                            id={`${id}-list`}
                            role="listbox"
                            aria-label={`Opcje: ${selectTitle}`}
                            className={c.options}
                        >
                            {filtered.map((option, index) => (
                                <button
                                    type="button"
                                    role="option"
                                    key={String(option.value)}
                                    id={`${id}-option-${options.indexOf(option)}`}
                                    tabIndex={-1}
                                    data-option-value={
                                        option.value === null
                                            ? ''
                                            : String(option.value)
                                    }
                                    aria-selected={option.value === value}
                                    className={`${c.option} ${active === option ? c.active : ''}`}
                                    onPointerMove={() => setActiveIndex(index)}
                                    onMouseDown={(event) =>
                                        event.preventDefault()
                                    }
                                    onClick={() => choose(option)}
                                >
                                    <span>{option.title}</span>
                                    {option.value === value && (
                                        <Check size={15} aria-hidden="true" />
                                    )}
                                </button>
                            ))}
                            {!filtered.length && (
                                <p className={c.empty}>
                                    Brak pasujących opcji.
                                </p>
                            )}
                        </div>
                    </div>,
                    portal,
                )}
        </div>
    )
}
