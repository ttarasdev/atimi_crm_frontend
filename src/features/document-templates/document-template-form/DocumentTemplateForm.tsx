'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import type {
    DocumentAnalyzedField,
    DocumentTemplate,
    DocumentTemplateAnalysis,
} from '@/api/document-templates/document-templates.types'
import { PrivateBucket } from '@/api/private-assets/private-assets.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import { FormTextarea } from '@/components/form-components/form-textarea/FormTextarea'
import { MediaFileInput } from '@/components/form-components/media-file-input/MediaFileInput'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { Button } from '@/components/ui/button/Button'
import { useClientSubmit } from '@/features/clients/useClientSubmit'
import {
    useAnalyzeDocumentTemplateSource,
    useCreateDocumentTemplate,
    useDocumentFields,
    useDocumentTemplateVariables,
    useDocumentTypes,
    useSaveDocumentField,
    useUpdateDocumentTemplate,
} from '@/shared/hooks/useDocumentTemplates'
import {
    useCreatePrivateAsset,
    useDeletePrivateAsset,
} from '@/shared/hooks/usePrivateAssets'
import { useUploadName } from '@/shared/hooks/useUploadName'
import {
    DocumentVariablesCatalog,
    documentVariableGroups,
} from '../DocumentVariablesCatalog'
import c from '../DocumentTemplates.module.scss'

export function DocumentTemplateForm({
    template,
    onSuccess,
    onCancel,
    onPendingChange,
}: {
    template?: DocumentTemplate
    onSuccess: (template: DocumentTemplate) => void
    onCancel: () => void
    onPendingChange: (pending: boolean) => void
}) {
    const [typeId, setTypeId] = useState<number | null>(
        template?.typeId ?? null,
    )

    const [name, setName] = useState(template?.name ?? '')

    const [description, setDescription] = useState(template?.description ?? '')

    const [file, setFile] = useState<File | null>(null)

    const [analysis, setAnalysis] = useState<{
        file: File
        originalName: string
        result: DocumentTemplateAnalysis
    } | null>(null)

    const [newField, setNewField] = useState<{
        key: string
        label: string
        defaultValue: string
    } | null>(null)

    const types = useDocumentTypes()

    const variables = useDocumentTemplateVariables()

    const fields = useDocumentFields()

    const create = useCreateDocumentTemplate()

    const update = useUpdateDocumentTemplate()

    const analyze = useAnalyzeDocumentTemplateSource()

    const saveField = useSaveDocumentField()

    const upload = useCreatePrivateAsset()

    const remove = useDeletePrivateAsset()

    const uploadName = useUploadName(template?.asset?.originalName ?? '')

    const removeRef = useRef(remove.mutate)

    const uploaded = useRef<{
        id: number
        file: File
        originalName: string
    } | null>(null)

    const attached = useRef(false)

    const submit = useClientSubmit(onPendingChange)

    const analyzed = Boolean(
        file &&
            analysis?.file === file &&
            analysis.originalName === uploadName.name.trim(),
    )

    const ready = file
        ? analyzed && analysis?.result.canCreate
        : Boolean(template)

    const confirmed: DocumentAnalyzedField[] = file
        ? analyzed
            ? (analysis?.result.fields ?? [])
            : []
        : (template?.fields ?? []).map((key) => {
              const system = variables.data?.find((field) => field.key === key)

              const custom = fields.data?.find((field) => field.key === key)

              return system
                  ? { ...system, source: 'system' }
                  : {
                        key,
                        label: custom?.label ?? key,
                        source: custom ? 'custom' : 'unknown',
                        group: custom ? 'custom' : 'unknown',
                    }
          })

    useEffect(() => {
        removeRef.current = remove.mutate
    }, [remove.mutate])

    useEffect(
        () => () => {
            if (uploaded.current && !attached.current)
                removeRef.current({ id: uploaded.current.id })
        },
        [],
    )

    async function analyzeSource(signal: AbortSignal) {
        if (!file || !uploadName.isValid) {
            submit.setError('Wybierz plik DOCX i wpisz nazwę pliku.')

            return
        }

        if (
            !file.size ||
            file.size > 5 * 1024 * 1024 ||
            !file.name.toLowerCase().endsWith('.docx')
        ) {
            submit.setError('Wybierz plik DOCX o wielkości do 5 MB.')

            return
        }

        const originalName = uploadName.name.trim()

        if (
            uploaded.current &&
            (uploaded.current.file !== file ||
                uploaded.current.originalName !== originalName)
        ) {
            await remove.mutateAsync({ id: uploaded.current.id, signal })

            uploaded.current = null
        }

        if (!uploaded.current) {
            const asset = await upload.mutateAsync({
                file,
                dto: {
                    bucket: PrivateBucket.DOCUMENT_TEMPLATES,
                    visibility: 'team',
                    originalName,
                },
                signal,
            })

            uploaded.current = { id: asset.id, file, originalName }
        }

        const result = await analyze.mutateAsync({
            privateAssetId: uploaded.current.id,
            signal,
        })

        if (!signal.aborted) setAnalysis({ file, originalName, result })
    }

    return (
        <FormContainer
            aria-label={
                template
                    ? 'Edycja szablonu dokumentu'
                    : 'Nowy szablon dokumentu'
            }
            isPending={submit.pending}
            error={submit.error}
            submitDisabled={!ready || Boolean(newField)}
            onCancel={onCancel}
            onSubmit={() =>
                void submit.run(async (signal) => {
                    if (!ready) {
                        submit.setError(
                            'Przeanalizuj aktualny plik DOCX i rozwiąż wszystkie nierozpoznane pola.',
                        )

                        return
                    }

                    if (!name.trim() || name.trim().length > 150) {
                        submit.setError(
                            'Wpisz nazwę szablonu (maksymalnie 150 znaków).',
                        )

                        return
                    }

                    const privateAssetId = file
                        ? uploaded.current?.id
                        : template?.privateAssetId

                    if (!privateAssetId) return

                    const dto = {
                        name: name.trim(),
                        description: description.trim(),
                        ...(typeId ? { typeId } : {}),
                        ...(!template || file ? { privateAssetId } : {}),
                    }

                    const saved = template
                        ? await update.mutateAsync({
                              id: template.id,
                              dto,
                              signal,
                          })
                        : await create.mutateAsync({
                              dto: { ...dto, privateAssetId },
                              signal,
                          })

                    attached.current =
                        uploaded.current?.id === saved.privateAssetId

                    if (!signal.aborted) onSuccess(saved)
                })
            }
        >
            <DocumentVariablesCatalog
                onCreate={() =>
                    setNewField({ key: '', label: '', defaultValue: '' })
                }
            />
            {newField && (
                <section className={c.catalog} aria-label="Nowe własne pole">
                    <strong>Nowe własne pole</strong>
                    <p className={c.hint}>
                        Pole będzie dostępne we wszystkich szablonach. Znacznik
                        w DOCX musi być identyczny z kluczem.
                    </p>
                    <TextInput
                        inputTitle="Nazwa nowego pola"
                        value={newField.label}
                        onChange={(label) =>
                            setNewField({ ...newField, label })
                        }
                        maxLength={150}
                    />
                    <TextInput
                        inputTitle="Klucz nowego pola"
                        value={newField.key}
                        onChange={(key) => setNewField({ ...newField, key })}
                        maxLength={100}
                        hint="Litery, cyfry i podkreślenie; początek od litery. Klucz pozostanie stały."
                    />
                    <FormTextarea
                        inputTitle="Domyślna wartość nowego pola"
                        value={newField.defaultValue}
                        onChange={(defaultValue) =>
                            setNewField({ ...newField, defaultValue })
                        }
                        maxLength={2000}
                        rows={2}
                    />
                    <div className={c.actions}>
                        <Button
                            type="button"
                            onClick={() =>
                                void submit.run(async (signal) => {
                                    if (
                                        !newField.label.trim() ||
                                        !/^[a-zA-Z][a-zA-Z0-9_]{0,99}$/.test(
                                            newField.key,
                                        )
                                    ) {
                                        submit.setError(
                                            'Wpisz nazwę i prawidłowy klucz pola.',
                                        )

                                        return
                                    }

                                    await saveField.mutateAsync({
                                        dto: {
                                            ...newField,
                                            label: newField.label.trim(),
                                        },
                                        signal,
                                    })

                                    if (signal.aborted) return

                                    setNewField(null)

                                    if (file && analyzed)
                                        await analyzeSource(signal)
                                })
                            }
                        >
                            Zapisz pole w katalogu
                        </Button>
                        <Button type="button" onClick={() => setNewField(null)}>
                            Anuluj nowe pole
                        </Button>
                    </div>
                </section>
            )}
            <TextInput
                inputTitle="Nazwa szablonu"
                value={name}
                onChange={setName}
                required
                maxLength={150}
            />
            <FormSelect
                selectTitle="Rodzaj dokumentu"
                value={typeId}
                onChange={setTypeId}
                options={[
                    ...(template?.typeId
                        ? []
                        : [{ title: 'Bez rodzaju', value: null }]),
                    ...(types.data ?? [])
                        .filter((type) => type.isActive || type.id === typeId)
                        .map((type) => ({ title: type.name, value: type.id })),
                ]}
            />
            {types.isError && (
                <p role="alert" className={c.error}>
                    Nie udało się wczytać rodzajów dokumentów.
                </p>
            )}
            <FormTextarea
                inputTitle="Opis szablonu"
                value={description}
                onChange={setDescription}
                maxLength={4000}
                rows={3}
            />
            <MediaFileInput
                inputTitle="Plik DOCX"
                value={file}
                required={!template}
                accept=".docx"
                hint="Wstaw znaczniki z katalogu do pliku DOCX · do 5 MB. Po wybraniu pliku użyj Analizuj DOCX."
                setFile={(selected) => {
                    submit.setError(undefined)

                    setFile(selected)

                    setAnalysis(null)

                    uploadName.setFileName(selected)
                }}
            />
            {(file || !template) && (
                <TextInput
                    inputTitle="Nazwa pliku"
                    value={uploadName.name}
                    onChange={(value) => {
                        uploadName.setName(value)

                        setAnalysis(null)
                    }}
                    required
                    maxLength={255}
                />
            )}
            {template?.asset && !file && (
                <p className={c.hint}>
                    Obecny plik: {template.asset.originalName}
                </p>
            )}
            {file && (
                <Button
                    type="button"
                    disabled={submit.pending}
                    onClick={() => void submit.run(analyzeSource)}
                >
                    Analizuj DOCX
                </Button>
            )}
            {!ready && (
                <p className={c.hint}>
                    Zapis jest dostępny po analizie bieżącego DOCX i rozpoznaniu
                    wszystkich jego pól.
                </p>
            )}
            {analyzed && analysis?.result.canCreate && (
                <p role="status" className={c.confirmed}>
                    <CheckCircle2 size={17} /> Wszystkie pola rozpoznane. Pola
                    odczytane z DOCX: {analysis.result.keys.length}.
                </p>
            )}
            {(analyzed || (template && !file)) && (
                <section
                    className={c.catalog}
                    aria-label="Pola potwierdzone w szablonie"
                >
                    <h3>Pola w tym szablonie ({confirmed.length})</h3>
                    <p className={c.hint}>
                        Lista wynika z zawartości DOCX. Zmiana katalogu nie
                        dodaje znaczników do pliku.
                    </p>
                    {!confirmed.length && (
                        <p className={c.hint}>DOCX nie zawiera zmiennych.</p>
                    )}
                    {Object.entries(documentVariableGroups).map(
                        ([group, title]) => {
                            const rows = confirmed.filter(
                                (field) =>
                                    field.group === group ||
                                    (group === 'unknown' &&
                                        field.source === 'unknown'),
                            )

                            return (
                                rows.length > 0 && (
                                    <section
                                        key={group}
                                        className={c.fieldList}
                                        aria-label={`Pola szablonu: ${title}`}
                                    >
                                        <h3>{title}</h3>
                                        {rows.map((field) => (
                                            <div
                                                key={field.key}
                                                className={
                                                    field.source === 'unknown'
                                                        ? c.unknown
                                                        : c.catalogRow
                                                }
                                            >
                                                <div>
                                                    <strong>
                                                        {field.label}
                                                    </strong>
                                                    <code>{`{${field.key}}`}</code>
                                                    <small>
                                                        {field.source ===
                                                        'unknown'
                                                            ? 'Nie ma takiego pola w katalogu. Popraw znacznik w DOCX i przeanalizuj ponownie lub jawnie utwórz własne pole.'
                                                            : `Źródło: ${title}`}
                                                    </small>
                                                    {field.suggestions &&
                                                        field.suggestions
                                                            .length > 0 && (
                                                            <p
                                                                className={
                                                                    c.hint
                                                                }
                                                            >
                                                                Podobne pola:{' '}
                                                                {field.suggestions
                                                                    .map(
                                                                        (
                                                                            item,
                                                                        ) =>
                                                                            `${item.label} {${item.key}}`,
                                                                    )
                                                                    .join(', ')}
                                                                . Jeżeli chodzi
                                                                o dane CRM,
                                                                popraw tag w
                                                                DOCX.
                                                            </p>
                                                        )}
                                                </div>
                                                {field.source === 'unknown' && (
                                                    <Button
                                                        type="button"
                                                        onClick={() =>
                                                            setNewField({
                                                                key: field.key,
                                                                label: '',
                                                                defaultValue:
                                                                    '',
                                                            })
                                                        }
                                                    >
                                                        Utwórz własne pole{' '}
                                                        {`{${field.key}}`}
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </section>
                                )
                            )
                        },
                    )}
                </section>
            )}
        </FormContainer>
    )
}
