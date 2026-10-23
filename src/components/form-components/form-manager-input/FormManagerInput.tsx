'use client'

import { useState } from 'react'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { Button } from '@/components/ui/button/Button'
import { useInfiniteManagers } from '@/shared/hooks/useManagers'
import c from './FormManagerInput.module.scss'

export function FormManagerInput({
    value,
    onChange,
    disabled,
    inputTitle = 'Opiekun klienta',
}: {
    value: number | null
    onChange: (value: number) => void
    disabled?: boolean
    inputTitle?: string
}) {
    const [search, setSearch] = useState('')

    const query = useInfiniteManagers({
        status: 'active',
        search: search || undefined,
    })

    const managers = query.data?.pages.flatMap((page) => page.rows) ?? []

    return (
        <div className={c.field}>
            <TextInput
                inputTitle="Szukaj pracownika"
                value={search}
                onChange={setSearch}
                disabled={disabled}
            />
            <FormSelect
                selectTitle={inputTitle}
                value={value}
                onChange={(id) => {
                    if (id !== null) onChange(id)
                }}
                disabled={disabled || query.isPending}
                required
                options={[
                    {
                        title: query.isPending
                            ? 'Wczytywanie…'
                            : 'Wybierz pracownika',
                        value: null,
                    },
                    ...managers.map((manager) => ({
                        title: `${manager.name} ${manager.surname} · ${manager.email}`,
                        value: manager.id,
                    })),
                ]}
            />
            {query.hasNextPage && (
                <Button
                    type="button"
                    pending={query.isFetchingNextPage}
                    onClick={() => {
                        void query.fetchNextPage()
                    }}
                >
                    Pokaż więcej pracowników
                </Button>
            )}
            {query.isError && (
                <p role="alert">
                    Nie udało się wczytać pracowników.{' '}
                    <button
                        type="button"
                        onClick={() => {
                            void query.refetch()
                        }}
                    >
                        Spróbuj ponownie
                    </button>
                </p>
            )}
        </div>
    )
}
