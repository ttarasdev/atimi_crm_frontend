'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ClientRelation } from '@/api/legalization/legalization.types'
import { Button } from '@/components/ui/button/Button'
import { Popup } from '@/components/ui/popup/Popup'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import { FormClientInput } from '@/components/form-components/form-client-input/FormClientInput'
import {
    useClientRelations,
    useSaveClientRelation,
    useDeleteClientRelation,
} from '@/shared/hooks/useLegalization'
import { useClientSubmit } from '@/features/clients/useClientSubmit'
import { ClientQueryState } from '@/features/clients/ClientQueryState'
import c from './Legalization.module.scss'

const directions = {
    parent: 'Rodzic',
    child: 'Dziecko',
    spouse: 'Małżonek / małżonka',
    sibling: 'Rodzeństwo',
}

function RelationForm({
    clientId,
    onSaved,
    onCancel,
    onPendingChange,
}: {
    clientId: number
    onSaved: () => void
    onCancel: () => void
    onPendingChange: (pending: boolean) => void
}) {
    const [relatedClientId, setRelatedClientId] = useState<number | null>(null)

    const [type, setType] = useState<ClientRelation['type']>('spouse')

    const mutation = useSaveClientRelation(clientId)

    const submit = useClientSubmit(onPendingChange)

    return (
        <FormContainer
            aria-label="Powiązanie rodzinne"
            isPending={submit.pending}
            error={submit.error}
            onCancel={onCancel}
            submitTitle="Dodaj powiązanie"
            onSubmit={() =>
                void submit.run(async (signal) => {
                    if (!relatedClientId || relatedClientId === clientId) {
                        submit.setError('Wybierz inną osobę.')

                        return
                    }

                    await mutation.mutateAsync({
                        dto: { relatedClientId, type },
                        signal,
                    })

                    if (!signal.aborted) onSaved()
                })
            }
        >
            <FormClientInput
                value={relatedClientId}
                onChange={setRelatedClientId}
                inputTitle="Członek rodziny"
                excludeClientId={clientId}
                required
            />
            <FormSelect
                selectTitle="Relacja"
                value={type}
                onChange={setType}
                options={[
                    { title: 'Małżeństwo', value: 'spouse' },
                    {
                        title: 'Ten klient jest rodzicem wybranej osoby',
                        value: 'parent',
                    },
                    { title: 'Rodzeństwo', value: 'sibling' },
                ]}
            />
            <p className={c.hint}>
                Powiązanie pojawi się w obu kartach. Każda osoba zachowuje
                własne dane, dokumenty i prywatność. Aby dodać rodzica, otwórz
                jego kartę i wybierz tutaj dziecko.
            </p>
        </FormContainer>
    )
}

export function ClientFamily({
    clientId,
    readonly,
}: {
    clientId: number
    readonly: boolean
}) {
    const query = useClientRelations(clientId)

    const remove = useDeleteClientRelation(clientId)

    const [creating, setCreating] = useState(false)

    const [deleting, setDeleting] = useState<ClientRelation | null>(null)

    const [pending, setPending] = useState(false)

    const submit = useClientSubmit(setPending)

    const rows = query.data?.pages.flatMap((page) => page.rows) ?? []

    return (
        <section className={c.stack} aria-label="Rodzina klienta">
            <header className={c.header}>
                <h2>Rodzina</h2>
                {!readonly && (
                    <Button type="button" onClick={() => setCreating(true)}>
                        Dodaj powiązanie
                    </Button>
                )}
            </header>
            <p className={c.hint}>
                Widoczne są tylko osoby, do których masz dostęp. Powiązanie nie
                zmienia uprawnień do prywatnych klientów.
            </p>
            <ClientQueryState
                pending={query.isPending}
                error={query.isError}
                empty={!rows.length}
                onRetry={() => void query.refetch()}
                emptyTitle="Brak dostępnych powiązań rodzinnych."
            />
            <div>
                {rows.map((relation) => (
                    <div className={c.relation} key={relation.id}>
                        <div>
                            <small>{directions[relation.direction]}</small>
                            <Link
                                href={`/main/clients/${relation.relatedClient.id}`}
                            >
                                {relation.relatedClient.name}{' '}
                                {relation.relatedClient.surname}
                            </Link>
                        </div>
                        {!readonly && (
                            <Button
                                type="button"
                                onClick={() => setDeleting(relation)}
                            >
                                Odłącz
                            </Button>
                        )}
                    </div>
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
            {creating && (
                <Popup
                    title="Dodaj członka rodziny"
                    closeDisabled={pending}
                    onClose={() => setCreating(false)}
                >
                    <RelationForm
                        clientId={clientId}
                        onSaved={() => setCreating(false)}
                        onCancel={() => setCreating(false)}
                        onPendingChange={setPending}
                    />
                </Popup>
            )}
            {deleting && (
                <Popup
                    title="Odłącz powiązanie"
                    closeDisabled={pending}
                    onClose={() => setDeleting(null)}
                >
                    <FormContainer
                        isPending={submit.pending}
                        error={submit.error}
                        onCancel={() => setDeleting(null)}
                        submitTitle="Odłącz"
                        onSubmit={() =>
                            void submit.run(async (signal) => {
                                await remove.mutateAsync({
                                    id: deleting.id,
                                    signal,
                                })

                                if (!signal.aborted) setDeleting(null)
                            })
                        }
                    >
                        <p>
                            Usunąć to powiązanie rodzinne? Dane obu klientów
                            pozostaną zachowane.
                        </p>
                    </FormContainer>
                </Popup>
            )}
        </section>
    )
}
