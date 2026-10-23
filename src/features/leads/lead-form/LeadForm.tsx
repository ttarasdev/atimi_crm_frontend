'use client'

import { useState } from 'react'
import type { LeadLanguage, LeadSource } from '@/api/leads/leads.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { FormTextarea } from '@/components/form-components/form-textarea/FormTextarea'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import { FormManagerInput } from '@/components/form-components/form-manager-input/FormManagerInput'
import { useCreateLead } from '@/shared/hooks/useLeads'
import { useRoles } from '@/shared/hooks/useRoles'
import { useClientSubmit } from '@/features/clients/useClientSubmit'
import { leadLanguages, leadSources } from '../lead-labels'
import c from '@/features/clients/Clients.module.scss'

export function LeadForm({
    onSaved,
    onCancel,
    onPendingChange,
}: {
    onSaved: () => void
    onCancel: () => void
    onPendingChange: (pending: boolean) => void
}) {
    const { hasRole } = useRoles()

    const [name, setName] = useState('')

    const [email, setEmail] = useState('')

    const [phone, setPhone] = useState('')

    const [message, setMessage] = useState('')

    const [language, setLanguage] = useState<LeadLanguage>('pl')

    const [source, setSource] = useState<LeadSource>('manual')

    const [assigned, setAssigned] = useState(false)

    const [managerId, setManagerId] = useState<number | null>(null)

    const create = useCreateLead()

    const submit = useClientSubmit(onPendingChange)

    return (
        <FormContainer
            aria-label="Nowe zgłoszenie"
            isPending={submit.pending}
            error={submit.error}
            onCancel={onCancel}
            submitTitle="Dodaj zgłoszenie"
            onSubmit={() =>
                void submit.run(async (signal) => {
                    if (!email.trim() && !phone.trim()) {
                        submit.setError('Podaj e-mail lub numer telefonu.')

                        return
                    }

                    if (hasRole('admin') && assigned && !managerId) {
                        submit.setError('Wybierz opiekuna.')

                        return
                    }

                    await create.mutateAsync({
                        dto: {
                            name: name.trim(),
                            ...(email.trim() ? { email: email.trim() } : {}),
                            ...(phone.trim() ? { phone: phone.trim() } : {}),
                            message: message.trim(),
                            language,
                            source,
                            ...(hasRole('admin') && assigned
                                ? { managerId }
                                : {}),
                        },
                        signal,
                    })

                    if (!signal.aborted) onSaved()
                })
            }
        >
            <TextInput
                inputTitle="Imię i nazwisko / nazwa"
                value={name}
                onChange={setName}
                maxLength={256}
                required
                autoComplete="name"
            />
            <div className={c.grid}>
                <TextInput
                    inputTitle="E-mail"
                    value={email}
                    onChange={setEmail}
                    type="email"
                    maxLength={254}
                    autoComplete="email"
                />
                <TextInput
                    inputTitle="Telefon"
                    value={phone}
                    onChange={setPhone}
                    type="tel"
                    maxLength={40}
                    autoComplete="tel"
                    pattern="[+0-9 ().\-]{6,40}"
                />
                <FormSelect<LeadSource>
                    selectTitle="Źródło"
                    value={source}
                    onChange={setSource}
                    options={Object.entries(leadSources).map(
                        ([value, title]) => ({
                            title,
                            value: value as LeadSource,
                        }),
                    )}
                />
                <FormSelect<LeadLanguage>
                    selectTitle="Język"
                    value={language}
                    onChange={setLanguage}
                    options={leadLanguages}
                />
            </div>
            <FormTextarea
                inputTitle="Treść zgłoszenia"
                value={message}
                onChange={setMessage}
                rows={4}
                maxLength={4000}
                required
            />
            {hasRole('admin') && (
                <>
                    <FormSelect
                        selectTitle="Opiekun"
                        value={assigned ? 'assigned' : 'unassigned'}
                        onChange={(value) => setAssigned(value === 'assigned')}
                        options={[
                            {
                                title: 'Bez opiekuna — do przydzielenia',
                                value: 'unassigned',
                            },
                            { title: 'Przypisz pracownika', value: 'assigned' },
                        ]}
                    />
                    {assigned && (
                        <FormManagerInput
                            value={managerId}
                            onChange={setManagerId}
                            inputTitle="Opiekun zgłoszenia"
                            disabled={submit.pending}
                        />
                    )}
                </>
            )}
            <p className={c.hint}>
                Instagram i Facebook możesz dodawać ręcznie. Podłączenie
                formularzy tych serwisów będzie osobną integracją.
            </p>
        </FormContainer>
    )
}
