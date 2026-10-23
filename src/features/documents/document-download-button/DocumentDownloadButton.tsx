'use client'

import { useEffect, useRef } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button/Button'
import { useDownloadPrivateAsset } from '@/shared/hooks/usePrivateAssets'
import { getDocumentDownloadName } from '../document-format'

export function DocumentDownloadButton({
    id,
    filename,
    compact = false,
}: {
    id: number
    filename: string
    compact?: boolean
}) {
    const download = useDownloadPrivateAsset()

    const controller = useRef<AbortController | null>(null)

    useEffect(() => () => controller.current?.abort(), [])

    return (
        <>
            <Button
                type="button"
                aria-label={`Pobierz ${filename}`}
                title={`Pobierz ${filename}`}
                pending={download.isPending}
                onClick={() => {
                    controller.current = new AbortController()

                    download.mutate(
                        { id, signal: controller.current.signal },
                        {
                            onSuccess: (blob) => {
                                const url = URL.createObjectURL(blob)

                                const anchor = document.createElement('a')

                                anchor.href = url

                                anchor.download = getDocumentDownloadName(
                                    filename,
                                    blob.type,
                                )

                                anchor.click()

                                setTimeout(() => URL.revokeObjectURL(url), 1000)
                            },
                        },
                    )
                }}
            >
                <Download size={16} aria-hidden="true" />
                {!compact && 'Pobierz'}
            </Button>
            {download.isError && (
                <span role="alert">Nie udało się pobrać pliku.</span>
            )}
        </>
    )
}
