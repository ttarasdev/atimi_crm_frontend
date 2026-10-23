'use client'

import { useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Users, ChevronRight, Shield } from 'lucide-react'
import type { Manager } from '@/api/managers/managers.types'
import { Button } from '@/components/ui/button/Button'
import { Popup } from '@/components/ui/popup/Popup'
import { ManagerAvatar } from '@/components/ui/manager-avatar/ManagerAvatar'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import {
    useInfiniteManagers,
    useManagerRoles,
} from '@/shared/hooks/useManagers'
import { ManagerDetails } from '../manager-details/ManagerDetails'
import { ManagerForm } from '../manager-form/ManagerForm'
import {
    managerRoleTitle,
    managerStatusColors,
    managerStatusLabels,
} from '../manager-labels'
import c from './EmployeesPage.module.scss'

export function EmployeesPage({
    initialManagerId,
}: {
    initialManagerId?: number
}) {
    const router = useRouter()

    const [search, setSearch] = useState('')

    const [status, setStatus] = useState<Manager['status'] | null>(null)

    const [roleId, setRoleId] = useState<number | null>(null)

    const [selected, setSelected] = useState<number | null>(
        initialManagerId ?? null,
    )

    const [creating, setCreating] = useState(false)

    const [pending, setPending] = useState(false)

    const workers = useInfiniteManagers({
        search: search.trim() || undefined,
        status: status ?? undefined,
        roleId: roleId ?? undefined,
    })

    const roles = useManagerRoles()

    const rows = workers.data?.pages.flatMap((page) => page.rows) ?? []

    return (
        <section className={c.section} aria-label="Zarządzanie pracownikami">
            <header className={c.header}>
                <div>
                    <span className={c.eyebrow}>Nasz zespół</span>
                    <h1>Pracownicy</h1>
                    <p>Ludzie, uprawnienia i dostęp do pracy w CRM.</p>
                </div>
                <Button type="button" onClick={() => setCreating(true)}>
                    <Plus size={17} aria-hidden="true" />
                    Dodaj pracownika
                </Button>
            </header>
            <div className={c.filters}>
                <TextInput
                    inputTitle="Szukaj pracownika"
                    value={search}
                    onChange={setSearch}
                    type="search"
                />
                <FormSelect
                    selectTitle="Status konta"
                    value={status}
                    onChange={(value) => {
                        if (
                            value === null ||
                            value === 'active' ||
                            value === 'blocked' ||
                            value === 'archived' ||
                            value === 'pending'
                        )
                            setStatus(value)
                    }}
                    options={[
                        { title: 'Wszystkie statusy', value: null },
                        ...(
                            [
                                'active',
                                'pending',
                                'blocked',
                                'archived',
                            ] as const
                        ).map((value) => ({
                            title: managerStatusLabels[value],
                            value,
                        })),
                    ]}
                />
                <FormSelect
                    selectTitle="Rola"
                    value={roleId}
                    onChange={setRoleId}
                    disabled={roles.isPending}
                    options={[
                        { title: 'Wszystkie role', value: null },
                        ...(roles.data?.rows.map((role) => ({
                            title: managerRoleTitle(role.name),
                            value: role.id,
                        })) ?? []),
                    ]}
                />
            </div>
            <div className={c.caption}>
                <Users size={15} aria-hidden="true" />
                <span>Pracownicy: {workers.data?.pages[0]?.total ?? 0}</span>
                <small>
                    Zablokowane i archiwalne konta nie otrzymują powiadomień
                    kalendarza.
                </small>
            </div>
            {workers.isPending && (
                <p role="status" className={c.state}>
                    Wczytywanie pracowników…
                </p>
            )}
            {workers.isError && (
                <div className={c.state} role="alert">
                    <p>Nie udało się wczytać pracowników.</p>
                    <Button
                        type="button"
                        onClick={() => void workers.refetch()}
                    >
                        Spróbuj ponownie
                    </Button>
                </div>
            )}
            {!workers.isPending && !workers.isError && !rows.length && (
                <div className={c.state}>
                    <Users size={30} aria-hidden="true" />
                    <h2>Brak pasujących pracowników</h2>
                    <p>Zmień filtry lub dodaj osobę do zespołu.</p>
                </div>
            )}
            <div className={c.list}>
                {rows.map((manager) => (
                    <button
                        key={manager.id}
                        type="button"
                        className={c.worker}
                        aria-label={`Otwórz pracownika ${manager.name} ${manager.surname}`}
                        onClick={() => setSelected(manager.id)}
                    >
                        <ManagerAvatar
                            manager={manager}
                            size={42}
                            label={`Zdjęcie ${manager.name} ${manager.surname}`}
                        />
                        <span className={c.identity}>
                            <strong>
                                {manager.name} {manager.surname}
                            </strong>
                            <small>{manager.position ?? manager.email}</small>
                        </span>
                        <span className={c.email}>{manager.email}</span>
                        <span className={c.roles}>
                            <Shield size={13} aria-hidden="true" />
                            {manager.roles
                                .map((role) => managerRoleTitle(role.name))
                                .join(', ') || 'Brak ról'}
                        </span>
                        <span
                            className={c.status}
                            style={
                                {
                                    '--status-color':
                                        managerStatusColors[manager.status],
                                } as CSSProperties
                            }
                        >
                            {managerStatusLabels[manager.status]}
                        </span>
                        <ChevronRight
                            size={16}
                            className={c.chevron}
                            aria-hidden="true"
                        />
                    </button>
                ))}
            </div>
            {workers.hasNextPage && (
                <Button
                    type="button"
                    pending={workers.isFetchingNextPage}
                    onClick={() => void workers.fetchNextPage()}
                >
                    Pokaż więcej pracowników
                </Button>
            )}
            {creating && (
                <Popup
                    title="Nowy pracownik"
                    closeDisabled={pending}
                    onClose={() => {
                        if (!pending) setCreating(false)
                    }}
                >
                    <ManagerForm
                        onPendingChange={setPending}
                        onCancel={() => setCreating(false)}
                        onSuccess={(id) => {
                            setCreating(false)

                            setSelected(id)
                        }}
                    />
                </Popup>
            )}
            {selected !== null && (
                <Popup
                    title="Pracownik"
                    closeDisabled={pending}
                    onClose={() => {
                        if (!pending) {
                            setSelected(null)

                            if (initialManagerId)
                                router.replace('/main/managers', {
                                    scroll: false,
                                })
                        }
                    }}
                >
                    <ManagerDetails
                        key={selected}
                        id={selected}
                        onPendingChange={setPending}
                    />
                </Popup>
            )}
        </section>
    )
}
