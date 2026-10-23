'use client'

import { useEffect, useRef } from 'react'
import { Brand } from '@/components/ui/brand/Brand'
import { getAccessToken } from '@/api/auth-token'
import { routes } from '@/shared/config/routes'
import c from './Intro.module.scss'

declare global {
    interface Window {
        __atimiIntro?: WeakSet<HTMLElement>
    }
}

export function Intro() {
    const intro = useRef<HTMLElement>(null)

    useEffect(() => {
        const element = intro.current

        if (!element || window.__atimiIntro?.has(element)) return

        const timer = window.setTimeout(() => {
            if (!element.isConnected || window.location.pathname !== '/') return

            window.location.replace(
                getAccessToken() ? routes.main : routes.auth,
            )
        }, 1000)

        return () => window.clearTimeout(timer)
    }, [])

    return (
        <main id="atimi-intro" ref={intro} className={c.intro}>
            <div className={c.content}>
                <Brand />
                <p>Twoja przestrzeń pracy</p>
                <span
                    className={c.progress}
                    role="status"
                    aria-label="Ładowanie CRM"
                />
            </div>
        </main>
    )
}
