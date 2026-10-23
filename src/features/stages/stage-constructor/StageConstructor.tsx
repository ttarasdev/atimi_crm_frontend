'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Archive,
    ChevronRight,
    Layers,
    LoaderCircle,
    Plus,
    RotateCcw,
} from 'lucide-react'
import type { StageTemplate } from '@/api/stage-templates/stage-templates.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { ThemedIcon } from '@/components/theme-components/themed-icon/ThemedIcon'
import { Button } from '@/components/ui/button/Button'
import { Popup } from '@/components/ui/popup/Popup'
import { useRoles } from '@/shared/hooks/useRoles'
import {
    useInfiniteStageTemplates,
    useStageTemplate,
    useUpdateStageTemplate,
} from '@/shared/hooks/useStageTemplates'
import { StageTemplateDetails } from '../stage-template-details/StageTemplateDetails'
import { StageTemplateForm } from '../stage-template-form/StageTemplateForm'
import c from './StageConstructor.module.scss'

export function StageConstructor({
    initialTemplateId,
}: {
    initialTemplateId?: number
}) {
    const router = useRouter()

    const [targetOpen, setTargetOpen] = useState(
        initialTemplateId !== undefined,
    )

    const target = useStageTemplate(
        targetOpen ? (initialTemplateId ?? null) : null,
    )

    const [archived, setArchived] = useState(false)

    const [search, setSearch] = useState('')

    const [searchQuery, setSearchQuery] = useState('')

    const [creating, setCreating] = useState(false)

    const [localSelected, setSelected] = useState<StageTemplate | null>(null)

    const selected =
        localSelected ?? (targetOpen && !target.isError ? target.data : null)

    const [formPending, setFormPending] = useState(false)

    const [archiveTemplate, setArchiveTemplate] =
        useState<StageTemplate | null>(null)

    const [actionError, setActionError] = useState<string>()

    const sectionRef = useRef<HTMLElement>(null)

    const controller = useRef<AbortController | null>(null)

    const { hasRole } = useRoles()

    const isAdmin = hasRole('admin')

    const query = useInfiniteStageTemplates({
        isActive: !archived,
        ...(searchQuery ? { search: searchQuery } : {}),
    })

    const update = useUpdateStageTemplate()

    const templates = Array.from(
        new Map(
            (query.data?.pages.flatMap((page) => page.rows) ?? []).map(
                (template) => [template.id, template],
            ),
        ).values(),
    )

    const total = query.data?.pages[0]?.total

    function closeSelected() {
        setSelected(null)

        setTargetOpen(false)

        if (initialTemplateId)
            router.replace('/main/management/stages', { scroll: false })
    }

    useEffect(() => {
        const timer = setTimeout(() => setSearchQuery(search.trim()), 300)

        return () => clearTimeout(timer)
    }, [search])

    useEffect(
        () => () => {
            controller.current?.abort()
        },
        [],
    )

    async function changeActive(template: StageTemplate, isActive: boolean) {
        if (controller.current) return

        setActionError(undefined)

        controller.current = new AbortController()

        try {
            await update.mutateAsync({
                id: template.id,
                dto: { isActive },
                signal: controller.current.signal,
            })

            setArchiveTemplate(null)
        } catch {
            if (!controller.current?.signal.aborted)
                setActionError('Nie udało się zmienić etapu. Spróbuj ponownie.')
        } finally {
            controller.current = null
        }
    }

    return (
        <section
            ref={sectionRef}
            className={c.page}
            aria-label="Konstruktor etapów"
            tabIndex={-1}
        >
            <div className={c.block}>
                <header className={c.header}>
                    <div className={c.title}>
                        <h2>Szablony etapów</h2>
                        {total !== undefined && (
                            <span className={c.count}>
                                {templates.length} / {total}
                            </span>
                        )}
                    </div>
                    {isAdmin && (
                        <Button
                            type="button"
                            className={c.create}
                            disabled={update.isPending}
                            onClick={() => setCreating(true)}
                        >
                            <Plus size={16} aria-hidden="true" />
                            Dodaj etap
                        </Button>
                    )}
                </header>
                <p className={c.intro}>
                    Przygotuj etapy i zadania, które później wybierzesz z listy
                    w sprawie klienta.
                </p>
                <div className={c.controls}>
                    <div className={c.filters} aria-label="Widoczność etapów">
                        <Button
                            type="button"
                            className={!archived ? c.selected : undefined}
                            aria-pressed={!archived}
                            disabled={update.isPending}
                            onClick={() => {
                                setArchived(false)

                                setActionError(undefined)
                            }}
                        >
                            Aktywne
                        </Button>
                        <Button
                            type="button"
                            className={archived ? c.selected : undefined}
                            aria-pressed={archived}
                            disabled={update.isPending}
                            onClick={() => {
                                setArchived(true)

                                setActionError(undefined)
                            }}
                        >
                            Archiwum
                        </Button>
                    </div>
                    <div className={c.search}>
                        <TextInput
                            inputTitle="Szukaj etapu"
                            type="search"
                            value={search}
                            onChange={setSearch}
                            maxLength={100}
                            autoComplete="off"
                            placeholder="Nazwa etapu"
                            disabled={update.isPending}
                        />
                    </div>
                </div>
                <div className={c.list} aria-busy={query.isFetching}>
                    {query.isPending && (
                        <p className={c.state} role="status">
                            <LoaderCircle
                                className={c.spinner}
                                size={18}
                                aria-hidden="true"
                            />
                            Wczytywanie etapów…
                        </p>
                    )}
                    {!!templates.length && (
                        <ul
                            className={c.templates}
                            aria-label="Szablony etapów"
                        >
                            {templates.map((template) => (
                                <li
                                    key={template.id}
                                    className={c.template}
                                    style={{ color: template.color }}
                                >
                                    <button
                                        type="button"
                                        className={c.open}
                                        aria-label={`Otwórz etap ${template.title}`}
                                        disabled={update.isPending}
                                        onClick={() => setSelected(template)}
                                    >
                                        <span className={c.icon}>
                                            {template.iconId ? (
                                                <ThemedIcon
                                                    iconId={template.iconId}
                                                    size={36}
                                                />
                                            ) : (
                                                <Layers
                                                    size={28}
                                                    aria-hidden="true"
                                                />
                                            )}
                                        </span>
                                        <span className={c.content}>
                                            <strong>{template.title}</strong>
                                            {template.description && (
                                                <span className={c.description}>
                                                    {template.description}
                                                </span>
                                            )}
                                            {!template.isActive && (
                                                <span
                                                    className={c.archiveBadge}
                                                >
                                                    Archiwum
                                                </span>
                                            )}
                                        </span>
                                        <ChevronRight
                                            className={c.chevron}
                                            size={16}
                                            aria-hidden="true"
                                        />
                                    </button>
                                    {isAdmin && (
                                        <Button
                                            type="button"
                                            className={c.action}
                                            title={
                                                template.isActive
                                                    ? 'Archiwizuj'
                                                    : 'Przywróć'
                                            }
                                            aria-label={`${
                                                template.isActive
                                                    ? 'Archiwizuj'
                                                    : 'Przywróć'
                                            } etap ${template.title}`}
                                            disabled={update.isPending}
                                            onClick={() => {
                                                setActionError(undefined)

                                                if (template.isActive)
                                                    setArchiveTemplate(template)
                                                else
                                                    void changeActive(
                                                        template,
                                                        true,
                                                    )
                                            }}
                                        >
                                            {template.isActive ? (
                                                <Archive
                                                    size={16}
                                                    aria-hidden="true"
                                                />
                                            ) : (
                                                <RotateCcw
                                                    size={16}
                                                    aria-hidden="true"
                                                />
                                            )}
                                        </Button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                    {query.isSuccess && !templates.length && (
                        <p className={c.state}>
                            {searchQuery
                                ? 'Nie znaleziono etapów.'
                                : archived
                                  ? 'Brak zarchiwizowanych etapów.'
                                  : 'Brak szablonów etapów.'}
                        </p>
                    )}
                    {query.isError && (
                        <div className={c.error} role="alert">
                            <p>Nie udało się wczytać etapów.</p>
                            <Button
                                type="button"
                                pending={query.isFetching}
                                onClick={() => {
                                    void query.refetch()
                                }}
                            >
                                Spróbuj ponownie
                            </Button>
                        </div>
                    )}
                    {actionError && !archiveTemplate && (
                        <p className={c.actionError} role="alert">
                            {actionError}
                        </p>
                    )}
                    {query.hasNextPage && !query.isError && (
                        <div className={c.more}>
                            <Button
                                type="button"
                                pending={query.isFetchingNextPage}
                                disabled={query.isFetching || update.isPending}
                                onClick={() => {
                                    void query.fetchNextPage()
                                }}
                            >
                                Pokaż więcej
                            </Button>
                        </div>
                    )}
                </div>
            </div>
            {creating && (
                <Popup
                    title="Nowy etap"
                    closeDisabled={formPending}
                    fallbackFocusRef={sectionRef}
                    onClose={() => setCreating(false)}
                >
                    <StageTemplateForm
                        onPendingChange={setFormPending}
                        onCancel={() => setCreating(false)}
                        onSuccess={(template) => {
                            setFormPending(false)

                            setCreating(false)

                            setArchived(false)

                            setSearch('')

                            setSelected(template)
                        }}
                    />
                </Popup>
            )}
            {(selected || targetOpen) && (
                <Popup
                    title={selected?.title ?? 'Szablon etapu'}
                    closeDisabled={formPending}
                    fallbackFocusRef={sectionRef}
                    onClose={closeSelected}
                >
                    {selected ? (
                        <StageTemplateDetails
                            key={selected.id}
                            template={selected}
                            onTemplateChange={setSelected}
                            onPendingChange={setFormPending}
                        />
                    ) : target.isError ? (
                        <div role="alert">
                            <p>Nie można otworzyć tego szablonu etapu.</p>
                            <Button
                                type="button"
                                onClick={() => void target.refetch()}
                            >
                                Spróbuj ponownie
                            </Button>
                        </div>
                    ) : (
                        <p role="status">Wczytywanie etapu…</p>
                    )}
                </Popup>
            )}
            {archiveTemplate && (
                <Popup
                    title="Archiwizować etap?"
                    closeDisabled={update.isPending}
                    fallbackFocusRef={sectionRef}
                    onClose={() => setArchiveTemplate(null)}
                >
                    <FormContainer
                        aria-label="Archiwizacja szablonu etapu"
                        submitTitle="Archiwizuj"
                        isPending={update.isPending}
                        error={actionError}
                        onCancel={() => setArchiveTemplate(null)}
                        onSubmit={() => {
                            void changeActive(archiveTemplate, false)
                        }}
                    >
                        <p className={c.confirmation}>
                            Etap „{archiveTemplate.title}” nie będzie dostępny
                            przy dodawaniu do nowych spraw. Istniejące etapy
                            klientów pozostaną bez zmian.
                        </p>
                    </FormContainer>
                </Popup>
            )}
        </section>
    )
}
