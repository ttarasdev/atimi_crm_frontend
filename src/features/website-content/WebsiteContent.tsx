'use client'

import { useEffect, useRef, useState } from 'react'
import {
    Archive,
    ArrowDown,
    ArrowUp,
    Globe,
    Pencil,
    Plus,
    RotateCcw,
} from 'lucide-react'
import type { SiteReview } from '@/api/site-reviews/site-reviews.types'
import type { SiteVideo } from '@/api/site-videos/site-videos.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { Button } from '@/components/ui/button/Button'
import { Popup } from '@/components/ui/popup/Popup'
import { useRoles } from '@/shared/hooks/useRoles'
import {
    useSiteReviews,
    useSiteVideos,
    useUpdateSiteReview,
    useUpdateSiteVideo,
    useReorderSiteReview,
    useReorderSiteVideo,
} from '@/shared/hooks/useWebsiteContent'
import { LanguageTabs, type WebsiteLanguage } from './LanguageTabs'
import { ReviewPreview, VideoPreview } from './SiteContentPreview'
import { SiteReviewForm } from './SiteReviewForm'
import { SiteVideoForm } from './SiteVideoForm'
import c from './WebsiteContent.module.scss'

type ContentItem =
    | { kind: 'review'; item: SiteReview }
    | { kind: 'video'; item: SiteVideo }

export function WebsiteContent() {
    const { hasRole } = useRoles()

    if (!hasRole('admin'))
        return (
            <div className={c.state}>
                Ten dział jest dostępny dla administratorów.
            </div>
        )

    return <WebsiteContentManager />
}

function WebsiteContentManager() {
    const [section, setSection] = useState<'reviews' | 'videos'>('reviews')

    const [archived, setArchived] = useState(false)

    const [language, setLanguage] = useState<WebsiteLanguage>('pl')

    const [search, setSearch] = useState('')

    const [searchQuery, setSearchQuery] = useState('')

    const [editing, setEditing] = useState<
        ContentItem | 'review' | 'video' | null
    >(null)

    const [archiving, setArchiving] = useState<ContentItem | null>(null)

    const [formPending, setFormPending] = useState(false)

    const [error, setError] = useState<string>()

    const controller = useRef<AbortController | null>(null)

    const sectionRef = useRef<HTMLElement>(null)

    const reviews = useSiteReviews({
        isActive: !archived,
        ...(searchQuery ? { search: searchQuery } : {}),
    })

    const videos = useSiteVideos({
        isActive: !archived,
        ...(searchQuery ? { search: searchQuery } : {}),
    })

    const updateReview = useUpdateSiteReview()

    const updateVideo = useUpdateSiteVideo()

    const orderReview = useReorderSiteReview()

    const orderVideo = useReorderSiteVideo()

    const pending =
        updateReview.isPending ||
        updateVideo.isPending ||
        orderReview.isPending ||
        orderVideo.isPending

    const query = section === 'reviews' ? reviews : videos

    const items: ContentItem[] =
        section === 'reviews'
            ? (reviews.data?.pages.flatMap((page) => page.rows) ?? []).map(
                  (item) => ({ kind: 'review', item }),
              )
            : (videos.data?.pages.flatMap((page) => page.rows) ?? []).map(
                  (item) => ({ kind: 'video', item }),
              )

    useEffect(() => {
        const timer = setTimeout(() => setSearchQuery(search.trim()), 300)

        return () => clearTimeout(timer)
    }, [search])

    useEffect(() => () => controller.current?.abort(), [])

    async function action(
        entry: ContentItem,
        type: 'archive' | 'restore' | 'up' | 'down',
    ) {
        if (controller.current) return

        setError(undefined)

        controller.current = new AbortController()

        try {
            if (type === 'archive' || type === 'restore') {
                const mutation =
                    entry.kind === 'review' ? updateReview : updateVideo

                await mutation.mutateAsync({
                    id: entry.item.id,
                    dto: { isActive: type === 'restore' },
                    signal: controller.current.signal,
                })

                setArchiving(null)
            } else {
                const mutation =
                    entry.kind === 'review' ? orderReview : orderVideo

                await mutation.mutateAsync({
                    id: entry.item.id,
                    direction: type,
                    signal: controller.current.signal,
                })
            }
        } catch {
            if (!controller.current?.signal.aborted)
                setError('Nie udało się zapisać zmiany. Spróbuj ponownie.')
        } finally {
            controller.current = null
        }
    }

    const editingReview =
        editing === 'review' ||
        (typeof editing === 'object' && editing?.kind === 'review')

    return (
        <section
            className={c.page}
            aria-label="Strona internetowa"
            ref={sectionRef}
            tabIndex={-1}
        >
            <div className={c.block}>
                <header className={c.header}>
                    <div>
                        <h2>
                            <Globe size={19} aria-hidden="true" />
                            Strona internetowa
                        </h2>
                        <p className={c.intro}>
                            Opinie i filmy klientów · atlantis.info.pl · cztery
                            języki
                        </p>
                    </div>
                    <Button
                        className={c.primary}
                        onClick={() =>
                            setEditing(
                                section === 'reviews' ? 'review' : 'video',
                            )
                        }
                    >
                        <Plus size={17} aria-hidden="true" />
                        {section === 'reviews' ? 'Dodaj opinię' : 'Dodaj film'}
                    </Button>
                </header>
                <div className={c.toolbar}>
                    <div
                        className={c.tabs}
                        role="group"
                        aria-label="Rodzaj treści"
                    >
                        <button
                            className={section === 'reviews' ? c.selected : ''}
                            aria-pressed={section === 'reviews'}
                            onClick={() => setSection('reviews')}
                        >
                            Opinie
                        </button>
                        <button
                            className={section === 'videos' ? c.selected : ''}
                            aria-pressed={section === 'videos'}
                            onClick={() => setSection('videos')}
                        >
                            Filmy
                        </button>
                    </div>
                    <a
                        className={c.websiteLink}
                        href="https://atlantis.info.pl"
                        target="_blank"
                        rel="noreferrer"
                    >
                        Otwórz stronę ↗
                    </a>
                </div>
                <div className={c.toolbar}>
                    <div
                        className={c.tabs}
                        role="group"
                        aria-label="Status publikacji"
                    >
                        <button
                            aria-pressed={!archived}
                            className={!archived ? c.selected : ''}
                            onClick={() => setArchived(false)}
                        >
                            Na stronie
                        </button>
                        <button
                            aria-pressed={archived}
                            className={archived ? c.selected : ''}
                            onClick={() => setArchived(true)}
                        >
                            Archiwum
                        </button>
                    </div>
                    <div className={c.search}>
                        <TextInput
                            inputTitle="Szukaj treści"
                            type="search"
                            value={search}
                            onChange={setSearch}
                            maxLength={100}
                        />
                    </div>
                </div>
                <LanguageTabs value={language} onChange={setLanguage} />
            </div>
            {error && !archiving && (
                <p className={c.error} role="alert">
                    {error}
                </p>
            )}
            {query.isPending ? (
                <p className={c.state}>Wczytywanie treści…</p>
            ) : query.isError ? (
                <div className={c.error} role="alert">
                    <p>Nie udało się wczytać treści.</p>
                    <Button onClick={() => void query.refetch()}>
                        Spróbuj ponownie
                    </Button>
                </div>
            ) : !items.length ? (
                <p className={c.state}>
                    {archived
                        ? 'Archiwum jest puste.'
                        : 'Brak treści. Dodaj pierwszą opinię lub film.'}
                </p>
            ) : (
                <ul className={c.grid}>
                    {items.map((entry, index) => {
                        const title =
                            entry.kind === 'review'
                                ? entry.item.translations[language].authorName
                                : entry.item.translations[language].title

                        return (
                            <li key={entry.item.id} className={c.card}>
                                {entry.kind === 'review' ? (
                                    <ReviewPreview
                                        review={entry.item}
                                        language={language}
                                    />
                                ) : (
                                    <VideoPreview
                                        video={entry.item}
                                        language={language}
                                    />
                                )}
                                <div className={c.actions}>
                                    <span className={c.badge}>
                                        {entry.item.isActive
                                            ? 'Na stronie'
                                            : 'Archiwum'}
                                    </span>
                                    <Button
                                        className={c.iconButton}
                                        onClick={() => setEditing(entry)}
                                        aria-label={`Edytuj ${title}`}
                                    >
                                        <Pencil size={16} />
                                    </Button>
                                    <Button
                                        className={c.iconButton}
                                        pending={pending}
                                        onClick={() => void action(entry, 'up')}
                                        disabled={
                                            index === 0 &&
                                            !searchQuery &&
                                            !archived
                                        }
                                        aria-label={`Przesuń ${title} w górę`}
                                    >
                                        <ArrowUp size={16} />
                                    </Button>
                                    <Button
                                        className={c.iconButton}
                                        pending={pending}
                                        onClick={() =>
                                            void action(entry, 'down')
                                        }
                                        disabled={
                                            index === items.length - 1 &&
                                            !query.hasNextPage &&
                                            !searchQuery &&
                                            !archived
                                        }
                                        aria-label={`Przesuń ${title} w dół`}
                                    >
                                        <ArrowDown size={16} />
                                    </Button>
                                    <Button
                                        className={c.iconButton}
                                        pending={pending}
                                        onClick={() => {
                                            setError(undefined)

                                            if (entry.item.isActive)
                                                setArchiving(entry)
                                            else void action(entry, 'restore')
                                        }}
                                        aria-label={`${entry.item.isActive ? 'Archiwizuj' : 'Przywróć'} ${title}`}
                                    >
                                        {entry.item.isActive ? (
                                            <Archive size={16} />
                                        ) : (
                                            <RotateCcw size={16} />
                                        )}
                                    </Button>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            )}
            {query.hasNextPage && (
                <div className={c.more}>
                    <Button
                        pending={query.isFetchingNextPage}
                        onClick={() => void query.fetchNextPage()}
                    >
                        Pokaż więcej
                    </Button>
                </div>
            )}
            {editing && (
                <Popup
                    title={
                        editingReview
                            ? typeof editing === 'object'
                                ? 'Edytuj opinię'
                                : 'Nowa opinia'
                            : typeof editing === 'object'
                              ? 'Edytuj film'
                              : 'Nowy film'
                    }
                    onClose={() => setEditing(null)}
                    closeDisabled={formPending}
                    fallbackFocusRef={sectionRef}
                >
                    {editingReview ? (
                        <SiteReviewForm
                            review={
                                typeof editing === 'object' &&
                                editing.kind === 'review'
                                    ? editing.item
                                    : undefined
                            }
                            onSuccess={() => setEditing(null)}
                            onCancel={() => setEditing(null)}
                            onPendingChange={setFormPending}
                        />
                    ) : (
                        <SiteVideoForm
                            video={
                                typeof editing === 'object' &&
                                editing.kind === 'video'
                                    ? editing.item
                                    : undefined
                            }
                            onSuccess={() => setEditing(null)}
                            onCancel={() => setEditing(null)}
                            onPendingChange={setFormPending}
                        />
                    )}
                </Popup>
            )}
            {archiving && (
                <Popup
                    title="Archiwizuj treść"
                    onClose={() => {
                        setArchiving(null)

                        setError(undefined)
                    }}
                    closeDisabled={pending}
                    fallbackFocusRef={sectionRef}
                >
                    <FormContainer
                        submitTitle="Archiwizuj"
                        isPending={pending}
                        error={error}
                        onCancel={() => setArchiving(null)}
                        onSubmit={() => void action(archiving, 'archive')}
                    >
                        <p className={c.intro}>
                            Treść zniknie ze strony po jej odświeżeniu.
                            Zachowamy wszystkie tłumaczenia, aby można było ją
                            później przywrócić.
                        </p>
                    </FormContainer>
                </Popup>
            )}
        </section>
    )
}
