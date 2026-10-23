'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
    CalendarDays,
    Users,
    Pencil,
    Shield,
    Ban,
    Archive,
    Check,
    Mail,
    BellOff,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import { Button } from '@/components/ui/button/Button'
import { ManagerAvatar } from '@/components/ui/manager-avatar/ManagerAvatar'
import { useAuth } from '@/shared/hooks/useAuth'
import {
    useManager,
    useResendManagerConfirmation,
} from '@/shared/hooks/useManagers'
import { ManagerForm } from '../manager-form/ManagerForm'
import { ManagerRolesForm } from '../manager-roles-form/ManagerRolesForm'
import { ManagerStatusForm } from '../manager-status-form/ManagerStatusForm'
import {
    managerRoleTitle,
    managerStatusColors,
    managerStatusLabels,
} from '../manager-labels'
import c from './ManagerDetails.module.scss'

type Mode = 'profile' | 'edit' | 'roles' | 'active' | 'blocked' | 'archived'

export function ManagerDetails({
    id,
    onPendingChange,
}: {
    id: number
    onPendingChange: (pending: boolean) => void
}) {
    const { manager: actor } = useAuth()

    const worker = useManager(id)

    const [mode, setMode] = useState<Mode>('profile')

    const resend = useResendManagerConfirmation()

    const manager = worker.data

    if (worker.isPending) return <p role="status">Wczytywanie pracownika…</p>

    if (!manager || worker.isError)
        return (
            <div role="alert">
                <p>Nie udało się wczytać pracownika.</p>
                <Button type="button" onClick={() => void worker.refetch()}>
                    Spróbuj ponownie
                </Button>
            </div>
        )

    const isSelf = manager.id === actor?.id

    if (mode === 'edit')
        return (
            <ManagerForm
                manager={manager}
                onPendingChange={onPendingChange}
                onCancel={() => setMode('profile')}
                onSuccess={() => setMode('profile')}
            />
        )

    if (mode === 'roles')
        return (
            <ManagerRolesForm
                manager={manager}
                onPendingChange={onPendingChange}
                onCancel={() => setMode('profile')}
                onSuccess={() => setMode('profile')}
            />
        )

    if (mode === 'active' || mode === 'blocked' || mode === 'archived')
        return (
            <ManagerStatusForm
                manager={manager}
                status={mode}
                onPendingChange={onPendingChange}
                onCancel={() => setMode('profile')}
                onSuccess={() => setMode('profile')}
            />
        )

    return (
        <div className={c.details}>
            <header className={c.profile}>
                <ManagerAvatar
                    manager={manager}
                    size={60}
                    label={`Zdjęcie ${manager.name} ${manager.surname}`}
                />
                <div>
                    <h2>
                        {manager.name} {manager.surname}
                        {isSelf && <small>Ty</small>}
                    </h2>
                    <p>{manager.position ?? 'Pracownik zespołu'}</p>
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
                </div>
            </header>
            <div className={c.roles}>
                {manager.roles.map((role) => (
                    <span key={role.id}>{managerRoleTitle(role.name)}</span>
                ))}
            </div>
            <dl className={c.info}>
                <dt>Email</dt>
                <dd>
                    <a href={`mailto:${manager.email}`}>{manager.email}</a>
                </dd>
                <dt>Telefon</dt>
                <dd>
                    {manager.phone ? (
                        <a href={`tel:${manager.phone}`}>{manager.phone}</a>
                    ) : (
                        'Nie podano'
                    )}
                </dd>
                <dt>W zespole od</dt>
                <dd>
                    {new Date(manager.createdAt).toLocaleDateString('pl-PL')}
                </dd>
                <dt>Ostatnie logowanie</dt>
                <dd>
                    {manager.lastLoginAt
                        ? new Date(manager.lastLoginAt).toLocaleString('pl-PL')
                        : 'Jeszcze nie logowano'}
                </dd>
                <dt>Poczta kalendarza</dt>
                <dd>{manager.remindersEnabled ? 'Włączona' : 'Wyłączona'}</dd>
            </dl>
            <div className={c.links}>
                <Link href={`/main/managers/${manager.id}/calendar`}>
                    <CalendarDays size={18} aria-hidden="true" />
                    <span>
                        Kalendarz pracownika
                        <small>Wydarzenia, przypomnienia i terminy</small>
                    </span>
                </Link>
                <Link href={`/main/clients?managerId=${manager.id}`}>
                    <Users size={18} aria-hidden="true" />
                    <span>
                        Klienci pracownika
                        <small>Sprawy przypisane do tego opiekuna</small>
                    </span>
                </Link>
            </div>
            {manager.status === 'pending' && (
                <div className={c.pending}>
                    <Mail size={18} aria-hidden="true" />
                    <p>
                        Konto zostanie aktywowane po potwierdzeniu adresu email.
                    </p>
                    <Button
                        type="button"
                        pending={resend.isPending}
                        onClick={() => resend.mutate({ email: manager.email })}
                    >
                        Wyślij potwierdzenie
                    </Button>
                    {resend.isSuccess && (
                        <span role="status">
                            Prośba o potwierdzenie została wysłana. Kolejny link
                            można wysłać po minucie.
                        </span>
                    )}
                    {resend.isError && (
                        <span role="alert">
                            Nie udało się wysłać potwierdzenia.
                        </span>
                    )}
                </div>
            )}
            {manager.status !== 'active' && manager.status !== 'pending' && (
                <p className={c.notice}>
                    <BellOff size={16} aria-hidden="true" />
                    Konto jest zamrożone. Klienci i sprawy pozostają dostępni
                    administratorowi.
                </p>
            )}
            <div className={c.actions}>
                <Button type="button" onClick={() => setMode('edit')}>
                    <Pencil size={15} aria-hidden="true" />
                    Edytuj dane
                </Button>
                <Button
                    type="button"
                    disabled={isSelf}
                    title={
                        isSelf ? 'Nie można zmieniać własnych ról' : undefined
                    }
                    onClick={() => setMode('roles')}
                >
                    <Shield size={15} aria-hidden="true" />
                    Zmień role
                </Button>
            </div>
            {manager.status !== 'pending' && (
                <div className={c.statusActions}>
                    {manager.status !== 'active' && (
                        <Button
                            type="button"
                            disabled={isSelf}
                            onClick={() => setMode('active')}
                        >
                            <Check size={15} aria-hidden="true" />
                            Przywróć dostęp
                        </Button>
                    )}
                    {manager.status !== 'blocked' && (
                        <Button
                            type="button"
                            disabled={isSelf}
                            onClick={() => setMode('blocked')}
                        >
                            <Ban size={15} aria-hidden="true" />
                            Zablokuj konto
                        </Button>
                    )}
                    {manager.status !== 'archived' && (
                        <Button
                            type="button"
                            disabled={isSelf}
                            onClick={() => setMode('archived')}
                        >
                            <Archive size={15} aria-hidden="true" />
                            Archiwizuj konto
                        </Button>
                    )}
                </div>
            )}
            {isSelf && (
                <p className={c.hint}>
                    Ze względów bezpieczeństwa nie możesz zmienić własnego
                    statusu ani ról.
                </p>
            )}
        </div>
    )
}
