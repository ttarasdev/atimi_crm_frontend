'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Handshake, Plus } from 'lucide-react'
import type { Partner, PartnerCategory } from '@/api/partners/partners.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { Button } from '@/components/ui/button/Button'
import { Popup } from '@/components/ui/popup/Popup'
import { usePartners, useUpdatePartner } from '@/shared/hooks/usePartners'
import { useRoles } from '@/shared/hooks/useRoles'
import { partnerCategories } from './partner-labels'
import { PartnerCard } from './PartnerCard'
import { PartnerDetails } from './PartnerDetails'
import { PartnerForm } from './partner-form/PartnerForm'
import c from './PartnersPage.module.scss'

export function PartnersPage({
    initialPartnerId,
}: {
    initialPartnerId?: number
}) {
    const router = useRouter()

    const { hasRole } = useRoles()

    const admin = hasRole('admin')

    const [search, setSearch] = useState('')

    const [category, setCategory] = useState<PartnerCategory | ''>('')

    const [status, setStatus] = useState<'active' | 'archived'>('active')

    const [featured, setFeatured] = useState<'all' | 'featured'>('all')

    const [editing, setEditing] = useState<Partner | 'new' | null>(null)

    const [selected, setSelected] = useState<number | null>(
        initialPartnerId ?? null,
    )

    const [archiving, setArchiving] = useState<Partner | null>(null)

    const [pending, setPending] = useState(false)

    const [error, setError] = useState<string>()

    const update = useUpdatePartner()

    const controller = useRef<AbortController | null>(null)

    const partners = usePartners({
        search: search.trim() || undefined,
        category: category || undefined,
        isActive: admin ? status === 'active' : true,
        isFeatured: featured === 'featured' ? true : undefined,
    })

    const rows = partners.data?.pages.flatMap((page) => page.rows) ?? []

    useEffect(() => () => controller.current?.abort(), [])

    function closeSelected() {
        setSelected(null)

        if (initialPartnerId)
            router.replace('/main/partners', { scroll: false })
    }

    function closeEditor() {
        setEditing(null)

        if (initialPartnerId)
            router.replace('/main/partners', { scroll: false })
    }

    async function change(
        partner: Partner,
        dto: { isActive?: boolean; isFeatured?: boolean },
    ) {
        if (controller.current) return

        setError(undefined)

        controller.current = new AbortController()

        try {
            await update.mutateAsync({
                id: partner.id,
                dto,
                signal: controller.current.signal,
            })

            setArchiving(null)
        } catch {
            if (!controller.current?.signal.aborted)
                setError('Nie udało się zapisać zmiany. Spróbuj ponownie.')
        } finally {
            controller.current = null
        }
    }

    return (
        <section className={c.page} aria-label="Partnerzy">
            <header className={c.header}>
                <div>
                    <h2>
                        <Handshake size={19} aria-hidden />
                        Partnerzy
                    </h2>
                    <p>Sprawdzone kontakty i informacje dla całego zespołu.</p>
                </div>
                {admin && (
                    <Button className={c.add} onClick={() => setEditing('new')}>
                        <Plus size={15} aria-hidden />
                        Dodaj partnera
                    </Button>
                )}
            </header>
            <div className={c.filters}>
                <TextInput
                    inputTitle="Szukaj partnera"
                    type="search"
                    value={search}
                    onChange={setSearch}
                    placeholder="Nazwa, osoba, telefon lub miasto"
                    maxLength={160}
                />
                <FormSelect<PartnerCategory | ''>
                    selectTitle="Specjalizacja"
                    options={[
                        { title: 'Wszystkie specjalizacje', value: '' },
                        ...partnerCategories,
                    ]}
                    value={category}
                    onChange={setCategory}
                />
                <FormSelect<'all' | 'featured'>
                    selectTitle="Polecenia"
                    options={[
                        { title: 'Wszyscy partnerzy', value: 'all' },
                        { title: 'Tylko polecani', value: 'featured' },
                    ]}
                    value={featured}
                    onChange={setFeatured}
                />
                {admin && (
                    <FormSelect<'active' | 'archived'>
                        selectTitle="Lista kontaktów"
                        options={[
                            { title: 'Aktywni', value: 'active' },
                            { title: 'Archiwum', value: 'archived' },
                        ]}
                        value={status}
                        onChange={setStatus}
                    />
                )}
            </div>
            <div className={c.resultHeading}>
                <span>{partners.data?.pages[0]?.total ?? 0} kontaktów</span>
                <p>Polecani na początku listy</p>
            </div>
            {error && !archiving && (
                <p className={c.error} role="alert">
                    {error}
                </p>
            )}
            {partners.isPending ? (
                <p className={c.state}>Wczytywanie partnerów…</p>
            ) : partners.isError ? (
                <div className={c.state} role="alert">
                    <p>Nie udało się wczytać partnerów.</p>
                    <Button onClick={() => void partners.refetch()}>
                        Spróbuj ponownie
                    </Button>
                </div>
            ) : !rows.length ? (
                <p className={c.state}>
                    {search || category || featured === 'featured'
                        ? 'Brak kontaktów pasujących do filtrów.'
                        : status === 'archived'
                          ? 'Archiwum partnerów jest puste.'
                          : 'Kontakty partnerów pojawią się tutaj po dodaniu przez administratora.'}
                </p>
            ) : (
                <div className={c.grid}>
                    {rows.map((partner) => (
                        <PartnerCard
                            key={partner.id}
                            partner={partner}
                            admin={admin}
                            disabled={update.isPending}
                            onOpen={() => setSelected(partner.id)}
                            onEdit={() => setEditing(partner)}
                            onFeature={() =>
                                void change(partner, {
                                    isFeatured: !partner.isFeatured,
                                })
                            }
                            onArchive={() => {
                                setError(undefined)

                                setArchiving(partner)
                            }}
                        />
                    ))}
                </div>
            )}
            {partners.hasNextPage && (
                <Button
                    onClick={() => void partners.fetchNextPage()}
                    disabled={partners.isFetchingNextPage}
                >
                    Wczytaj więcej
                </Button>
            )}
            {selected !== null && (
                <Popup title="Kontakt partnera" onClose={closeSelected}>
                    <PartnerDetails
                        id={selected}
                        onEdit={
                            admin
                                ? (partner) => {
                                      setSelected(null)

                                      setEditing(partner)
                                  }
                                : undefined
                        }
                    />
                </Popup>
            )}
            {editing && (
                <Popup
                    title={
                        editing === 'new' ? 'Nowy partner' : 'Edytuj partnera'
                    }
                    onClose={closeEditor}
                    closeDisabled={pending}
                >
                    <PartnerForm
                        partner={editing === 'new' ? undefined : editing}
                        onSaved={closeEditor}
                        onCancel={closeEditor}
                        onPendingChange={setPending}
                    />
                </Popup>
            )}
            {archiving && (
                <Popup
                    title={
                        archiving.isActive
                            ? 'Archiwizuj partnera'
                            : 'Przywróć partnera'
                    }
                    onClose={() => setArchiving(null)}
                    closeDisabled={update.isPending}
                >
                    <FormContainer
                        onSubmit={() =>
                            void change(archiving, {
                                isActive: !archiving.isActive,
                            })
                        }
                        onCancel={() => setArchiving(null)}
                        submitTitle={
                            archiving.isActive ? 'Archiwizuj' : 'Przywróć'
                        }
                        error={error}
                        isPending={update.isPending}
                    >
                        <p className={c.hint}>
                            {archiving.isActive
                                ? `Przenieść „${archiving.name}” do archiwum? Kontakt pozostanie zapisany, ale zniknie z listy zespołu.`
                                : `Przywrócić „${archiving.name}” do listy kontaktów zespołu?`}
                        </p>
                    </FormContainer>
                </Popup>
            )}
        </section>
    )
}
