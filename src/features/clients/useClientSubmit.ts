'use client'

import { useEffect, useRef, useState } from 'react'
import { clientActionError } from './client-labels'

export function useClientSubmit(onPendingChange?: (pending: boolean) => void) {
    const [pending, setPending] = useState(false)

    const [error, setError] = useState<string>()

    const request = useRef<AbortController | null>(null)

    useEffect(() => () => request.current?.abort(), [])

    const run = async (operation: (signal: AbortSignal) => Promise<void>) => {
        if (request.current) return

        const controller = new AbortController()

        request.current = controller

        setPending(true)

        setError(undefined)

        onPendingChange?.(true)

        try {
            await operation(controller.signal)
        } catch (caught) {
            if (!controller.signal.aborted) setError(clientActionError(caught))
        } finally {
            request.current = null

            if (!controller.signal.aborted) {
                setPending(false)

                onPendingChange?.(false)
            }
        }
    }

    return { pending, error, run, setError }
}
