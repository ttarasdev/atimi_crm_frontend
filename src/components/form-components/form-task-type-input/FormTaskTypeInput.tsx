'use client'

import { useId, useRef, useState } from 'react'
import { Check, ChevronDown, Shapes } from 'lucide-react'
import type { TaskType } from '@/api/task-types/task-types.types'
import { ThemedIcon } from '@/components/theme-components/themed-icon/ThemedIcon'
import { Button } from '@/components/ui/button/Button'
import { useInfiniteTaskTypes } from '@/shared/hooks/useTaskTypes'
import c from './FormTaskTypeInput.module.scss'

export function FormTaskTypeInput({
    inputTitle = 'Typ wydarzenia',
    value,
    onChange,
    selectedType,
    disabled = false,
}: {
    inputTitle?: string
    value: number | null
    onChange: (value: number) => void
    selectedType?: TaskType
    disabled?: boolean
}) {
    const query = useInfiniteTaskTypes({ isActive: true })

    const [open, setOpen] = useState(false)

    const trigger = useRef<HTMLButtonElement>(null)

    const id = useId()

    const types = Array.from(
        new Map(
            (query.data?.pages.flatMap((page) => page.rows) ?? []).map(
                (type) => [type.id, type],
            ),
        ).values(),
    )

    const selected =
        types.find((type) => type.id === value) ??
        (selectedType?.id === value ? selectedType : undefined)

    const expanded = open && !disabled

    const close = () => {
        setOpen(false)

        trigger.current?.focus({ preventScroll: true })
    }

    return (
        <div
            className={c.field}
            onKeyDownCapture={(event) => {
                if (event.key === 'Escape' && expanded) {
                    event.preventDefault()

                    event.stopPropagation()

                    close()
                }
            }}
        >
            <label htmlFor={id}>{inputTitle}</label>
            <button
                id={id}
                ref={trigger}
                type="button"
                className={c.control}
                disabled={disabled || query.isPending}
                aria-expanded={expanded}
                aria-controls={`${id}-picker`}
                onClick={() => setOpen(!open)}
            >
                <span
                    className={c.icon}
                    style={{ color: selected?.color ?? 'var(--primary)' }}
                >
                    {selected ? (
                        <ThemedIcon iconId={selected.iconId} size={24} />
                    ) : (
                        <Shapes size={21} aria-hidden="true" />
                    )}
                </span>
                <span className={c.value}>
                    {selected?.name ??
                        (query.isPending
                            ? 'Wczytywanie typów…'
                            : 'Wybierz typ')}
                    {selected?.isDefault && <small>Domyślny</small>}
                    {selected && !selected.isActive && (
                        <small>Archiwalny</small>
                    )}
                </span>
                <ChevronDown size={16} aria-hidden="true" />
            </button>
            {expanded && (
                <div
                    id={`${id}-picker`}
                    className={c.picker}
                    role="region"
                    aria-label="Wybierz typ wydarzenia"
                >
                    <div className={c.options}>
                        {types.map((type) => (
                            <button
                                key={type.id}
                                type="button"
                                className={c.option}
                                style={{ color: type.color }}
                                aria-pressed={type.id === value}
                                onClick={() => {
                                    onChange(type.id)

                                    close()
                                }}
                            >
                                <ThemedIcon iconId={type.iconId} size={26} />
                                <span>
                                    {type.name}
                                    {type.isDefault && <small>Domyślny</small>}
                                </span>
                                {type.id === value && (
                                    <Check size={16} aria-hidden="true" />
                                )}
                            </button>
                        ))}
                        {query.isSuccess && !types.length && (
                            <p>Brak aktywnych typów wydarzeń.</p>
                        )}
                    </div>
                    {query.hasNextPage && (
                        <Button
                            type="button"
                            className={c.more}
                            pending={query.isFetchingNextPage}
                            onClick={() => {
                                void query.fetchNextPage()
                            }}
                        >
                            Pokaż więcej typów
                        </Button>
                    )}
                </div>
            )}
            {query.isError && (
                <div className={c.error} role="alert">
                    <span>Nie udało się wczytać typów.</span>
                    <button
                        type="button"
                        disabled={query.isFetching || disabled}
                        onClick={() => {
                            void query.refetch()
                        }}
                    >
                        Spróbuj ponownie
                    </button>
                </div>
            )}
        </div>
    )
}
