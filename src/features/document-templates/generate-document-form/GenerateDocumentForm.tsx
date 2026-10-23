'use client'

import { useState } from 'react'
import type { DocumentTemplate } from '@/api/document-templates/document-templates.types'
import type { PrivateAsset } from '@/api/private-assets/private-assets.types'
import { FormClientInput } from '@/components/form-components/form-client-input/FormClientInput'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { FormTextarea } from '@/components/form-components/form-textarea/FormTextarea'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { Button } from '@/components/ui/button/Button'
import { useClientSubmit } from '@/features/clients/useClientSubmit'
import {
    useDocumentPreview,
    useGenerateDocument,
} from '@/shared/hooks/useDocumentTemplates'
import { useUploadName } from '@/shared/hooks/useUploadName'
import { documentVariableGroups } from '../DocumentVariablesCatalog'
import c from '../DocumentTemplates.module.scss'

export function GenerateDocumentForm({
    template,
    clientId: fixedClientId,
    initialDraft,
    onSuccess,
    onCancel,
    onPendingChange,
}: {
    template: DocumentTemplate
    clientId?: number

    initialDraft?: {
        clientId: number | null
        originalName: string
        values: Record<string, string>
    }
    onSuccess: (asset: PrivateAsset, clientId: number | null) => void
    onCancel: () => void
    onPendingChange: (pending: boolean) => void
}) {
    const [selectedClientId, setSelectedClientId] = useState<number | null>(
        initialDraft?.clientId ?? null,
    )

    const clientId = fixedClientId ?? selectedClientId

    const [values, setValues] = useState<Record<string, string>>(
        initialDraft?.values ?? {},
    )

    const [systemValuesByClient, setSystemValuesByClient] = useState<
        Record<number, Record<string, string>>
    >({})

    const systemValues = systemValuesByClient[clientId ?? 0] ?? {}

    const name = useUploadName(
        initialDraft?.originalName ?? `${template.name}.docx`,
    )

    const preview = useDocumentPreview(template.id, clientId)

    const generate = useGenerateDocument()

    const submit = useClientSubmit(onPendingChange)

    const fields = preview.data?.fields ?? []

    const custom = fields.filter((field) => field.source === 'custom')

    const missingSystem = fields.filter(
        (field) =>
            field.source === 'system' &&
            (field.profileMissing || !field.value.trim()),
    )

    const automatic = fields.filter(
        (field) => field.source === 'system' && !missingSystem.includes(field),
    )

    const requiresClient = preview.data?.requiresClient ?? false

    const enabled = template.isActive && template.type?.isActive !== false

    const inputs = Object.fromEntries(
        custom.map((field) => [
            field.key,
            (values[field.key] ?? field.value).trim(),
        ]),
    )

    const overrides = Object.fromEntries(
        missingSystem.map((field) => [
            field.key,
            (systemValues[field.key] ?? '').trim(),
        ]),
    )

    const complete = fields.every((field) =>
        (field.source === 'custom'
            ? inputs[field.key]
            : field.key in overrides
              ? overrides[field.key]
              : field.value
        ).trim(),
    )

    return (
        <FormContainer
            aria-label="Generowanie dokumentu"
            submitTitle="Generuj dokument"
            pendingTitle="Generowanie…"
            isPending={submit.pending}
            submitDisabled={
                !preview.isSuccess ||
                preview.isFetching ||
                !enabled ||
                !complete ||
                (requiresClient && !clientId)
            }
            error={submit.error}
            onCancel={onCancel}
            onSubmit={() =>
                void submit.run(async (signal) => {
                    if (!preview.isSuccess || preview.isFetching || !enabled)
                        return

                    if (!name.isValid || (requiresClient && !clientId)) {
                        submit.setError(
                            'Wpisz nazwę dokumentu i wybierz wymaganego klienta.',
                        )

                        return
                    }

                    if (
                        !complete ||
                        Object.values({ ...inputs, ...overrides }).some(
                            (value) =>
                                !value ||
                                value.length > 2000 ||
                                /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value),
                        )
                    ) {
                        submit.setError(
                            'Uzupełnij wszystkie użyte pola (maksymalnie 2000 znaków na pole).',
                        )

                        return
                    }

                    const asset = await generate.mutateAsync({
                        id: template.id,
                        dto: {
                            originalName: name.name.trim(),
                            values: inputs,
                            ...(Object.keys(overrides).length
                                ? { systemValues: overrides }
                                : {}),
                            ...(clientId ? { clientId } : {}),
                        },
                        signal,
                    })

                    if (!signal.aborted) onSuccess(asset, clientId)
                })
            }
        >
            <TextInput
                inputTitle="Nazwa dokumentu"
                value={name.name}
                onChange={name.setName}
                required
                maxLength={255}
            />
            {fixedClientId ? (
                <p className={c.hint}>
                    Dokument zostanie dodany do dokumentów tego klienta.
                </p>
            ) : (
                <>
                    <FormClientInput
                        writableOnly
                        value={clientId}
                        onChange={setSelectedClientId}
                        required={requiresClient}
                        disabled={submit.pending}
                    />
                    <p className={c.hint}>
                        {requiresClient
                            ? 'Ten szablon zawiera dane klienta, dlatego wybór klienta jest wymagany.'
                            : 'Wybierz klienta, aby dodać dokument do jego karty, lub pozostaw dokument w swojej bibliotece.'}
                    </p>
                </>
            )}
            {preview.isPending && (
                <p role="status" className={c.hint}>
                    Wczytywanie danych dokumentu…
                </p>
            )}
            {preview.isError && (
                <div className={c.error} role="alert">
                    <p>
                        Nie udało się wczytać danych dokumentu. Sprawdź dostęp
                        do klienta.
                    </p>
                    <Button
                        type="button"
                        pending={preview.isFetching}
                        onClick={() => void preview.refetch()}
                    >
                        Spróbuj ponownie
                    </Button>
                </div>
            )}
            {missingSystem.length > 0 && (
                <section
                    className={c.catalog}
                    aria-label="Brakujące dane automatyczne"
                >
                    <strong>Uzupełnij brakujące dane do tego dokumentu</strong>
                    <p className={c.hint}>
                        Wpisane tutaj dane trafią wyłącznie do generowanego
                        pliku. Karta klienta, profil pracownika i dane firmy
                        pozostaną bez zmian.
                    </p>
                    {missingSystem.map((field) => (
                        <FormTextarea
                            key={`${clientId}:${field.key}`}
                            inputTitle={field.label}
                            value={systemValues[field.key] ?? ''}
                            onChange={(value) =>
                                setSystemValuesByClient((current) => ({
                                    ...current,
                                    [clientId ?? 0]: {
                                        ...current[clientId ?? 0],
                                        [field.key]: value,
                                    },
                                }))
                            }
                            required
                            maxLength={2000}
                            rows={2}
                            hint={`${documentVariableGroups[field.group] ?? 'Dane CRM'} · {${field.key}} · tylko w tym dokumencie`}
                        />
                    ))}
                </section>
            )}
            {custom.length > 0 && (
                <section
                    className={c.catalog}
                    aria-label="Własne pola dokumentu"
                >
                    <strong>Własne pola dokumentu</strong>
                    <p className={c.hint}>
                        Wartości domyślne możesz zmienić dla tego dokumentu.
                    </p>
                    {custom.map((field) => (
                        <FormTextarea
                            key={field.key}
                            inputTitle={field.label}
                            value={values[field.key] ?? field.value}
                            onChange={(value) =>
                                setValues((current) => ({
                                    ...current,
                                    [field.key]: value,
                                }))
                            }
                            required
                            maxLength={2000}
                            rows={3}
                            hint={`Pole w pliku: {${field.key}}`}
                        />
                    ))}
                </section>
            )}
            {automatic.length > 0 && (
                <section className={c.automatic} aria-label="Dane automatyczne">
                    <strong>Dane uzupełnione z CRM</strong>
                    <div className={c.fieldList}>
                        {automatic.map((field) => (
                            <span key={field.key}>
                                <small>
                                    {field.label} ·{' '}
                                    {documentVariableGroups[field.group] ??
                                        'Dane CRM'}
                                </small>
                                <span>{field.value}</span>
                            </span>
                        ))}
                    </div>
                </section>
            )}
            {!complete && preview.isSuccess && (
                <p role="status" className={c.hint}>
                    Generowanie będzie dostępne po wypełnieniu wszystkich pól
                    użytych w tym szablonie.
                </p>
            )}
            <p className={c.hint}>
                Powstanie plik DOCX. Dla klienta zapisze się w jego dokumentach,
                bez klienta — w Twojej prywatnej bibliotece.
            </p>
        </FormContainer>
    )
}
