'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
    LayoutDashboard,
    Users,
    ContactRound,
    ListTodo,
    CalendarDays,
    Mail,
    Files,
    StickyNote,
    ChartNoAxesCombined,
    Handshake,
    UsersRound,
    SlidersHorizontal,
    Building2,
    UserRound,
    X,
    ChevronRight,
    Shapes,
    Globe,
    Plus,
} from 'lucide-react'
import { Brand } from '@/components/ui/brand/Brand'
import { ManagerAvatar } from '@/components/ui/manager-avatar/ManagerAvatar'
import {
    sections,
    managementSections,
    sectionForPath,
} from '@/features/crm/catalog'
import { useRoles } from '@/shared/hooks/useRoles'
import { useAuth } from '@/shared/hooks/useAuth'
import c from './Sidebar.module.scss'

const icons = {
    dashboard: LayoutDashboard,
    clients: Users,
    leads: ContactRound,
    tasks: ListTodo,
    calendar: CalendarDays,
    mail: Mail,
    documents: Files,
    notes: StickyNote,
    reports: ChartNoAxesCombined,
    partners: Handshake,
    managers: UsersRound,
    management: SlidersHorizontal,
    company: Building2,
}

const managementIcons = [
    ListTodo,
    Files,
    Files,
    Shapes,
    CalendarDays,
    Mail,
    Files,
    Globe,
]

export function Sidebar({
    onClose,
    collapsed = false,
}: {
    onClose?: () => void
    collapsed?: boolean
}) {
    const pathname = usePathname()

    const router = useRouter()

    const { hasAnyRole } = useRoles()

    const { manager } = useAuth()

    const visible = sections.filter((section) => hasAnyRole(section.roles))

    return (
        <div className={`${c.sidebar} ${collapsed ? c.collapsed : ''}`}>
            <div className={c.brand}>
                <Link
                    href="/main"
                    onClick={onClose}
                    aria-label="Atimi — Pulpit"
                >
                    {collapsed ? (
                        <strong className={c.brandMark} aria-hidden="true">
                            A
                        </strong>
                    ) : (
                        <Brand compact />
                    )}
                </Link>
                {onClose && (
                    <button
                        className={c.close}
                        onClick={onClose}
                        aria-label="Zamknij menu"
                    >
                        <X size={22} />
                    </button>
                )}
            </div>
            {hasAnyRole(['admin', 'manager']) && (
                <Link
                    href="/main/clients?create=1"
                    className={c.createClient}
                    onClick={(event) => {
                        onClose?.()

                        if (
                            pathname !== '/main/clients' ||
                            event.button !== 0 ||
                            event.metaKey ||
                            event.ctrlKey ||
                            event.shiftKey ||
                            event.altKey ||
                            event.defaultPrevented
                        )
                            return

                        event.preventDefault()

                        const query = new URLSearchParams(
                            window.location.search,
                        )

                        query.set('create', '1')

                        router.push(`/main/clients?${query.toString()}`, {
                            scroll: false,
                        })
                    }}
                    aria-label="Dodaj klienta"
                    title={collapsed ? 'Dodaj klienta' : undefined}
                >
                    <Plus size={17} aria-hidden="true" />
                    <span className={c.linkLabel}>Dodaj klienta</span>
                </Link>
            )}
            <nav aria-label="Menu główne" className={c.navigation}>
                {Array.from(
                    new Set(visible.map((section) => section.group)),
                ).map((group) => (
                    <div className={c.group} key={group}>
                        <p>{group}</p>
                        {visible
                            .filter((section) => section.group === group)
                            .map((section) => {
                                const Icon =
                                    icons[section.icon as keyof typeof icons]

                                const active =
                                    sectionForPath(pathname)?.path ===
                                    section.path

                                return (
                                    <div key={section.path}>
                                        <Link
                                            href={section.path}
                                            className={`${c.link} ${active ? c.active : ''}`}
                                            aria-current={
                                                pathname === section.path
                                                    ? 'page'
                                                    : undefined
                                            }
                                            onClick={onClose}
                                            aria-label={section.title}
                                            title={
                                                collapsed
                                                    ? section.title
                                                    : undefined
                                            }
                                        >
                                            <Icon
                                                size={18}
                                                strokeWidth={1.6}
                                                aria-hidden="true"
                                            />
                                            <span className={c.linkLabel}>
                                                {section.title}
                                            </span>
                                            {active && (
                                                <span className={c.dot} />
                                            )}
                                        </Link>
                                        {section.path === '/main/management' &&
                                            active && (
                                                <div className={c.subnav}>
                                                    {managementSections.map(
                                                        (item, index) => {
                                                            if (
                                                                item.roles &&
                                                                !hasAnyRole(
                                                                    item.roles,
                                                                )
                                                            )
                                                                return null

                                                            const Icon =
                                                                managementIcons[
                                                                    index
                                                                ]

                                                            return (
                                                                <Link
                                                                    href={
                                                                        item.path
                                                                    }
                                                                    key={
                                                                        item.path
                                                                    }
                                                                    aria-current={
                                                                        pathname ===
                                                                        item.path
                                                                            ? 'page'
                                                                            : undefined
                                                                    }
                                                                    onClick={
                                                                        onClose
                                                                    }
                                                                    aria-label={
                                                                        item.title
                                                                    }
                                                                    title={
                                                                        collapsed
                                                                            ? item.title
                                                                            : undefined
                                                                    }
                                                                >
                                                                    <Icon
                                                                        size={
                                                                            16
                                                                        }
                                                                        strokeWidth={
                                                                            1.6
                                                                        }
                                                                        className={
                                                                            c.subnavIcon
                                                                        }
                                                                        aria-hidden="true"
                                                                    />
                                                                    <span
                                                                        className={
                                                                            c.linkLabel
                                                                        }
                                                                    >
                                                                        {
                                                                            item.title
                                                                        }
                                                                    </span>
                                                                </Link>
                                                            )
                                                        },
                                                    )}
                                                </div>
                                            )}
                                    </div>
                                )
                            })}
                    </div>
                ))}
            </nav>
            <Link
                className={`${c.profile} ${pathname === '/main/profile' ? c.active : ''}`}
                href="/main/profile"
                onClick={onClose}
                aria-label="Mój profil"
                title={collapsed ? 'Mój profil' : undefined}
            >
                {manager ? (
                    <ManagerAvatar
                        manager={manager}
                        size={36}
                        className={c.avatar}
                    />
                ) : (
                    <span className={c.avatar}>
                        <UserRound size={19} />
                    </span>
                )}
                <span>
                    <strong>
                        {manager?.name} {manager?.surname}
                    </strong>
                    <small>Mój profil</small>
                </span>
                <ChevronRight size={16} />
            </Link>
        </div>
    )
}
