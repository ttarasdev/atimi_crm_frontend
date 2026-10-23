'use client'

import { useEffect, useRef, useState } from 'react'
import type { Manager } from '@/api/managers/managers.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { useManagerRoles, useSetManagerRoles } from '@/shared/hooks/useManagers'
import { managerRoleTitle } from '../manager-labels'
import c from './ManagerRolesForm.module.scss'

export function ManagerRolesForm({
    manager,
    onSuccess,
    onCancel,
    onPendingChange,
}: {
    manager: Manager
    onSuccess: () => void
    onCancel: () => void
    onPendingChange: (pending: boolean) => void
}) {
    const [ids, setIds] = useState(manager.roles.map((role) => role.id))

    const roles = useManagerRoles()

    const update = useSetManagerRoles()

    const controller = useRef<AbortController | null>(null)

    useEffect(() => {
        onPendingChange(update.isPending)
    }, [update.isPending, onPendingChange])

    useEffect(() => () => controller.current?.abort(), [])

    return (
        <FormContainer
            aria-label="Zmiana ról pracownika"
            isPending={update.isPending}
            submitTitle="Zapisz role"
            submitDisabled={!ids.length || roles.isPending || roles.isError}
            onCancel={onCancel}
            error={
                update.isError
                    ? 'Nie udało się zmienić ról. Spróbuj ponownie.'
                    : undefined
            }
            onSubmit={() => {
                controller.current = new AbortController()

                update.mutate(
                    {
                        id: manager.id,
                        roleIds: ids,
                        signal: controller.current.signal,
                    },
                    {
                        onSuccess: () => {
                            onPendingChange(false)

                            onSuccess()
                        },
                    },
                )
            }}
        >
            <p className={c.hint}>
                Wybierz uprawnienia dla {manager.name} {manager.surname}.
                Administrator ma dostęp do całego CRM.
            </p>
            {roles.isPending && <p role="status">Wczytywanie ról…</p>}
            {roles.isError && (
                <div role="alert">
                    Nie udało się wczytać ról.{' '}
                    <button type="button" onClick={() => void roles.refetch()}>
                        Spróbuj ponownie
                    </button>
                </div>
            )}
            <div className={c.roles}>
                {roles.data?.rows.map((role) => (
                    <label key={role.id}>
                        <input
                            type="checkbox"
                            checked={ids.includes(role.id)}
                            onChange={(event) =>
                                setIds(
                                    event.target.checked
                                        ? [...ids, role.id]
                                        : ids.filter((id) => id !== role.id),
                                )
                            }
                        />
                        <span>
                            <strong>{managerRoleTitle(role.name)}</strong>
                            <small>
                                {role.name === 'admin'
                                    ? 'Wszyscy klienci, pracownicy i ustawienia'
                                    : role.name === 'manager'
                                      ? 'Własni klienci i podgląd nieprywatnych klientów'
                                      : 'Wysyłanie poczty bez dostępu do bazy klientów'}
                            </small>
                        </span>
                    </label>
                ))}
            </div>
        </FormContainer>
    )
}
