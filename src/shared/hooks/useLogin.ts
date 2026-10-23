'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { managerAuthApi } from '@/api/manager-auth/manager-auth.api'
import type { LoginManagerDto } from '@/api/manager-auth/manager-auth.types'
import { setAccessToken } from '../../api/auth-token'
import { ApiResponseError } from '../../api/api-error'
import { fetchManagerSession } from '../auth/session-query'
import { getSessionSnapshot } from '../auth/session-store'
import { getSafeReturnPath } from '../config/routes'

export function useLogin(returnTo?: string | null) {
    const router = useRouter()

    const pending = useRef<AbortController | null>(null)

    useEffect(() => () => pending.current?.abort(), [])

    return useMutation({
        meta: { skipAuthHandling: true },

        mutationFn: async (dto: LoginManagerDto) => {
            pending.current?.abort()

            const controller = new AbortController()

            pending.current = controller

            const revision = getSessionSnapshot().revision

            const signal = AbortSignal.any([
                controller.signal,
                AbortSignal.timeout(15000),
            ])

            const { token } = await managerAuthApi.login(dto, {
                signal,
            })

            if (typeof token !== 'string' || !token.trim())
                throw new ApiResponseError(200, '/manager-auth/login')

            const manager = await fetchManagerSession({
                token,
                signal,
            })

            controller.signal.throwIfAborted()

            if (revision !== getSessionSnapshot().revision)
                throw new DOMException(
                    'Session changed during login',
                    'AbortError',
                )

            router.replace(getSafeReturnPath(returnTo))

            setAccessToken(token)

            return manager
        },
    })
}
