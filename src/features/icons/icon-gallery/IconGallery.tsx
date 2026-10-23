'use client'

import { useRef, useState } from 'react'
import { LoaderCircle, Plus } from 'lucide-react'
import {
    PublicBucket,
    type PublicAsset,
} from '@/api/public-assets/public-assets.types'
import { Button } from '@/components/ui/button/Button'
import { Popup } from '@/components/ui/popup/Popup'
import { useInfinitePublicAssets } from '@/shared/hooks/usePublicAssets'
import { useRoles } from '@/shared/hooks/useRoles'
import { IconCreateForm } from '../icon-create-form/IconCreateForm'
import { IconGrid } from '../icon-grid/IconGrid'
import { IconDetails } from '../icon-details/IconDetails'
import c from './IconGallery.module.scss'

export function IconGallery() {
    const [selected, setSelected] = useState<PublicAsset | null>(null)

    const [createOpen, setCreateOpen] = useState(false)

    const [createPending, setCreatePending] = useState(false)

    const galleryRef = useRef<HTMLElement>(null)

    const { hasRole } = useRoles()

    const query = useInfinitePublicAssets({
        bucket: PublicBucket.ICONS,
    })

    const icons = Array.from(
        new Map(
            (query.data?.pages.flatMap((page) => page.rows) ?? []).map(
                (icon) => [icon.id, icon],
            ),
        ).values(),
    )

    const total = query.data?.pages[0]?.total

    return (
        <section
            ref={galleryRef}
            className={c.page}
            aria-label="Galeria ikon"
            tabIndex={-1}
        >
            <div className={c.toolbar}>
                {total !== undefined && (
                    <p className={c.count}>
                        {icons.length} / {total}
                    </p>
                )}
                {hasRole('admin') && (
                    <Button
                        type="button"
                        className={c.create}
                        onClick={() => setCreateOpen(true)}
                    >
                        <Plus size={16} aria-hidden="true" />
                        Dodaj ikonę
                    </Button>
                )}
            </div>
            <div className={c.gallery} aria-busy={query.isFetching}>
                {query.isPending && (
                    <p className={c.state} role="status">
                        <LoaderCircle
                            className={c.spinner}
                            size={20}
                            aria-hidden="true"
                        />
                        Wczytywanie ikon…
                    </p>
                )}
                {icons.length > 0 && (
                    <IconGrid icons={icons} onSelect={setSelected} />
                )}
                {query.isSuccess && icons.length === 0 && (
                    <p className={c.state}>Brak ikon</p>
                )}
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
                    <div className={c.more}>
                        <Button
                            type="button"
                            pending={query.isFetchingNextPage}
                            disabled={query.isFetching}
                            onClick={() => {
                                void query.fetchNextPage()
                            }}
                        >
                            Pokaż więcej
                        </Button>
                    </div>
                )}
            </div>
            {selected && (
                <IconDetails
                    key={selected.id}
                    icon={selected}
                    onClose={() => setSelected(null)}
                    fallbackFocusRef={galleryRef}
                />
            )}
            {createOpen && (
                <Popup
                    title="Nowa ikona"
                    closeDisabled={createPending}
                    fallbackFocusRef={galleryRef}
                    onClose={() => setCreateOpen(false)}
                >
                    <IconCreateForm
                        onSuccess={() => {
                            setCreatePending(false)

                            setCreateOpen(false)
                        }}
                        onCancel={() => setCreateOpen(false)}
                        onPendingChange={setCreatePending}
                    />
                </Popup>
            )}
        </section>
    )
}
