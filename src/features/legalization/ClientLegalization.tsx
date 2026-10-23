'use client'

import { useState } from 'react'
import type { LegalizationProfile } from '@/api/legalization/legalization.types'
import { Button } from '@/components/ui/button/Button'
import { Popup } from '@/components/ui/popup/Popup'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import {
    useLegalization,
    useSaveLegalization,
} from '@/shared/hooks/useLegalization'
import { DuplicateClientWarning } from '@/features/clients/DuplicateClientWarning'
import { ClientQueryState } from '@/features/clients/ClientQueryState'
import { useClientSubmit } from '@/features/clients/useClientSubmit'
import c from './Legalization.module.scss'

const groups = [
    {
        title: 'Dane osobowe',
        fields: [
            ['nativeName', 'Imię i nazwisko w języku ojczystym'],
            ['maidenName', 'Poprzednie / rodowe nazwisko'],
            ['birthDate', 'Data urodzenia'],
            ['birthPlace', 'Miejsce urodzenia'],
            ['birthCountry', 'Kraj urodzenia'],
            ['citizenship', 'Obywatelstwo'],
            ['otherCitizenships', 'Pozostałe obywatelstwa'],
            ['sex', 'Płeć'],
            ['maritalStatus', 'Stan cywilny'],
            ['pesel', 'PESEL'],
            ['fatherName', 'Imię ojca'],
            ['motherName', 'Imię matki'],
            ['motherMaidenName', 'Nazwisko rodowe matki'],
        ],
    },
    {
        title: 'Adresy',
        fields: [
            ['postalCode', 'Kod pocztowy'],
            ['city', 'Miejscowość'],
            ['street', 'Ulica'],
            ['houseNumber', 'Numer budynku'],
            ['apartmentNumber', 'Numer lokalu'],
            ['registeredAddress', 'Adres zameldowania'],
            ['correspondenceAddress', 'Adres do korespondencji'],
        ],
    },
    {
        title: 'Pobyt w Polsce',
        fields: [
            ['entryDate', 'Data wjazdu'],
            ['stayBasis', 'Podstawa pobytu'],
            ['ukrStatus', 'Status UKR'],
        ],
    },
    {
        title: 'Praca i nauka',
        fields: [
            ['employerName', 'Pracodawca'],
            ['employerTaxId', 'NIP pracodawcy'],
            ['employerAddress', 'Adres pracodawcy'],
            ['jobTitle', 'Stanowisko'],
            ['contractType', 'Rodzaj umowy'],
            ['contractFrom', 'Umowa od'],
            ['contractTo', 'Umowa do'],
            ['schoolName', 'Uczelnia / szkoła'],
        ],
    },
] as const

const dateFields = new Set<string>([
    'birthDate',
    'entryDate',
    'contractFrom',
    'contractTo',
])

function LegalizationForm({
    clientId,
    profile,
    onSaved,
    onCancel,
    onPendingChange,
}: {
    clientId: number
    profile: LegalizationProfile
    onSaved: () => void
    onCancel: () => void
    onPendingChange: (pending: boolean) => void
}) {
    const [values, setValues] = useState({
        ...profile,
        emailMarketingConsent: profile.emailMarketingConsent ?? true,
        emailAutomationConsent: profile.emailAutomationConsent ?? false,
    })

    const mutation = useSaveLegalization(clientId)

    const submit = useClientSubmit(onPendingChange)

    return (
        <FormContainer
            aria-label="Dane do legalizacji"
            isPending={submit.pending}
            error={submit.error}
            onCancel={onCancel}
            submitTitle="Zapisz dane"
            onSubmit={() =>
                void submit.run(async (signal) => {
                    await mutation.mutateAsync({ dto: values, signal })

                    if (!signal.aborted) onSaved()
                })
            }
        >
            <DuplicateClientWarning
                kind="pesel"
                value={values.pesel ?? ''}
                clientId={clientId}
            />
            {groups.map((group) => (
                <section className={c.section} key={group.title}>
                    <h3>{group.title}</h3>
                    <div className={c.grid}>
                        {group.fields.map(([key, label]) => (
                            <TextInput
                                key={key}
                                inputTitle={label}
                                type={dateFields.has(key) ? 'date' : 'text'}
                                value={values[key] ?? ''}
                                onChange={(value) =>
                                    setValues((current) => ({
                                        ...current,
                                        [key]: value,
                                    }))
                                }
                                maxLength={
                                    key === 'pesel'
                                        ? 11
                                        : key === 'employerTaxId'
                                          ? 20
                                          : key === 'registeredAddress' ||
                                              key === 'correspondenceAddress' ||
                                              key === 'employerAddress'
                                            ? 500
                                            : 255
                                }
                                {...(key === 'pesel'
                                    ? {
                                          pattern: '[0-9]{11}',
                                          inputMode: 'numeric' as const,
                                      }
                                    : {})}
                            />
                        ))}
                    </div>
                </section>
            ))}
            <section className={c.section}>
                <h3>Komunikacja e-mail</h3>
                <div className={c.consents}>
                    <label>
                        <input
                            type="checkbox"
                            checked={values.emailMarketingConsent}
                            onChange={(event) =>
                                setValues((current) => ({
                                    ...current,
                                    emailMarketingConsent: event.target.checked,
                                }))
                            }
                        />
                        Zgoda na wiadomości marketingowe i oferty
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={values.emailAutomationConsent}
                            onChange={(event) =>
                                setValues((current) => ({
                                    ...current,
                                    emailAutomationConsent:
                                        event.target.checked,
                                }))
                            }
                        />
                        Automatyczne wiadomości dotyczące spraw i dokumentów
                    </label>
                </div>
                <p className={c.hint}>
                    Zaznacz zgodnie z decyzją klienta. Automatyczne wysyłanie do
                    klientów zostanie uruchomione w kolejnym etapie.
                </p>
            </section>
        </FormContainer>
    )
}

export function ClientLegalization({
    clientId,
    readonly,
}: {
    clientId: number
    readonly: boolean
}) {
    const query = useLegalization(clientId)

    const [editing, setEditing] = useState(false)

    const [pending, setPending] = useState(false)

    return (
        <div className={c.stack}>
            <header className={c.header}>
                <h2>Dane do legalizacji</h2>
                {!readonly && query.isSuccess && (
                    <Button type="button" onClick={() => setEditing(true)}>
                        Edytuj dane
                    </Button>
                )}
            </header>
            <ClientQueryState
                pending={query.isPending}
                error={query.isError}
                empty={false}
                onRetry={() => void query.refetch()}
            />
            {query.data && (
                <>
                    <div className={c.grid}>
                        {groups.map((group) => (
                            <section className={c.section} key={group.title}>
                                <h3>{group.title}</h3>
                                <dl className={c.data}>
                                    {group.fields.map(([key, label]) => (
                                        <div key={key}>
                                            <dt>{label}</dt>
                                            <dd>{query.data[key] || '—'}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </section>
                        ))}
                    </div>
                    <section className={c.section}>
                        <h3>Komunikacja e-mail</h3>
                        <dl className={c.data}>
                            <div>
                                <dt>Marketing i oferty</dt>
                                <dd>
                                    {(query.data.emailMarketingConsent ?? true)
                                        ? 'Zgoda udzielona'
                                        : 'Brak zgody'}
                                </dd>
                            </div>
                            <div>
                                <dt>Wiadomości automatyczne</dt>
                                <dd>
                                    {query.data.emailAutomationConsent
                                        ? 'Włączone'
                                        : 'Wyłączone'}
                                </dd>
                            </div>
                        </dl>
                    </section>
                </>
            )}
            {editing && query.data && (
                <Popup
                    title="Dane do legalizacji"
                    size="wide"
                    closeDisabled={pending}
                    onClose={() => setEditing(false)}
                >
                    <LegalizationForm
                        clientId={clientId}
                        profile={query.data}
                        onSaved={() => setEditing(false)}
                        onCancel={() => setEditing(false)}
                        onPendingChange={setPending}
                    />
                </Popup>
            )}
        </div>
    )
}
