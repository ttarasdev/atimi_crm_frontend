'use client'
/* eslint-disable @next/next/no-img-element -- Read dimensions from the original public icon file. */

import { useState, type RefObject } from 'react'
import { Star } from 'lucide-react'
import type { PublicAsset } from '@/api/public-assets/public-assets.types'
import { publicAssetsApi } from '@/api/public-assets/public-assets.api'
import { ThemedIcon } from '@/components/theme-components/themed-icon/ThemedIcon'
import { Button } from '@/components/ui/button/Button'
import { Popup } from '@/components/ui/popup/Popup'
import {
    usePublicAsset,
    useTogglePublicAssetPopular,
} from '@/shared/hooks/usePublicAssets'
import { useRoles } from '@/shared/hooks/useRoles'
import c from './IconDetails.module.scss'

export function IconDetails({
    icon,
    onClose,
    fallbackFocusRef,
}: {
    icon: PublicAsset
    onClose: () => void
    fallbackFocusRef?: RefObject<HTMLElement | null>
}) {
    const query = usePublicAsset(icon.id)

    const mutation = useTogglePublicAssetPopular()

    const { hasRole } = useRoles()

    const [dimensions, setDimensions] = useState<{
        width: number
        height: number
    } | null>(null)

    const asset = query.data ?? icon

    const fileSize = new Intl.NumberFormat('pl-PL', {
        maximumFractionDigits: 1,
    }).format(asset.sizeBytes / 1024)

    const createdAt = new Intl.DateTimeFormat('pl-PL', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(asset.createdAt))

    return (
        <Popup
            title="Szczegóły ikony"
            onClose={onClose}
            fallbackFocusRef={fallbackFocusRef}
            footer={
                hasRole('admin') && (
                    <Button
                        type="button"
                        pending={mutation.isPending}
                        aria-pressed={asset.isPopular}
                        onClick={() => mutation.mutate({ id: asset.id })}
                    >
                        <Star
                            size={16}
                            aria-hidden="true"
                            fill={asset.isPopular ? 'currentColor' : 'none'}
                        />
                        {asset.isPopular
                            ? 'Usuń z popularnych'
                            : 'Oznacz jako popularną'}
                    </Button>
                )
            }
        >
            <div className={c.details} aria-busy={query.isFetching}>
                <div
                    className={`${c.preview} ${asset.isPopular ? c.popular : ''}`}
                >
                    <ThemedIcon iconId={asset.id} size={64} />
                    <img
                        src={publicAssetsApi.fileUrl(asset.id)}
                        alt=""
                        hidden
                        onLoad={(event) => {
                            setDimensions({
                                width: event.currentTarget.naturalWidth,
                                height: event.currentTarget.naturalHeight,
                            })
                        }}
                    />
                </div>
                <dl className={c.metadata}>
                    <div>
                        <dt>Nazwa</dt>
                        <dd>{asset.originalName}</dd>
                    </div>
                    <div>
                        <dt>ID</dt>
                        <dd>#{asset.id}</dd>
                    </div>
                    <div>
                        <dt>Typ pliku</dt>
                        <dd>{asset.mimeType}</dd>
                    </div>
                    <div>
                        <dt>Rozmiar</dt>
                        <dd>{fileSize} KB</dd>
                    </div>
                    {dimensions && (
                        <div>
                            <dt>Wymiary</dt>
                            <dd>
                                {dimensions.width} × {dimensions.height} px
                            </dd>
                        </div>
                    )}
                    <div>
                        <dt>Dodano</dt>
                        <dd>{createdAt}</dd>
                    </div>
                </dl>
                {query.isError && (
                    <div className={c.error} role="alert">
                        <p>Nie udało się odświeżyć szczegółów ikony.</p>
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
                {mutation.isError && (
                    <p className={c.error} role="alert">
                        Nie udało się zmienić popularności. Spróbuj ponownie.
                    </p>
                )}
            </div>
        </Popup>
    )
}
