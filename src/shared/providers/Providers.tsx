'use client'

import {
    useEffect,
    useState,
    useSyncExternalStore,
    type ReactNode,
} from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { clearAccessToken, subscribeAccessToken } from '../../api/auth-token'
import {
    getSessionSnapshot,
    getServerSessionSnapshot,
    type SessionSnapshot,
} from '../auth/session-store'
import { createQueryClient } from '../query/create-query-client'
import { AuthProvider } from './AuthProvider'

function SessionProviders({
    children,
    session,
}: {
    children: ReactNode
    session: SessionSnapshot
}) {
    const [client] = useState(() =>
        createQueryClient(() => {
            // A late 401 from an old request must never log out a newer session.
            if (
                session.token &&
                getSessionSnapshot().revision === session.revision
            )
                clearAccessToken()
        }),
    )

    useEffect(() => () => client.clear(), [client])

    return (
        <QueryClientProvider client={client}>
            <AuthProvider session={session}>{children}</AuthProvider>
        </QueryClientProvider>
    )
}

export function Providers({ children }: { children: ReactNode }) {
    const session = useSyncExternalStore(
        subscribeAccessToken,
        getSessionSnapshot,
        getServerSessionSnapshot,
    )

    return (
        <SessionProviders key={session.revision} session={session}>
            {children}
        </SessionProviders>
    )
}
