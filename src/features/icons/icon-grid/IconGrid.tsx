'use client'

import type { PublicAsset } from '@/api/public-assets/public-assets.types'
import { ThemedIcon } from '@/components/theme-components/themed-icon/ThemedIcon'
import c from './IconGrid.module.scss'

export function IconGrid({
    icons,
    selectedIconId,
    onSelect,
}: {
    icons: readonly PublicAsset[]
    selectedIconId?: number
    onSelect?: (icon: PublicAsset) => void
}) {
    return (
        <ul className={c.grid} aria-label="Ikony">
            {icons.map((icon) => {
                const selected = selectedIconId === icon.id

                const className = [
                    c.tile,
                    icon.isPopular ? c.popular : '',
                    selected ? c.selected : '',
                ]
                    .filter(Boolean)
                    .join(' ')

                const preview = <ThemedIcon iconId={icon.id} size={40} />

                return (
                    <li key={icon.id}>
                        {onSelect ? (
                            <button
                                type="button"
                                className={className}
                                title={icon.originalName}
                                aria-label={icon.originalName}
                                aria-pressed={
                                    selectedIconId === undefined
                                        ? undefined
                                        : selected
                                }
                                onClick={() => onSelect(icon)}
                            >
                                {preview}
                            </button>
                        ) : (
                            <div
                                className={className}
                                role="img"
                                aria-label={icon.originalName}
                                title={icon.originalName}
                            >
                                {preview}
                            </div>
                        )}
                    </li>
                )
            })}
        </ul>
    )
}
