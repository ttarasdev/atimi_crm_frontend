'use client'

import { useState } from 'react'
import { FolderOpen, Check, X, FileText } from 'lucide-react'
import { PrivateBucket } from '@/api/private-assets/private-assets.types'
import type { AssetVisibility } from '@/api/private-assets/private-assets.types'
import { Button } from '@/components/ui/button/Button'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import {
    useInfinitePrivateAssets,
    usePrivateAsset,
} from '@/shared/hooks/usePrivateAssets'
import { getDocumentFormat } from '../document-format'
import c from './DocumentLibraryPicker.module.scss'

const defaultBuckets = [
    PrivateBucket.MANAGER_DOCUMENTS,
    PrivateBucket.USER_DOCUMENTS,
]

export function DocumentLibraryPicker({
    selectedIds,
    onChange,
    ownOnly = true,
    disabled = false,
    maxFiles = 10,
    buckets = defaultBuckets,
    visibility,
}: {
    selectedIds: number[]
    onChange: (ids: number[]) => void
    ownOnly?: boolean
    disabled?: boolean
    maxFiles?: number
    buckets?: PrivateBucket[]
    visibility?: AssetVisibility
}) {
    const [open, setOpen] = useState(false)

    return (
        <div className={c.field}>
            <button
                type="button"
                className={c.trigger}
                disabled={disabled}
                aria-expanded={open}
                onClick={() => setOpen(!open)}
            >
                <FolderOpen size={17} aria-hidden="true" />
                <span>Wybierz z biblioteki</span>
                <b>{selectedIds.length}</b>
            </button>
            {selectedIds.length > 0 && (
                <div className={c.selection} aria-label="Wybrane dokumenty">
                    {selectedIds.map((id) => (
                        <span key={id}>
                            <SelectedDocumentName id={id} />
                            <button
                                type="button"
                                disabled={disabled}
                                aria-label={`Odłącz dokument ${id}`}
                                onClick={() =>
                                    onChange(
                                        selectedIds.filter(
                                            (value) => value !== id,
                                        ),
                                    )
                                }
                            >
                                <X size={13} aria-hidden="true" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            {open && (
                <LibrarySelection
                    selectedIds={selectedIds}
                    onChange={onChange}
                    ownOnly={ownOnly}
                    disabled={disabled}
                    maxFiles={maxFiles}
                    buckets={buckets.length ? buckets : defaultBuckets}
                    visibility={visibility}
                />
            )}
        </div>
    )
}

function SelectedDocumentName({ id }: { id: number }) {
    const asset = usePrivateAsset(id)

    return (
        <strong title={asset.data?.originalName}>
            {asset.data?.originalName ??
                (asset.isError
                    ? `Niedostępny dokument #${id}`
                    : `Dokument #${id}`)}
        </strong>
    )
}

function LibrarySelection({
    selectedIds,
    onChange,
    ownOnly,
    disabled,
    maxFiles,
    buckets,
    visibility,
}: {
    selectedIds: number[]
    onChange: (ids: number[]) => void
    ownOnly: boolean
    disabled: boolean
    maxFiles: number
    buckets: PrivateBucket[]
    visibility?: AssetVisibility
}) {
    const [search, setSearch] = useState('')

    const [bucket, setBucket] = useState(buckets[0])

    const assets = useInfinitePrivateAssets({
        bucket,
        ownOnly,
        visibility,
        search: search.trim() || undefined,
    })

    const rows = assets.data?.pages.flatMap((page) => page.rows) ?? []

    const pending = assets.isPending

    const error = assets.isError

    return (
        <div className={c.library}>
            {buckets.length > 1 && (
                <FormSelect
                    selectTitle="Folder biblioteki"
                    value={bucket}
                    disabled={disabled}
                    onChange={(value) => {
                        const selected = buckets.find((item) => item === value)

                        if (selected) setBucket(selected)
                    }}
                    options={buckets.map((value) => ({
                        value,
                        title:
                            value === PrivateBucket.MANAGER_DOCUMENTS
                                ? 'Moje dokumenty'
                                : value === PrivateBucket.USER_DOCUMENTS
                                  ? 'Materiały dla klientów'
                                  : 'Dokumenty klientów',
                    }))}
                />
            )}
            <TextInput
                inputTitle="Szukaj dokumentu"
                value={search}
                onChange={setSearch}
                type="search"
                disabled={disabled}
            />
            {pending && <p role="status">Wczytywanie biblioteki…</p>}
            {error && (
                <div role="alert">
                    <p>Nie udało się wczytać biblioteki.</p>
                    <Button type="button" onClick={() => void assets.refetch()}>
                        Spróbuj ponownie
                    </Button>
                </div>
            )}
            {!pending && !error && rows.length === 0 && (
                <p>Brak dokumentów. Dodaj plik na stronie Dokumenty.</p>
            )}
            <div className={c.rows}>
                {rows.map((asset) => {
                    const selected = selectedIds.includes(asset.id)

                    return (
                        <button
                            key={asset.id}
                            type="button"
                            className={c.row}
                            aria-pressed={selected}
                            disabled={
                                disabled ||
                                (!selected && selectedIds.length >= maxFiles)
                            }
                            onClick={() =>
                                onChange(
                                    selected
                                        ? selectedIds.filter(
                                              (id) => id !== asset.id,
                                          )
                                        : [...selectedIds, asset.id],
                                )
                            }
                        >
                            <FileText size={18} aria-hidden="true" />
                            <span>
                                <strong>{asset.originalName}</strong>
                                <small>
                                    {getDocumentFormat(asset.mimeType)} ·{' '}
                                    {(Number(asset.sizeBytes) / 1024).toFixed(
                                        0,
                                    )}{' '}
                                    KB ·{' '}
                                    {asset.visibility === 'author'
                                        ? 'Prywatny'
                                        : 'Dla zespołu'}
                                </small>
                            </span>
                            {selected && <Check size={16} aria-hidden="true" />}
                        </button>
                    )
                })}
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
            <small>
                Wybrano {selectedIds.length} z {maxFiles} plików.
            </small>
        </div>
    )
}
