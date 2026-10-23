'use client'

import { useId, useRef, useState, useEffect } from 'react'
import { X, AtSign } from 'lucide-react'
import type {
    MentionRecipient,
    NoteMention,
} from '@/api/note-mentions/note-mentions.types'
import { FormTextarea } from '@/components/form-components/form-textarea/FormTextarea'
import { Button } from '@/components/ui/button/Button'
import { useMentionRecipients } from '@/shared/hooks/useNoteMentions'
import { containsMention } from './NoteMentionBody'
import c from './NoteMentions.module.scss'

export function NoteMentionInput({
    clientId,
    value,
    onChange,
    mentions,
    onMentionsChange,
}: {
    clientId: number
    value: string
    onChange: (value: string) => void
    mentions: NoteMention[]
    onMentionsChange: (mentions: NoteMention[]) => void
}) {
    const [search, setSearch] = useState<{
        start: number
        end: number
        text: string
    } | null>(null)

    const [debounced, setDebounced] = useState('')

    const [active, setActive] = useState(0)

    const input = useRef<HTMLTextAreaElement | null>(null)

    const dismissed = useRef<{ value: string; caret: number } | null>(null)

    const container = useRef<HTMLDivElement | null>(null)

    const listId = useId()

    useEffect(() => {
        const timer = window.setTimeout(
            () => setDebounced(search?.text ?? ''),
            180,
        )

        return () => window.clearTimeout(timer)
    }, [search?.text])

    const query = useMentionRecipients(clientId, debounced, !!search)

    const rows =
        query.data?.pages
            .flatMap((page) => page.rows)
            .filter(
                (row) =>
                    !mentions.some((mention) => mention.managerId === row.id),
            ) ?? []

    const selected = Math.min(active, Math.max(rows.length - 1, 0))

    function detect(element: HTMLTextAreaElement) {
        input.current = element

        if (
            dismissed.current?.value === element.value &&
            dismissed.current.caret === element.selectionStart
        ) {
            setSearch(null)

            return
        }

        const prefix = element.value.slice(0, element.selectionStart)

        const match = /(?:^|[\s([{])@([\p{L}\p{N}_ .'-]{0,80})$/u.exec(prefix)

        if (!match) {
            setSearch(null)

            return
        }

        const start = prefix.length - match[1].length - 1

        if (
            mentions.some((mention) =>
                prefix.slice(start).startsWith(`@${mention.label} `),
            )
        ) {
            setSearch(null)

            return
        }

        setSearch({ start, end: element.selectionStart, text: match[1].trim() })

        setActive(0)
    }

    function choose(row: MentionRecipient) {
        if (!search || mentions.length >= 20) return

        const label = [row.name, row.surname].filter(Boolean).join(' ')

        const text = `@${label} `

        const next =
            value.slice(0, search.start) + text + value.slice(search.end)

        if (next.length > 10000) return

        onChange(next)

        onMentionsChange([
            ...mentions.filter((mention) =>
                containsMention(next, mention.label),
            ),
            { managerId: row.id, label },
        ])

        setSearch(null)

        window.requestAnimationFrame(() => {
            input.current?.focus()

            input.current?.setSelectionRange(
                search.start + text.length,
                search.start + text.length,
            )
        })
    }

    return (
        <div
            ref={container}
            className={c.editor}
            onBlur={(event) => {
                if (!container.current?.contains(event.relatedTarget))
                    setSearch(null)
            }}
        >
            <FormTextarea
                inputTitle="Treść notatki"
                value={value}
                onChange={(body) => {
                    onChange(body)

                    onMentionsChange(
                        mentions.filter((mention) =>
                            containsMention(body, mention.label),
                        ),
                    )
                }}
                onInput={(event) => detect(event.currentTarget)}
                onSelect={(event) => detect(event.currentTarget)}
                onFocus={(event) => {
                    input.current = event.currentTarget
                }}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={!!search}
                aria-controls={search ? listId : undefined}
                aria-activedescendant={
                    search && rows.length
                        ? `${listId}-${rows[selected].id}`
                        : undefined
                }
                onKeyDown={(event) => {
                    if (!search) return

                    if (event.key === 'Escape') {
                        dismissed.current = {
                            value,
                            caret: event.currentTarget.selectionStart,
                        }

                        event.preventDefault()

                        event.stopPropagation()

                        setSearch(null)
                    } else if (
                        event.key === 'ArrowDown' ||
                        event.key === 'ArrowUp'
                    ) {
                        event.preventDefault()

                        setActive((current) =>
                            rows.length
                                ? (current +
                                      (event.key === 'ArrowDown'
                                          ? 1
                                          : rows.length - 1)) %
                                  rows.length
                                : 0,
                        )
                    } else if (event.key === 'Enter' && rows[selected]) {
                        event.preventDefault()

                        choose(rows[selected])
                    } else if (event.key === 'Tab') setSearch(null)
                }}
                required
                maxLength={10000}
                rows={6}
                hint="Wpisz @ i wybierz pracownika, aby go powiadomić. Dostępni są tylko pracownicy, którzy już mają dostęp do tego klienta. Wzmianka nie zmienia uprawnień."
            />
            {search && (
                <div className={c.picker}>
                    <span className={c.pickerTitle}>
                        <AtSign size={14} /> Wybierz pracownika
                    </span>
                    <div
                        role="listbox"
                        aria-label="Pracownicy do wzmianki"
                        id={listId}
                        className={c.options}
                    >
                        {rows.map((row, index) => (
                            <button
                                id={`${listId}-${row.id}`}
                                key={row.id}
                                role="option"
                                type="button"
                                aria-selected={index === selected}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => choose(row)}
                                disabled={mentions.length >= 20}
                            >
                                {row.name} {row.surname}
                            </button>
                        ))}
                    </div>
                    {query.isFetching && <p role="status">Wyszukiwanie…</p>}
                    {query.isError && (
                        <p role="alert">
                            Nie udało się wyszukać pracowników.{' '}
                            <Button
                                type="button"
                                onClick={() => void query.refetch()}
                            >
                                Spróbuj ponownie
                            </Button>
                        </p>
                    )}
                    {query.isSuccess && !rows.length && (
                        <p>Brak dostępnych pracowników dla tego zapytania.</p>
                    )}
                    {query.hasNextPage && (
                        <Button
                            type="button"
                            pending={query.isFetchingNextPage}
                            onClick={() => void query.fetchNextPage()}
                        >
                            Pokaż więcej pracowników
                        </Button>
                    )}
                    {mentions.length >= 20 && (
                        <p>Maksymalnie 20 wzmianek w jednej notatce.</p>
                    )}
                </div>
            )}
            {mentions.length > 0 && (
                <ul className={c.selected} aria-label="Wybrane wzmianki">
                    {mentions.map((mention) => (
                        <li key={mention.managerId}>
                            <span>@{mention.label}</span>
                            <button
                                type="button"
                                aria-label={`Usuń wzmiankę ${mention.label}`}
                                onClick={() =>
                                    onMentionsChange(
                                        mentions.filter(
                                            (item) =>
                                                item.managerId !==
                                                mention.managerId,
                                        ),
                                    )
                                }
                            >
                                <X size={12} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
