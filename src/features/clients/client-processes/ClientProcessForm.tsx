'use client'

import { useState } from 'react'
import type {
    ClientCaseData,
    ClientProcess,
} from '@/api/client-processes/client-processes.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import { useProcessTemplates } from '@/shared/hooks/useProcessTemplates'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { useSaveClientProcess } from '@/shared/hooks/useClientProcesses'
import { useClientSubmit } from '../useClientSubmit'
import c from '../Clients.module.scss'
import styles from './ClientProcesses.module.scss'

export function ClientProcessForm({
    clientId,
    process,
    onSaved,
    onCancel,
    onPendingChange,
}: {
    clientId: number
    process?: ClientProcess
    onSaved: () => void
    onCancel: () => void
    onPendingChange?: (pending: boolean) => void
}) {
    const [title, setTitle] = useState(process?.title ?? '')

    const [caseData, setCaseData] = useState<ClientCaseData>(
        process?.caseData ?? {},
    )

    const [processTemplateId, setProcessTemplateId] = useState<number | null>(
        null,
    )

    const templates = useProcessTemplates({ isActive: true })

    const rows = templates.data?.pages.flatMap((page) => page.rows) ?? []

    const mutation = useSaveClientProcess()

    const submit = useClientSubmit(onPendingChange)

    return (
        <FormContainer
            aria-label="Sprawa klienta"
            isPending={submit.pending}
            error={submit.error}
            submitTitle={process ? 'Zapisz zmiany' : 'Dodaj sprawę'}
            onCancel={onCancel}
            onSubmit={() =>
                void submit.run(async (signal) => {
                    if (!title.trim()) {
                        submit.setError('Wpisz nazwę sprawy.')

                        return
                    }

                    await mutation.mutateAsync({
                        clientId,
                        id: process?.id,
                        title: title.trim(),
                        caseData,
                        ...(!process && processTemplateId
                            ? { processTemplateId }
                            : {}),
                        signal,
                    })

                    if (!signal.aborted) onSaved()
                })
            }
        >
            {!process && (
                <>
                    <FormSelect
                        selectTitle="Szablon sprawy"
                        value={processTemplateId}
                        onChange={(id) => {
                            setProcessTemplateId(id)

                            const selected = rows.find((row) => row.id === id)

                            if (selected) setTitle(selected.title)
                        }}
                        options={[
                            {
                                title: 'Własna sprawa — bez etapów',
                                value: null,
                            },
                            ...rows.map((row) => ({
                                title: row.title,
                                value: row.id,
                            })),
                        ]}
                    />
                    {templates.isError && (
                        <p role="alert">
                            Nie udało się wczytać szablonów. Możesz utworzyć
                            własną sprawę.{' '}
                            <button
                                type="button"
                                onClick={() => void templates.refetch()}
                            >
                                Spróbuj ponownie
                            </button>
                        </p>
                    )}
                    {templates.hasNextPage && (
                        <button
                            type="button"
                            disabled={templates.isFetchingNextPage}
                            onClick={() => void templates.fetchNextPage()}
                        >
                            Więcej szablonów
                        </button>
                    )}
                </>
            )}
            <TextInput
                inputTitle="Nazwa sprawy"
                value={title}
                onChange={setTitle}
                required
                maxLength={150}
                placeholder="np. karta pobytu czasowego"
            />
            <details className={styles.caseFields}>
                <summary>Dane sprawy i urzędu</summary>
                <div className={c.grid}>
                    {(
                        [
                            ['serviceType', 'Rodzaj usługi'],
                            ['office', 'Urząd'],
                            ['referenceNumber', 'Numer sprawy'],
                            ['submittedAt', 'Data złożenia'],
                            ['fingerprintsAt', 'Data odcisków palców'],
                            ['decisionAt', 'Data decyzji'],
                            ['collectionAt', 'Data odbioru karty'],
                        ] as const
                    ).map(([key, label]) => (
                        <TextInput
                            key={key}
                            inputTitle={label}
                            value={caseData[key] ?? ''}
                            onChange={(value) =>
                                setCaseData((current) => ({
                                    ...current,
                                    [key]: value,
                                }))
                            }
                            type={key.endsWith('At') ? 'date' : 'text'}
                            maxLength={255}
                        />
                    ))}
                </div>
            </details>
            <p className={c.hint}>
                Wybrany szablon skopiuje etapy wraz z ich zawartością. Bez
                szablonu możesz później dodać własne etapy.
            </p>
        </FormContainer>
    )
}
