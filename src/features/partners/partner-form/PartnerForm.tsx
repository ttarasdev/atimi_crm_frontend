'use client'

import { useEffect, useRef, useState } from 'react'
import { Star } from 'lucide-react'
import type { Partner, PartnerCategory } from '@/api/partners/partners.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import { FormTextarea } from '@/components/form-components/form-textarea/FormTextarea'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { SettingsRow } from '@/components/ui/settings-row/SettingsRow'
import { Switch } from '@/components/ui/switch/Switch'
import { useCreatePartner, useUpdatePartner } from '@/shared/hooks/usePartners'
import { partnerCategories } from '../partner-labels'
import c from './PartnerForm.module.scss'

export function PartnerForm({
    partner,
    onSaved,
    onCancel,
    onPendingChange,
}: {
    partner?: Partner
    onSaved: (partner: Partner) => void
    onCancel: () => void
    onPendingChange?: (pending: boolean) => void
}) {
    const [name, setName] = useState(partner?.name ?? '')

    const [category, setCategory] = useState<PartnerCategory>(
        partner?.category ?? 'other',
    )

    const [contactPerson, setContactPerson] = useState(
        partner?.contactPerson ?? '',
    )

    const [phone, setPhone] = useState(partner?.phone ?? '')

    const [additionalPhone, setAdditionalPhone] = useState(
        partner?.additionalPhone ?? '',
    )

    const [email, setEmail] = useState(partner?.email ?? '')

    const [website, setWebsite] = useState(partner?.website ?? '')

    const [city, setCity] = useState(partner?.city ?? '')

    const [address, setAddress] = useState(partner?.address ?? '')

    const [notes, setNotes] = useState(partner?.notes ?? '')

    const [isFeatured, setIsFeatured] = useState(partner?.isFeatured ?? false)

    const [error, setError] = useState<string>()

    const create = useCreatePartner()

    const update = useUpdatePartner()

    const controller = useRef<AbortController | null>(null)

    const pending = create.isPending || update.isPending

    useEffect(() => {
        onPendingChange?.(pending)
    }, [pending, onPendingChange])

    useEffect(() => () => controller.current?.abort(), [])

    async function submit() {
        if (controller.current) return

        setError(undefined)

        if (!name.trim() || /[\x00-\x1f\x7f-\x9f]/.test(name)) {
            setError('Podaj poprawną nazwę partnera.')

            return
        }

        controller.current = new AbortController()

        try {
            const dto = {
                name: name.trim(),
                category,
                contactPerson: contactPerson.trim() || null,
                phone: phone.trim() || null,
                additionalPhone: additionalPhone.trim() || null,
                email: email.trim() || null,
                website: website.trim() || null,
                city: city.trim() || null,
                address: address.trim() || null,
                notes: notes.trim() || null,
                isFeatured,
            }

            const saved = partner
                ? await update.mutateAsync({
                      id: partner.id,
                      dto,
                      signal: controller.current.signal,
                  })
                : await create.mutateAsync({
                      dto,
                      signal: controller.current.signal,
                  })

            onSaved(saved)
        } catch {
            if (!controller.current?.signal.aborted)
                setError(
                    'Nie udało się zapisać partnera. Wpisane dane zostały zachowane.',
                )
        } finally {
            controller.current = null
        }
    }

    return (
        <FormContainer
            aria-label="Dane partnera"
            onSubmit={() => void submit()}
            onCancel={onCancel}
            error={error}
            isPending={pending}
        >
            <TextInput
                inputTitle="Nazwa partnera"
                value={name}
                onChange={setName}
                maxLength={160}
                required
                autoFocus
            />
            <FormSelect
                selectTitle="Specjalizacja"
                options={partnerCategories}
                value={category}
                onChange={setCategory}
                required
            />
            <TextInput
                inputTitle="Osoba kontaktowa"
                value={contactPerson}
                onChange={setContactPerson}
                maxLength={160}
                autoComplete="name"
            />
            <div className={c.row}>
                <TextInput
                    inputTitle="Telefon"
                    type="tel"
                    value={phone}
                    onChange={setPhone}
                    minLength={7}
                    maxLength={32}
                    pattern="[+]?[0-9][0-9 ()\-]*[0-9]"
                    autoComplete="tel"
                    placeholder="+48 123 456 789"
                />
                <TextInput
                    inputTitle="Drugi telefon"
                    type="tel"
                    value={additionalPhone}
                    onChange={setAdditionalPhone}
                    minLength={7}
                    maxLength={32}
                    pattern="[+]?[0-9][0-9 ()\-]*[0-9]"
                />
            </div>
            <TextInput
                inputTitle="E-mail"
                type="email"
                value={email}
                onChange={setEmail}
                maxLength={254}
                autoComplete="email"
            />
            <TextInput
                inputTitle="Strona internetowa"
                type="url"
                value={website}
                onChange={setWebsite}
                maxLength={500}
                placeholder="https://"
                hint="Adres z https:// lub http://."
            />
            <TextInput
                inputTitle="Miasto"
                value={city}
                onChange={setCity}
                maxLength={100}
                autoComplete="address-level2"
            />
            <TextInput
                inputTitle="Adres"
                value={address}
                onChange={setAddress}
                maxLength={300}
                autoComplete="street-address"
            />
            <FormTextarea
                inputTitle="Informacje dla zespołu"
                value={notes}
                onChange={setNotes}
                maxLength={5000}
                rows={4}
                placeholder="Zakres usług, godziny kontaktu, ustalenia…"
            />
            <SettingsRow
                title="Polecany partner"
                description="Wyświetlaj na początku listy kontaktów."
                icon={<Star size={18} />}
            >
                <Switch
                    checked={isFeatured}
                    onChange={setIsFeatured}
                    aria-label="Polecany partner"
                />
            </SettingsRow>
        </FormContainer>
    )
}
