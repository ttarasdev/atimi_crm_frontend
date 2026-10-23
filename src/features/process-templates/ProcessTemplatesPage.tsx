'use client'

import { useDeferredValue, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
    ArrowDown,
    ArrowUp,
    FolderKanban,
    Layers3,
    Pencil,
    Plus,
    X,
} from 'lucide-react'
import type { ProcessTemplate } from '@/api/process-templates/process-templates.types'
import type { StageTemplate } from '@/api/stage-templates/stage-templates.types'
import { ThemedIcon } from '@/components/theme-components/themed-icon/ThemedIcon'
import { Button } from '@/components/ui/button/Button'
import { Popup } from '@/components/ui/popup/Popup'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { FormTextarea } from '@/components/form-components/form-textarea/FormTextarea'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import {
    useProcessTemplates,
    useProcessTemplate,
    useSaveProcessTemplate,
} from '@/shared/hooks/useProcessTemplates'
import {
    useInfiniteStageTemplates,
    useStageTemplate,
} from '@/shared/hooks/useStageTemplates'
import { useRoles } from '@/shared/hooks/useRoles'
import { useClientSubmit } from '@/features/clients/useClientSubmit'
import { ClientQueryState } from '@/features/clients/ClientQueryState'
import c from './ProcessTemplatesPage.module.scss'

function stageCount(count: number) {
    const ending =
        count === 1
            ? 'etap'
            : count % 10 >= 2 &&
                count % 10 <= 4 &&
                (count % 100 < 12 || count % 100 > 14)
              ? 'etapy'
              : 'etapów'

    return `${count} ${ending}`
}

function StageStep({
    id,
    index,
    known,
    loading,
    children,
}: {
    id: number
    index: number
    known?: StageTemplate
    loading: boolean
    children?: ReactNode
}) {
    const query = useStageTemplate(known || loading ? null : id)

    const stage = known ?? query.data

    return (
        <li className={c.stage}>
            <span
                className={c.stageNumber}
                style={{ color: stage?.color ?? 'var(--primary)' }}
            >
                {index + 1}
            </span>
            <div className={c.stageName}>
                {stage?.iconId && (
                    <ThemedIcon
                        iconId={stage.iconId}
                        size={16}
                        color={stage.color}
                    />
                )}
                <span>{stage?.title ?? `Etap #${id}`}</span>
                {stage?.isActive === false && <small>Archiwalny</small>}
            </div>
            {children && <div className={c.stageActions}>{children}</div>}
        </li>
    )
}

function TemplateForm({
    template,
    onSaved,
    onCancel,
    onPendingChange,
}: {
    template?: ProcessTemplate
    onSaved: () => void
    onCancel: () => void
    onPendingChange: (pending: boolean) => void
}) {
    const [title, setTitle] = useState(template?.title ?? '')

    const [description, setDescription] = useState(template?.description ?? '')

    const [stageIds, setStageIds] = useState(template?.stageTemplateIds ?? [])

    const [stageId, setStageId] = useState<number | null>(null)

    const [active, setActive] = useState(template?.isActive ?? true)

    const stages = useInfiniteStageTemplates()

    const rows = stages.data?.pages.flatMap((page) => page.rows) ?? []

    const mutation = useSaveProcessTemplate()

    const submit = useClientSubmit(onPendingChange)

    function move(index: number, offset: number) {
        const next = [...stageIds]

        const [moved] = next.splice(index, 1)

        next.splice(index + offset, 0, moved)

        setStageIds(next)
    }

    return (
        <FormContainer
            aria-label="Szablon sprawy"
            isPending={submit.pending}
            error={submit.error}
            onCancel={onCancel}
            submitTitle="Zapisz szablon"
            onSubmit={() =>
                void submit.run(async (signal) => {
                    if (!title.trim()) {
                        submit.setError('Wpisz nazwę szablonu.')

                        return
                    }

                    await mutation.mutateAsync({
                        id: template?.id,
                        dto: {
                            title: title.trim(),
                            description: description.trim(),
                            stageTemplateIds: stageIds,
                            isActive: active,
                        },
                        signal,
                    })

                    if (!signal.aborted) onSaved()
                })
            }
        >
            <TextInput
                inputTitle="Nazwa szablonu"
                value={title}
                onChange={setTitle}
                required
                maxLength={150}
                placeholder="np. Pobyt czasowy — praca"
            />
            <FormTextarea
                inputTitle="Opis"
                value={description}
                onChange={setDescription}
                rows={3}
                maxLength={5000}
            />
            <section className={c.section}>
                <div className={c.sectionHeading}>
                    <h3>Etapy w kolejności</h3>
                    <span>{stageIds.length} / 100</span>
                </div>
                {!stageIds.length && (
                    <p className={c.hint}>
                        Dodaj etapy z konstruktora. Ich zadania, notatki i
                        dokumenty zostaną skopiowane do nowej sprawy.
                    </p>
                )}
                <ol className={c.stageList}>
                    {stageIds.map((id, index) => (
                        <StageStep
                            key={id}
                            id={id}
                            index={index}
                            loading={stages.isPending}
                            known={rows.find((stage) => stage.id === id)}
                        >
                            <Button
                                type="button"
                                aria-label={`Przesuń etap ${index + 1} w górę`}
                                disabled={index === 0}
                                onClick={() => move(index, -1)}
                            >
                                <ArrowUp size={14} />
                            </Button>
                            <Button
                                type="button"
                                aria-label={`Przesuń etap ${index + 1} w dół`}
                                disabled={index === stageIds.length - 1}
                                onClick={() => move(index, 1)}
                            >
                                <ArrowDown size={14} />
                            </Button>
                            <Button
                                type="button"
                                aria-label={`Usuń etap ${index + 1}`}
                                onClick={() =>
                                    setStageIds(
                                        stageIds.filter((_, i) => i !== index),
                                    )
                                }
                            >
                                <X size={14} />
                            </Button>
                        </StageStep>
                    ))}
                </ol>
                <div className={c.stagePicker}>
                    <FormSelect
                        selectTitle="Dodaj etap"
                        value={stageId}
                        onChange={setStageId}
                        options={[
                            { title: 'Wybierz etap', value: null },
                            ...rows
                                .filter(
                                    (stage) =>
                                        stage.isActive &&
                                        !stageIds.includes(stage.id),
                                )
                                .map((stage) => ({
                                    title: stage.title,
                                    value: stage.id,
                                })),
                        ]}
                    />
                    {stages.isError && (
                        <Button
                            type="button"
                            onClick={() => void stages.refetch()}
                        >
                            Wczytaj etapy ponownie
                        </Button>
                    )}
                    {stages.hasNextPage && (
                        <Button
                            type="button"
                            pending={stages.isFetchingNextPage}
                            onClick={() => void stages.fetchNextPage()}
                        >
                            Więcej etapów
                        </Button>
                    )}
                    <Button
                        type="button"
                        disabled={!stageId || stageIds.length >= 100}
                        onClick={() => {
                            if (stageId) setStageIds([...stageIds, stageId])

                            setStageId(null)
                        }}
                    >
                        <Plus size={14} />
                        Dodaj wybrany etap
                    </Button>
                </div>
            </section>
            <label className={c.activeToggle}>
                <input
                    type="checkbox"
                    checked={active}
                    onChange={(event) => setActive(event.target.checked)}
                />
                <span>
                    Szablon aktywny
                    <small>Można go wybrać podczas tworzenia sprawy.</small>
                </span>
            </label>
            <p className={c.hint}>
                Zmiana szablonu nie zmienia spraw już utworzonych. Pierwszy etap
                nowej sprawy będzie aktywny.
            </p>
        </FormContainer>
    )
}

export function ProcessTemplatesPage({
    initialTemplateId,
}: {
    initialTemplateId?: number
}) {
    const router = useRouter()

    const [targetOpen, setTargetOpen] = useState(
        initialTemplateId !== undefined,
    )

    const target = useProcessTemplate(
        targetOpen ? (initialTemplateId ?? null) : null,
    )

    const [search, setSearch] = useState('')

    const deferred = useDeferredValue(search.trim())

    const [active, setActive] = useState<'true' | 'false' | null>(null)

    const [editing, setEditing] = useState<ProcessTemplate | 'new' | null>(null)

    const [pending, setPending] = useState(false)

    const query = useProcessTemplates({
        ...(deferred ? { search: deferred } : {}),
        ...(active !== null ? { isActive: active === 'true' } : {}),
    })

    const { hasRole } = useRoles()

    const stages = useInfiniteStageTemplates()

    const stageRows = stages.data?.pages.flatMap((page) => page.rows) ?? []

    const rows = query.data?.pages.flatMap((page) => page.rows) ?? []

    function closeTarget() {
        setTargetOpen(false)

        if (initialTemplateId)
            router.replace('/main/management/processes', { scroll: false })
    }

    function closeEditor() {
        setEditing(null)

        if (initialTemplateId)
            router.replace('/main/management/processes', { scroll: false })
    }

    return (
        <section className={c.stack} aria-label="Szablony spraw">
            <header className={c.header}>
                <div className={c.heading}>
                    <span className={c.pageMark}>
                        <FolderKanban size={23} aria-hidden />
                    </span>
                    <div>
                        <h2>Szablony spraw</h2>
                        <p>
                            Gotowe ścieżki obsługi klienta, od pierwszego etapu
                            do zakończenia.
                        </p>
                    </div>
                </div>
                {hasRole('admin') && (
                    <Button type="button" onClick={() => setEditing('new')}>
                        <Plus size={15} />
                        Dodaj szablon
                    </Button>
                )}
            </header>
            <div className={c.toolbar}>
                <TextInput
                    inputTitle="Szukaj szablonu sprawy"
                    type="search"
                    value={search}
                    onChange={setSearch}
                    maxLength={100}
                    placeholder="Nazwa lub opis szablonu"
                />
                <FormSelect
                    selectTitle="Status szablonu"
                    value={active}
                    onChange={setActive}
                    options={[
                        { title: 'Wszystkie szablony', value: null },
                        { title: 'Aktywne', value: 'true' },
                        { title: 'Archiwalne', value: 'false' },
                    ]}
                />
            </div>
            <ClientQueryState
                pending={query.isPending}
                error={query.isError}
                empty={!rows.length}
                onRetry={() => void query.refetch()}
                emptyTitle="Brak szablonów spraw."
            />
            <div className={c.cards}>
                {rows.map((template) => (
                    <article
                        key={template.id}
                        className={c.card}
                        aria-label={template.title}
                    >
                        <div className={c.cardTop}>
                            <span
                                className={`${c.status} ${template.isActive ? c.statusActive : ''}`}
                            >
                                <span aria-hidden />
                                {template.isActive ? 'Aktywny' : 'Archiwalny'}
                            </span>
                            <span className={c.stageCount}>
                                <Layers3 size={14} aria-hidden />
                                {stageCount(template.stageTemplateIds.length)}
                            </span>
                        </div>
                        <div className={c.cardHeading}>
                            <h3>{template.title}</h3>
                            {template.description && (
                                <p>{template.description}</p>
                            )}
                        </div>
                        <ol
                            className={c.stageList}
                            aria-label="Kolejność etapów"
                        >
                            {template.stageTemplateIds.map((id, index) => (
                                <StageStep
                                    key={id}
                                    id={id}
                                    index={index}
                                    loading={stages.isPending}
                                    known={stageRows.find(
                                        (stage) => stage.id === id,
                                    )}
                                />
                            ))}
                        </ol>
                        {!template.stageTemplateIds.length && (
                            <p className={c.hint}>
                                Ten szablon nie zawiera jeszcze etapów.
                            </p>
                        )}
                        <footer className={c.cardFooter}>
                            <span>Etapy kopiują się do nowej sprawy.</span>
                            {hasRole('admin') && (
                                <Button
                                    type="button"
                                    className={c.editButton}
                                    onClick={() => setEditing(template)}
                                >
                                    <Pencil size={14} aria-hidden />
                                    Edytuj szablon
                                </Button>
                            )}
                        </footer>
                    </article>
                ))}
            </div>
            {query.hasNextPage && (
                <Button
                    type="button"
                    pending={query.isFetchingNextPage}
                    onClick={() => void query.fetchNextPage()}
                >
                    Pokaż więcej
                </Button>
            )}
            {editing && (
                <Popup
                    title={
                        editing === 'new'
                            ? 'Nowy szablon sprawy'
                            : 'Edytuj szablon sprawy'
                    }
                    size="wide"
                    closeDisabled={pending}
                    onClose={closeEditor}
                >
                    <TemplateForm
                        template={editing === 'new' ? undefined : editing}
                        onSaved={closeEditor}
                        onCancel={closeEditor}
                        onPendingChange={setPending}
                    />
                </Popup>
            )}
            {targetOpen && (
                <Popup
                    title={
                        !target.isError
                            ? (target.data?.title ?? 'Szablon sprawy')
                            : 'Szablon sprawy'
                    }
                    onClose={closeTarget}
                >
                    {target.isError ? (
                        <div role="alert">
                            <p>Nie można otworzyć tego szablonu sprawy.</p>
                            <Button
                                type="button"
                                onClick={() => void target.refetch()}
                            >
                                Spróbuj ponownie
                            </Button>
                        </div>
                    ) : target.data ? (
                        <div className={c.stack}>
                            <p>{target.data.description}</p>
                            <p>
                                {stageCount(
                                    target.data.stageTemplateIds.length,
                                )}{' '}
                                ·{' '}
                                {target.data.isActive
                                    ? 'Aktywny'
                                    : 'Archiwalny'}
                            </p>
                            <ol
                                className={c.stageList}
                                aria-label="Kolejność etapów"
                            >
                                {target.data.stageTemplateIds.map(
                                    (id, index) => (
                                        <StageStep
                                            key={id}
                                            id={id}
                                            index={index}
                                            loading={stages.isPending}
                                            known={stageRows.find(
                                                (stage) => stage.id === id,
                                            )}
                                        />
                                    ),
                                )}
                            </ol>
                            {hasRole('admin') && (
                                <Button
                                    type="button"
                                    onClick={() => {
                                        setEditing(target.data ?? null)

                                        setTargetOpen(false)
                                    }}
                                >
                                    Edytuj szablon
                                </Button>
                            )}
                        </div>
                    ) : (
                        <p role="status">Wczytywanie szablonu…</p>
                    )}
                </Popup>
            )}
        </section>
    )
}
