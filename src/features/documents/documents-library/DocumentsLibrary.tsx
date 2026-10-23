'use client'

import { useState } from 'react'
import {
    Plus,
    FileText,
    FolderOpen,
    Lock,
    Users,
    Trash2,
    Pencil,
} from 'lucide-react'
import { ApiError } from '@/api/api-error'
import {
    PrivateBucket,
    type AssetVisibility,
    type PrivateAsset,
} from '@/api/private-assets/private-assets.types'
import { Button } from '@/components/ui/button/Button'
import { Popup } from '@/components/ui/popup/Popup'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { useAuth } from '@/shared/hooks/useAuth'
import {
    useDeletePrivateAsset,
    useInfinitePrivateAssets,
    useSetPrivateAssetVisibility,
} from '@/shared/hooks/usePrivateAssets'
import { DocumentDownloadButton } from '../document-download-button/DocumentDownloadButton'
import { DocumentRenameForm } from '../document-rename-form/DocumentRenameForm'
import { DocumentUploadForm } from '../document-upload-form/DocumentUploadForm'
import { getDocumentFormat } from '../document-format'
import c from './DocumentsLibrary.module.scss'

export function DocumentsLibrary() {
    const { manager } = useAuth()

    const [bucket, setBucket] = useState<PrivateBucket | 'all'>('all')

    const [view, setView] = useState<'mine' | 'team'>('mine')

    const [search, setSearch] = useState('')

    const [selected, setSelected] = useState<PrivateAsset | null>(null)

    const [creating, setCreating] = useState(false)

    const [renaming, setRenaming] = useState(false)

    const [deleting, setDeleting] = useState<PrivateAsset | null>(null)

    const [pending, setPending] = useState(false)

    const assets = useInfinitePrivateAssets({
        bucket: bucket === 'all' ? undefined : bucket,
        documentsOnly: true,
        search: search.trim() || undefined,
        ownOnly: view === 'mine',
        visibility: view === 'team' ? 'team' : undefined,
    })

    const visibility = useSetPrivateAssetVisibility()

    const remove = useDeletePrivateAsset()

    const rows = assets.data?.pages.flatMap((page) => page.rows) ?? []

    const canChange =
        selected &&
        (selected.createdByManagerId === manager?.id ||
            manager?.roles.some((role) => role.name === 'admin'))

    const size = (value: number) =>
        Number(value) >= 1024 * 1024
            ? `${(Number(value) / 1024 / 1024).toFixed(1)} MB`
            : `${Math.max(1, Math.round(Number(value) / 1024))} KB`

    function updateVisibility(value: AssetVisibility) {
        if (!selected) return

        visibility.mutate(
            { id: selected.id, visibility: value },
            { onSuccess: setSelected },
        )
    }

    return (
        <section className={c.section} aria-label="Biblioteka dokumentów">
            <header className={c.header}>
                <div>
                    <span className={c.eyebrow}>Wszystko pod ręką</span>
                    <h1>Dokumenty</h1>
                    <p>
                        Twoje pliki i materiały, którymi dzielisz się z
                        zespołem.
                    </p>
                </div>
                <Button type="button" onClick={() => setCreating(true)}>
                    <Plus size={17} aria-hidden="true" />
                    Dodaj dokument
                </Button>
            </header>
            <div className={c.folders}>
                <button
                    type="button"
                    aria-pressed={bucket === 'all'}
                    onClick={() => setBucket('all')}
                >
                    <FolderOpen size={17} aria-hidden="true" />
                    Wszystkie dokumenty
                </button>
                <button
                    type="button"
                    aria-pressed={bucket === PrivateBucket.MANAGER_DOCUMENTS}
                    onClick={() => setBucket(PrivateBucket.MANAGER_DOCUMENTS)}
                >
                    <FolderOpen size={17} aria-hidden="true" />
                    Moje dokumenty
                </button>
                <button
                    type="button"
                    aria-pressed={bucket === PrivateBucket.USER_DOCUMENTS}
                    onClick={() => setBucket(PrivateBucket.USER_DOCUMENTS)}
                >
                    <FileText size={17} aria-hidden="true" />
                    Materiały dla klientów
                </button>
                <button
                    type="button"
                    aria-pressed={bucket === PrivateBucket.CLIENT_DOCUMENTS}
                    onClick={() => setBucket(PrivateBucket.CLIENT_DOCUMENTS)}
                >
                    <Users size={17} aria-hidden="true" />
                    Pliki klientów i etapów
                </button>
            </div>
            <div className={c.filters}>
                <TextInput
                    inputTitle="Szukaj dokumentu"
                    type="search"
                    value={search}
                    onChange={setSearch}
                />
                <div className={c.segment}>
                    <button
                        type="button"
                        aria-pressed={view === 'mine'}
                        onClick={() => setView('mine')}
                    >
                        <Lock size={14} aria-hidden="true" />
                        Moje pliki
                    </button>
                    <button
                        type="button"
                        aria-pressed={view === 'team'}
                        onClick={() => setView('team')}
                    >
                        <Users size={14} aria-hidden="true" />
                        Zespół
                    </button>
                </div>
                <span>{assets.data?.pages[0]?.total ?? 0} plików</span>
            </div>
            {assets.isPending && (
                <p role="status" className={c.state}>
                    Wczytywanie dokumentów…
                </p>
            )}
            {assets.isError && (
                <div role="alert" className={c.state}>
                    <p>Nie udało się wczytać dokumentów.</p>
                    <Button type="button" onClick={() => void assets.refetch()}>
                        Spróbuj ponownie
                    </Button>
                </div>
            )}
            {!assets.isPending && !assets.isError && !rows.length && (
                <div className={c.state}>
                    <FolderOpen size={30} aria-hidden="true" />
                    <h2>
                        {search
                            ? 'Brak pasujących dokumentów'
                            : 'Biblioteka czeka na pierwszy plik'}
                    </h2>
                    <p>
                        Dodaj dokument, aby używać go w sprawach klientów i
                        wiadomościach.
                    </p>
                </div>
            )}
            <div className={c.list}>
                {rows.map((asset) => (
                    <article key={asset.id} className={c.row}>
                        <button
                            type="button"
                            className={c.open}
                            aria-label={`Otwórz dokument ${asset.originalName}`}
                            onClick={() => {
                                visibility.reset()

                                setRenaming(false)

                                setSelected(asset)
                            }}
                        >
                            <span className={c.fileIcon}>
                                <FileText size={22} aria-hidden="true" />
                            </span>
                            <span className={c.name}>
                                <strong>{asset.originalName}</strong>
                                <small>
                                    {getDocumentFormat(asset.mimeType)} ·{' '}
                                    {size(asset.sizeBytes)} ·{' '}
                                    {new Date(
                                        asset.createdAt,
                                    ).toLocaleDateString('pl-PL')}
                                </small>
                            </span>
                        </button>
                        <span className={c.badge}>
                            {asset.visibility === 'author' ? (
                                <Lock size={12} aria-hidden="true" />
                            ) : (
                                <Users size={12} aria-hidden="true" />
                            )}
                            {asset.visibility === 'author'
                                ? 'Prywatny'
                                : 'Zespół'}
                        </span>
                        <DocumentDownloadButton
                            id={asset.id}
                            filename={asset.originalName}
                            compact
                        />
                    </article>
                ))}
            </div>
            {assets.hasNextPage && (
                <Button
                    type="button"
                    pending={assets.isFetchingNextPage}
                    onClick={() => void assets.fetchNextPage()}
                >
                    Pokaż więcej
                </Button>
            )}
            {creating && (
                <Popup
                    title="Nowy dokument"
                    onClose={() => {
                        if (!pending) setCreating(false)
                    }}
                    closeDisabled={pending}
                >
                    <DocumentUploadForm
                        bucket={
                            bucket === 'all' ||
                            bucket === PrivateBucket.CLIENT_DOCUMENTS
                                ? PrivateBucket.MANAGER_DOCUMENTS
                                : bucket
                        }
                        onCancel={() => setCreating(false)}
                        onPendingChange={setPending}
                        onSuccess={(asset) => {
                            setCreating(false)

                            setBucket(asset.bucket)

                            setView('mine')

                            setSelected(asset)
                        }}
                    />
                </Popup>
            )}
            {selected && !deleting && !renaming && (
                <Popup
                    title={selected.originalName}
                    closeDisabled={visibility.isPending}
                    onClose={() => {
                        if (!visibility.isPending) setSelected(null)
                    }}
                >
                    <div className={c.details}>
                        <div className={c.summary}>
                            <span className={c.fileIcon}>
                                <FileText size={30} aria-hidden="true" />
                            </span>
                            <div>
                                <strong>{selected.originalName}</strong>
                                <small>
                                    {size(selected.sizeBytes)} ·{' '}
                                    {selected.mimeType}
                                </small>
                            </div>
                        </div>
                        <dl>
                            <dt>Dodano</dt>
                            <dd>
                                {new Date(selected.createdAt).toLocaleString(
                                    'pl-PL',
                                )}
                            </dd>
                            <dt>Folder</dt>
                            <dd>
                                {selected.bucket ===
                                PrivateBucket.MANAGER_DOCUMENTS
                                    ? 'Moje dokumenty'
                                    : selected.bucket ===
                                        PrivateBucket.CLIENT_DOCUMENTS
                                      ? 'Pliki klientów i etapów'
                                      : 'Materiały dla klientów'}
                            </dd>
                        </dl>
                        {canChange ? (
                            <FormSelect
                                selectTitle="Widoczność pliku"
                                value={selected.visibility}
                                disabled={visibility.isPending}
                                onChange={(value) => {
                                    if (value === 'author' || value === 'team')
                                        updateVisibility(value)
                                }}
                                options={[
                                    {
                                        title: 'Prywatny — tylko autor i administrator',
                                        value: 'author',
                                    },
                                    { title: 'Dla zespołu', value: 'team' },
                                ]}
                            />
                        ) : (
                            <p>
                                {selected.visibility === 'team'
                                    ? 'Plik udostępniony zespołowi.'
                                    : 'Plik prywatny.'}
                            </p>
                        )}
                        {visibility.isError && (
                            <p role="alert">
                                Nie udało się zmienić widoczności.
                            </p>
                        )}
                        <p className={c.hint}>
                            Dokument przypisany do klienta pozostaje dostępny
                            zgodnie z dostępem do tego klienta.
                        </p>
                        <div className={c.actions}>
                            <DocumentDownloadButton
                                id={selected.id}
                                filename={selected.originalName}
                            />
                            {canChange && (
                                <Button
                                    type="button"
                                    disabled={visibility.isPending}
                                    onClick={() => setRenaming(true)}
                                >
                                    <Pencil size={15} aria-hidden="true" />
                                    Zmień nazwę
                                </Button>
                            )}
                            {canChange && (
                                <Button
                                    type="button"
                                    disabled={visibility.isPending}
                                    onClick={() => {
                                        remove.reset()

                                        setDeleting(selected)
                                    }}
                                >
                                    <Trash2 size={15} aria-hidden="true" />
                                    Usuń plik
                                </Button>
                            )}
                        </div>
                    </div>
                </Popup>
            )}
            {selected && renaming && (
                <Popup
                    title="Zmień nazwę dokumentu"
                    closeDisabled={pending}
                    onClose={() => {
                        if (!pending) setRenaming(false)
                    }}
                >
                    <DocumentRenameForm
                        key={selected.id}
                        asset={selected}
                        onCancel={() => setRenaming(false)}
                        onPendingChange={setPending}
                        onSuccess={(asset) => {
                            setSelected(asset)

                            setRenaming(false)
                        }}
                    />
                </Popup>
            )}
            {deleting && (
                <Popup
                    title="Usunąć plik?"
                    closeDisabled={remove.isPending}
                    onClose={() => {
                        if (!remove.isPending) setDeleting(null)
                    }}
                >
                    <FormContainer
                        aria-label="Usuwanie dokumentu"
                        submitTitle="Usuń plik"
                        isPending={remove.isPending}
                        onCancel={() => setDeleting(null)}
                        error={
                            remove.isError
                                ? remove.error instanceof ApiError &&
                                  remove.error.status === 409
                                    ? 'Ten plik jest używany w sprawie lub innym rekordzie. Najpierw usuń jego powiązania.'
                                    : 'Nie udało się usunąć pliku. Spróbuj ponownie.'
                                : undefined
                        }
                        onSubmit={() =>
                            remove.mutate(
                                { id: deleting.id },
                                {
                                    onSuccess: () => {
                                        setSelected(null)

                                        setDeleting(null)
                                    },
                                },
                            )
                        }
                    >
                        <p>
                            Plik „{deleting.originalName}” zostanie trwale
                            usunięty z biblioteki. Plików używanych w sprawach
                            nie można usunąć.
                        </p>
                    </FormContainer>
                </Popup>
            )}
        </section>
    )
}
