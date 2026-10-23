'use client'

import { useId, useRef, useState, type CSSProperties } from 'react'
import { ChevronDown, ImageIcon } from 'lucide-react'
import { PublicBucket } from '@/api/public-assets/public-assets.types'
import { ThemedIcon } from '@/components/theme-components/themed-icon/ThemedIcon'
import { Button } from '@/components/ui/button/Button'
import { IconGrid } from '@/features/icons/icon-grid/IconGrid'
import { useInfinitePublicAssets } from '@/shared/hooks/usePublicAssets'
import c from './FormIconInput.module.scss'

interface Props {
    inputTitle: string
    value: number | null
    onChange: (value: number) => void
    disabled?: boolean
    color?: CSSProperties['color']
}

function IconPicker({ value, onChange }: Pick<Props, 'value' | 'onChange'>) {
    const query = useInfinitePublicAssets({ bucket: PublicBucket.ICONS })

    const icons = Array.from(
        new Map(
            (query.data?.pages.flatMap((page) => page.rows) ?? []).map(
                (icon) => [icon.id, icon],
            ),
        ).values(),
    )

    return (
        <>
            <div className={c.scroll} aria-busy={query.isFetching}>
                {query.isPending && (
                    <p className={c.state} role="status">
                        Wczytywanie ikon…
                    </p>
                )}
                {icons.length > 0 && (
                    <IconGrid
                        icons={icons}
                        selectedIconId={value ?? undefined}
                        onSelect={(icon) => onChange(icon.id)}
                    />
                )}
                {query.isSuccess && icons.length === 0 && (
                    <p className={c.state}>Brak ikon do wyboru.</p>
                )}
            </div>
            {query.isError && (
                <div className={c.error} role="alert">
                    <p>Nie udało się wczytać ikon.</p>
                    <Button
                        type="button"
                        pending={query.isFetching}
                        onClick={() => {
                            void query.refetch()
                        }}
                    >
                        Spróbuj ponownie
                    </Button>
                </div>
            )}
            {query.hasNextPage && !query.isError && (
                <Button
                    type="button"
                    className={c.more}
                    pending={query.isFetchingNextPage}
                    disabled={query.isFetching}
                    onClick={() => {
                        void query.fetchNextPage()
                    }}
                >
                    Pokaż więcej
                </Button>
            )}
        </>
    )
}

export function FormIconInput({
    inputTitle,
    value,
    onChange,
    disabled = false,
    color = 'var(--primary)',
}: Props) {
    const [open, setOpen] = useState(false)

    const id = useId()

    const trigger = useRef<HTMLButtonElement>(null)

    const expanded = open && !disabled

    const close = () => {
        setOpen(false)

        trigger.current?.focus({ preventScroll: true })
    }

    return (
        <div
            className={c.field}
            onKeyDownCapture={(event) => {
                if (event.key === 'Escape' && expanded) {
                    event.preventDefault()

                    event.stopPropagation()

                    close()
                }
            }}
        >
            <label className={c.label} htmlFor={id}>
                {inputTitle}
            </label>
            <button
                ref={trigger}
                id={id}
                type="button"
                className={c.control}
                disabled={disabled}
                aria-label={value === null ? 'Wybierz ikonę' : 'Zmień ikonę'}
                aria-expanded={expanded}
                aria-controls={`${id}-picker`}
                onClick={() => setOpen(!open)}
            >
                <span className={c.preview} style={{ color }}>
                    {value === null ? (
                        <ImageIcon size={22} aria-hidden="true" />
                    ) : (
                        <ThemedIcon iconId={value} size={32} />
                    )}
                </span>
                <span>{value === null ? 'Wybierz ikonę' : 'Zmień ikonę'}</span>
                <ChevronDown
                    className={expanded ? c.rotated : c.chevron}
                    size={16}
                    aria-hidden="true"
                />
            </button>
            {expanded && (
                <div
                    id={`${id}-picker`}
                    className={c.picker}
                    role="region"
                    aria-label="Wybierz ikonę"
                >
                    <IconPicker
                        value={value}
                        onChange={(iconId) => {
                            if (disabled) return

                            onChange(iconId)

                            close()
                        }}
                    />
                </div>
            )}
        </div>
    )
}
