'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
    Menu,
    UserRound,
    ChevronRight,
    PanelLeftClose,
    PanelLeftOpen,
} from 'lucide-react'
import { GlobalSearch } from '@/features/global-search/GlobalSearch'
import { DocumentUploadNotifications } from '@/features/document-requests/DocumentUploadNotifications'
import { Sidebar } from '../sidebar/Sidebar'
import { ManagerAvatar } from '@/components/ui/manager-avatar/ManagerAvatar'
import { sectionForPath, managementSections } from '@/features/crm/catalog'
import { RoleGuard } from '@/shared/guards/RoleGuard'
import { useAuth } from '@/shared/hooks/useAuth'
import c from './AppShell.module.scss'

export function AppShell({ children }: { children: ReactNode }) {
    const pathname = usePathname()

    const router = useRouter()

    const { manager } = useAuth()

    const senderOnly =
        !!manager?.roles.some((role) => role.name === 'sender') &&
        !manager.roles.some(
            (role) => role.name === 'admin' || role.name === 'manager',
        )

    useEffect(() => {
        if (senderOnly && pathname === '/main') router.replace('/main/mail')
    }, [senderOnly, pathname, router])

    const section = sectionForPath(pathname)

    const title =
        managementSections.find((item) => item.path === pathname)?.title ??
        (pathname === '/main/profile'
            ? 'Mój profil'
            : (section?.title ?? 'CRM'))

    const drawer = useRef<HTMLDialogElement>(null)

    const [collapsed, setCollapsed] = useState(false)

    useEffect(() => {
        const query = window.matchMedia('(min-width: 801px)')

        const close = () => {
            if (query.matches) drawer.current?.close()
        }

        query.addEventListener('change', close)

        return () => query.removeEventListener('change', close)
    }, [])

    return (
        <div className={`${c.shell} ${collapsed ? c.collapsed : ''}`}>
            <a className={c.skip} href="#content">
                Przejdź do treści
            </a>
            <aside id="desktop-navigation" className={c.desktopSidebar}>
                <Sidebar collapsed={collapsed} />
            </aside>
            <dialog
                ref={drawer}
                className={c.drawer}
                aria-label="Menu główne"
                onClick={(event) => {
                    if (event.target === drawer.current) drawer.current?.close()
                }}
            >
                <Sidebar onClose={() => drawer.current?.close()} />
            </dialog>
            <div className={c.body}>
                <header className={c.header}>
                    <button
                        type="button"
                        className={c.desktopMenuButton}
                        onClick={() => setCollapsed((value) => !value)}
                        aria-label={collapsed ? 'Rozwiń menu' : 'Zwiń menu'}
                        aria-controls="desktop-navigation"
                        aria-expanded={!collapsed}
                    >
                        {collapsed ? (
                            <PanelLeftOpen size={20} aria-hidden="true" />
                        ) : (
                            <PanelLeftClose size={20} aria-hidden="true" />
                        )}
                    </button>
                    <button
                        type="button"
                        className={c.menuButton}
                        onClick={() => drawer.current?.showModal()}
                        aria-label="Otwórz menu"
                    >
                        <Menu size={22} />
                    </button>
                    <div className={c.breadcrumb}>
                        <span>Atimi CRM</span>
                        <ChevronRight size={13} />
                        <strong>{title}</strong>
                    </div>
                    <div className={c.headerActions}>
                        {!senderOnly && <GlobalSearch />}
                        {!senderOnly && <DocumentUploadNotifications />}
                        <Link
                            href="/main/profile"
                            className={c.profile}
                            aria-label="Mój profil"
                        >
                            <span className={c.profileName}>
                                {manager?.name}
                            </span>
                            {manager ? (
                                <ManagerAvatar manager={manager} size={36} />
                            ) : (
                                <UserRound size={19} />
                            )}
                        </Link>
                    </div>
                </header>
                <main id="content" className={c.content} tabIndex={-1}>
                    <RoleGuard
                        allowedRoles={
                            pathname === '/main/profile'
                                ? ['admin', 'manager', 'sender']
                                : (section?.roles ?? ['admin', 'manager'])
                        }
                    >
                        {children}
                    </RoleGuard>
                </main>
            </div>
        </div>
    )
}
