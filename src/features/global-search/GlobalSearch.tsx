'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ArrowLeft, ArrowUpRight, Download } from 'lucide-react'
import type { SearchItem, SearchType } from '@/api/search/search.types'
import { Popup } from '@/components/ui/popup/Popup'
import { Button } from '@/components/ui/button/Button'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { useGlobalSearch } from '@/shared/hooks/useGlobalSearch'
import { useDownloadPrivateAsset } from '@/shared/hooks/usePrivateAssets'
import {
    getDocumentDownloadName,
    getDocumentFormat,
} from '@/features/documents/document-format'
import { searchDestination } from './search-navigation'
import c from './GlobalSearch.module.scss'

const labels: Record<SearchType, string> = {
    client: 'Klienci',
    case: 'Sprawy',
    stage: 'Etapy',
    document: 'Dokumenty',
    note: 'Notatki',
    lead: 'Leady',
    partner: 'Partnerzy',
    template: 'Szablony',
    employee: 'Pracownicy',
    section: 'Sekcje aplikacji',
}

export function GlobalSearch() {
    const [open, setOpen] = useState(false)

    return (
        <>
            <button
                type="button"
                className={c.open}
                aria-label="Szukaj w CRM"
                onClick={() => setOpen(true)}
            >
                <Search size={20} aria-hidden="true" />
                <span>Szukaj</span>
            </button>
            {open && <SearchDialog onClose={() => setOpen(false)} />}
        </>
    )
}

function SearchDialog({ onClose }: { onClose: () => void }) {
    const body = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const frame = requestAnimationFrame(() =>
            body.current?.querySelector('input')?.focus(),
        )

        return () => cancelAnimationFrame(frame)
    }, [])

    const [text, setText] = useState('')

    const [type, setType] = useState<SearchType>()

    const result = useGlobalSearch(text, type)

    const router = useRouter()

    const download = useDownloadPrivateAsset()

    async function select(item: SearchItem) {
        if (item.type === 'document' && item.assetId) {
            if (download.isPending) return

            try {
                const blob = await download.mutateAsync({ id: item.assetId })

                const url = URL.createObjectURL(blob)

                const link = document.createElement('a')

                link.href = url

                link.download = getDocumentDownloadName(item.title, blob.type)

                link.click()

                window.setTimeout(() => URL.revokeObjectURL(url), 1000)
            } catch {
                return
            }

            return
        }

        const href = searchDestination(item)

        if (href) {
            onClose()

            router.push(href)
        }
    }

    return (
        <Popup
            title="Szukaj w CRM"
            description="Klienci, sprawy, dokumenty i pozostałe dostępne wpisy."
            onClose={onClose}
            size="wide"
        >
            <div ref={body} className={c.body}>
                <TextInput
                    inputTitle="Szukaj w całym CRM"
                    type="search"
                    autoFocus
                    maxLength={120}
                    placeholder="Wpisz nazwę, numer sprawy lub dane kontaktowe"
                    value={text}
                    onChange={(value) => {
                        setText(value)

                        setType(undefined)
                    }}
                />
                {type && (
                    <Button
                        type="button"
                        className={c.back}
                        onClick={() => setType(undefined)}
                    >
                        <ArrowLeft size={15} />
                        Wszystkie kategorie
                    </Button>
                )}
                {!text.trim() && !type && (
                    <p className={c.hint}>
                        Ostatnie wpisy i skróty. Zacznij pisać, aby wyszukać.
                    </p>
                )}
                {result.error && (
                    <div role="alert" className={c.state}>
                        <p>Nie udało się wyszukać. Spróbuj ponownie.</p>
                        <Button
                            type="button"
                            onClick={() => void result.refetch()}
                        >
                            Spróbuj ponownie
                        </Button>
                    </div>
                )}
                {download.isError && (
                    <p role="alert">
                        Nie można pobrać pliku. Sprawdź dostęp lub spróbuj
                        ponownie.
                    </p>
                )}
                {result.loading ? (
                    <p className={c.state} role="status">
                        Wyszukiwanie…
                    </p>
                ) : (
                    <>
                        {result.groups.map((group) => (
                            <section
                                key={group.type}
                                aria-label={labels[group.type]}
                                className={c.group}
                            >
                                <header>
                                    <h3>{labels[group.type]}</h3>
                                    {type && result.total !== undefined && (
                                        <span>{result.total}</span>
                                    )}
                                </header>
                                <div className={c.results}>
                                    {group.items.map((item) => (
                                        <button
                                            key={`${item.kind}:${item.id}`}
                                            type="button"
                                            className={c.result}
                                            disabled={
                                                item.type === 'document' &&
                                                download.isPending
                                            }
                                            onClick={() => void select(item)}
                                        >
                                            <div>
                                                <strong>{item.title}</strong>
                                                <span>
                                                    {item.type === 'section'
                                                        ? 'Sekcja aplikacji'
                                                        : item.type ===
                                                            'document'
                                                          ? getDocumentFormat(
                                                                item.subtitle,
                                                            )
                                                          : item.subtitle}
                                                </span>
                                            </div>
                                            {item.type === 'document' ? (
                                                <Download
                                                    size={16}
                                                    aria-hidden="true"
                                                />
                                            ) : (
                                                <ArrowUpRight
                                                    size={16}
                                                    aria-hidden="true"
                                                />
                                            )}
                                        </button>
                                    ))}
                                </div>
                                {!type && group.hasMore && (
                                    <Button
                                        type="button"
                                        className={c.more}
                                        onClick={() => setType(group.type)}
                                    >
                                        Pokaż wszystkie: {labels[group.type]}
                                    </Button>
                                )}
                            </section>
                        ))}
                        {!result.error &&
                            !result.groups.some(
                                (group) => group.items.length,
                            ) && (
                                <p className={c.state} role="status">
                                    Brak wyników. Zmień wpisane hasło.
                                </p>
                            )}
                        {type && result.hasNextPage && (
                            <Button
                                type="button"
                                pending={result.fetchingMore}
                                onClick={() => void result.fetchNextPage()}
                            >
                                Pokaż więcej wyników
                            </Button>
                        )}
                    </>
                )}
            </div>
        </Popup>
    )
}
