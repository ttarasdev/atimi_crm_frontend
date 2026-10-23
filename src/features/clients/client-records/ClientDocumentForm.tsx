'use client'

import { useEffect, useRef, useState } from 'react'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { MediaFileInput } from '@/components/form-components/media-file-input/MediaFileInput'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import { DocumentLibraryPicker } from '@/features/documents/document-library-picker/DocumentLibraryPicker'
import {
    useCreatePrivateAsset,
    useDeletePrivateAsset,
} from '@/shared/hooks/usePrivateAssets'
import { PrivateBucket } from '@/api/private-assets/private-assets.types'
import type { AssetVisibility } from '@/api/private-assets/private-assets.types'
import { useUploadName } from '@/shared/hooks/useUploadName'
import { useClientSubmit } from '../useClientSubmit'
import c from '../Clients.module.scss'

export function ClientDocumentForm({
    document,
    withCategory = true,
    fixedVisibility,
    libraryBuckets,
    libraryVisibility,
    fileInputTitle = 'Plik',
    hint = 'Usunięcie dokumentu z karty odłączy plik. Sam plik pozostanie w bibliotece.',
    onSave,
    onSaved,
    onCancel,
    onPendingChange,
    onGenerate,
}: {
    document?: {
        title: string
        privateAssetId: number
        category?: string | null
    }
    withCategory?: boolean
    fixedVisibility?: AssetVisibility
    libraryBuckets?: PrivateBucket[]
    libraryVisibility?: AssetVisibility
    fileInputTitle?: string
    hint?: string
    onSave: (
        dto: { title: string; privateAssetId: number; category: string | null },
        signal: AbortSignal,
    ) => Promise<unknown>
    onSaved: () => void
    onCancel: () => void
    onPendingChange?: (pending: boolean) => void
    onGenerate?: () => void
}) {
    const {
        name: title,
        setName: setTitle,
        setFileName,
        isValid,
    } = useUploadName(document?.title ?? '')

    const [category, setCategory] = useState(document?.category ?? '')

    const [mode, setMode] = useState<'upload' | 'library'>('upload')

    const [file, setFile] = useState<File | null>(null)

    const [ids, setIds] = useState<number[]>([])

    const [visibility, setVisibility] = useState<AssetVisibility>(
        fixedVisibility ?? 'team',
    )

    const uploaded = useRef<{
        id: number
        file: File
        visibility: 'author' | 'team'
        originalName: string
    } | null>(null)

    const attached = useRef(false)

    const upload = useCreatePrivateAsset()

    const remove = useDeletePrivateAsset()

    const removeRef = useRef(remove.mutate)

    useEffect(() => {
        removeRef.current = remove.mutate
    }, [remove.mutate])

    const submit = useClientSubmit(onPendingChange)

    useEffect(
        () => () => {
            if (uploaded.current && !attached.current)
                removeRef.current({ id: uploaded.current.id })
        },
        [],
    )

    return (
        <FormContainer
            aria-label="Dokument klienta"
            isPending={submit.pending}
            error={submit.error}
            onCancel={onCancel}
            onSubmit={() =>
                void submit.run(async (signal) => {
                    if (!isValid) {
                        submit.setError('Wpisz nazwę dokumentu.')

                        return
                    }

                    let assetId = document?.privateAssetId

                    if (!document && mode === 'library') assetId = ids[0]

                    if (!document && mode === 'upload') {
                        if (!file) {
                            submit.setError('Wybierz plik.')

                            return
                        }

                        if (file.size > 20 * 1024 * 1024) {
                            submit.setError(
                                'Maksymalny rozmiar pliku to 20 MB.',
                            )

                            return
                        }

                        if (
                            uploaded.current &&
                            (uploaded.current.file !== file ||
                                uploaded.current.visibility !== visibility ||
                                uploaded.current.originalName !== title.trim())
                        ) {
                            await remove.mutateAsync({
                                id: uploaded.current.id,
                                signal,
                            })

                            uploaded.current = null
                        }

                        if (!uploaded.current) {
                            const asset = await upload.mutateAsync({
                                file,
                                dto: {
                                    bucket: PrivateBucket.CLIENT_DOCUMENTS,
                                    visibility,
                                    originalName: title.trim(),
                                },
                                signal,
                            })

                            uploaded.current = {
                                id: asset.id,
                                file,
                                visibility,
                                originalName: title.trim(),
                            }
                        }

                        assetId = uploaded.current.id
                    }

                    if (!assetId) {
                        submit.setError('Wybierz dokument z biblioteki.')

                        return
                    }

                    await onSave(
                        {
                            title: title.trim(),
                            privateAssetId: assetId,
                            category: category.trim() || null,
                        },
                        signal,
                    )

                    attached.current = uploaded.current?.id === assetId

                    if (!signal.aborted) onSaved()
                })
            }
        >
            {!document && onGenerate && (
                <button
                    type="button"
                    className={c.primary}
                    onClick={onGenerate}
                >
                    Generuj z szablonu
                </button>
            )}
            <TextInput
                inputTitle="Nazwa dokumentu"
                value={title}
                onChange={setTitle}
                required
                maxLength={255}
            />
            {withCategory && (
                <TextInput
                    inputTitle="Kategoria"
                    value={category}
                    onChange={setCategory}
                    maxLength={100}
                    placeholder="np. umowa, dokument tożsamości"
                />
            )}
            {!document && (
                <>
                    <div className={c.tabs}>
                        <button
                            type="button"
                            className={mode === 'upload' ? c.selected : ''}
                            onClick={() => setMode('upload')}
                        >
                            Z komputera
                        </button>
                        <button
                            type="button"
                            className={mode === 'library' ? c.selected : ''}
                            onClick={() => setMode('library')}
                        >
                            Z biblioteki
                        </button>
                    </div>
                    {mode === 'upload' ? (
                        <>
                            <MediaFileInput
                                inputTitle={fileInputTitle}
                                value={file}
                                setFile={(selected) => {
                                    setFile(selected)

                                    setFileName(selected)
                                }}
                                hint="Oryginalny plik bez konwersji. Maksymalnie 20 MB."
                            />
                            {!fixedVisibility && (
                                <FormSelect<'author' | 'team'>
                                    selectTitle="Widoczność dokumentu"
                                    value={visibility}
                                    onChange={setVisibility}
                                    options={[
                                        {
                                            title: 'Opiekun klienta i administrator',
                                            value: 'team',
                                        },
                                        {
                                            title: 'Tylko autor i administrator',
                                            value: 'author',
                                        },
                                    ]}
                                />
                            )}
                        </>
                    ) : (
                        <DocumentLibraryPicker
                            selectedIds={ids}
                            onChange={setIds}
                            maxFiles={1}
                            ownOnly={false}
                            visibility={libraryVisibility}
                            buckets={
                                libraryBuckets ?? [
                                    PrivateBucket.CLIENT_DOCUMENTS,
                                    PrivateBucket.MANAGER_DOCUMENTS,
                                    PrivateBucket.USER_DOCUMENTS,
                                ]
                            }
                        />
                    )}
                </>
            )}
            <p className={c.hint}>{hint}</p>
        </FormContainer>
    )
}
