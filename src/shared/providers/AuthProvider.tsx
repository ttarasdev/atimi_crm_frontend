'use client'

import { useCallback, useMemo, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { managerAuthApi } from '@/api/manager-auth/manager-auth.api'
import { getSessionSnapshot } from '../auth/session-store'
import { clearAccessToken } from '../../api/auth-token'
import { ApiError } from '../../api/api-error'
import { AuthContext } from '../auth/auth-context'
import type { AuthContextValue, AuthStatus } from '../auth/auth.types'
import type { SessionSnapshot } from '../auth/session-store'
import { managerSessionOptions } from '../auth/session-query'

export function AuthProvider({
    children,
    session,
}: {
    children: ReactNode
    session: SessionSnapshot
}) {
    const client = useQueryClient()

    const query = useQuery(managerSessionOptions(session.token))

    const { refetch } = query

    const logout = useCallback(async () => {
        if (session.token) {
            try {
                await managerAuthApi.logout({
                    token: session.token,
                    signal: AbortSignal.timeout(10000),
                })
            } catch (error) {
                if (!(error instanceof ApiError && error.status === 401))
                    throw error
            }
        }

        if (getSessionSnapshot().revision === session.revision) {
            clearAccessToken()

            client.clear()
        }
    }, [client, session])

    const refreshSession = useCallback(async () => {
        if (session.token) await refetch()
    }, [session.token, refetch])

    let status: AuthStatus

    if (!session.initialized) status = 'loading'
    else if (!session.token) status = 'anonymous'
    else if (query.error instanceof ApiError && query.error.status === 403)
        status = 'forbidden'
    else if (query.error instanceof ApiError && query.error.status === 401)
        status = 'anonymous'
    else if (query.data) status = 'authenticated'
    else if (query.isError) status = 'error'
    else status = 'loading'

    const value = useMemo<AuthContextValue>(
        () => ({
            status,
            manager: status === 'authenticated' ? (query.data ?? null) : null,
            error: query.error,
            isRefreshing: query.isFetching,
            refreshSession,
            logout,
        }),
        [
            status,
            query.data,
            query.error,
            query.isFetching,
            refreshSession,
            logout,
        ],
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
