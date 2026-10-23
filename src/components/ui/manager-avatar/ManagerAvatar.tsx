'use client'

import { useEffect, useRef } from 'react'
import type { Manager } from '@/api/managers/managers.types'
import {
    usePrivateAssetFile,
    usePrivateVariant,
} from '@/shared/hooks/usePrivateMedia'
import c from './ManagerAvatar.module.scss'

export function ManagerAvatar({
    manager,
    size = 36,
    src,
    label = 'Zdjęcie profilowe',
    className = '',
}: {
    manager: Pick<Manager, 'name' | 'surname' | 'avatarId'>
    size?: number
    src?: string
    label?: string
    className?: string
}) {
    const variant = usePrivateVariant(src ? null : manager.avatarId)

    const file = usePrivateAssetFile(variant.data?.smallAssetId ?? null)

    const image = useRef<HTMLImageElement>(null)

    useEffect(() => {
        const element = image.current

        if (!element) return

        const url =
            src ?? (file.data ? URL.createObjectURL(file.data) : undefined)

        if (!url) return

        element.src = url

        element.hidden = false

        return () => {
            element.hidden = true

            element.removeAttribute('src')

            if (!src) URL.revokeObjectURL(url)
        }
    }, [src, file.data])

    const initials = [manager.name, manager.surname]
        .map((part) => part.trim().slice(0, 1))
        .join('')
        .toUpperCase()

    return (
        <span
            className={`${c.avatar} ${className}`}
            style={{ width: size, height: size }}
            role="img"
            aria-label={label}
        >
            <span
                className={c.initials}
                aria-hidden="true"
                style={{ fontSize: size * 0.35 }}
            >
                {initials}
            </span>
            {/* Authenticated bytes use a local object URL rather than the image optimizer. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                ref={image}
                alt=""
                width={size}
                height={size}
                hidden
                className={c.image}
                onError={(event) => {
                    event.currentTarget.hidden = true
                }}
            />
        </span>
    )
}
