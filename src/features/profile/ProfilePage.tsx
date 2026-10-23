'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
    Bell,
    BriefcaseBusiness,
    CalendarDays,
    CalendarRange,
    Camera,
    Flag,
    LoaderCircle,
    LogOut,
    KeyRound,
    Mail,
    MailCheck,
    MailX,
    Pencil,
    Phone,
    Shapes,
    ShieldCheck,
    Files,
    StickyNote,
    Clock3,
} from 'lucide-react'
import type { ManagerRole } from '@/api/managers/managers.types'
import { Button } from '@/components/ui/button/Button'
import { ManagerAvatar } from '@/components/ui/manager-avatar/ManagerAvatar'
import { Popup } from '@/components/ui/popup/Popup'
import { SettingsRow } from '@/components/ui/settings-row/SettingsRow'
import { Switch } from '@/components/ui/switch/Switch'
import { authErrorMessage } from '@/shared/auth/auth-errors'
import { useAuth } from '@/shared/hooks/useAuth'
import { useUpdateMyManager } from '@/shared/hooks/useManagers'
import { ProfileEditForm } from './profile-edit-form/ProfileEditForm'
import { ProfileAvatarForm } from './profile-avatar-form/ProfileAvatarForm'
import { ProfileSecurityForm } from './profile-security-form/ProfileSecurityForm'
import c from './ProfilePage.module.scss'

const roleNames: Record<ManagerRole, string> = {
    admin: 'Administrator',
    manager: 'Doradca',
    sender: 'Sender',
}

export function ProfilePage() {
    const { manager, logout } = useAuth()

    const [editing, setEditing] = useState<
        'data' | 'avatar' | 'email' | 'password' | null
    >(null)

    const [formPending, setFormPending] = useState(false)

    const [notificationError, setNotificationError] = useState<string>()

    const [notificationSaved, setNotificationSaved] = useState(false)

    const controller = useRef<AbortController | null>(null)

    const sectionRef = useRef<HTMLElement>(null)

    const update = useUpdateMyManager()

    const logoutMutation = useMutation({ mutationFn: logout })

    useEffect(
        () => () => {
            controller.current?.abort()
        },
        [],
    )

    if (!manager) return null

    const name = [manager.name, manager.surname].filter(Boolean).join(' ')

    const isAdmin = manager.roles.some((role) => role.name === 'admin')

    const isTeam =
        isAdmin || manager.roles.some((role) => role.name === 'manager')

    const role =
        manager.roles.find((item) => item.name === 'admin') ?? manager.roles[0]

    const busy = update.isPending || formPending || logoutMutation.isPending

    async function changeNotifications(enabled: boolean) {
        if (controller.current || busy) return

        setNotificationError(undefined)

        setNotificationSaved(false)

        controller.current = new AbortController()

        try {
            await update.mutateAsync({
                dto: { remindersEnabled: enabled },
                signal: controller.current.signal,
            })

            setNotificationSaved(true)
        } catch {
            if (!controller.current?.signal.aborted)
                setNotificationError(
                    'Nie udało się zmienić powiadomień. Spróbuj ponownie.',
                )
        } finally {
            controller.current = null
        }
    }

    return (
        <section
            ref={sectionRef}
            className={c.page}
            aria-label="Mój profil"
            tabIndex={-1}
        >
            <header className={c.heading}>
                <div>
                    <span className={c.eyebrow}>TWOJE KONTO</span>
                    <h1>Mój profil</h1>
                </div>
            </header>
            <div className={c.layout}>
                <div className={c.account}>
                    <div className={c.identity}>
                        <button
                            type="button"
                            className={c.avatarButton}
                            aria-label="Zmień zdjęcie"
                            disabled={busy}
                            onClick={() => setEditing('avatar')}
                        >
                            <ManagerAvatar
                                manager={manager}
                                size={66}
                                className={c.avatar}
                                label={
                                    manager.avatarId
                                        ? 'Zdjęcie profilowe'
                                        : 'Inicjały użytkownika'
                                }
                            />
                            <span className={c.camera} aria-hidden="true">
                                <Camera size={13} />
                            </span>
                        </button>
                        <h2>{name}</h2>
                        <p className={c.email}>{manager.email}</p>
                        <div className={c.badges}>
                            {role && <span>{roleNames[role.name]}</span>}
                            <span>
                                <ShieldCheck size={12} aria-hidden="true" />
                                Aktywne konto
                            </span>
                        </div>
                        <Button
                            className={c.edit}
                            disabled={busy}
                            onClick={() => setEditing('data')}
                        >
                            <Pencil size={14} aria-hidden="true" />
                            Edytuj profil
                        </Button>
                    </div>
                    <div className={c.card}>
                        <header className={c.sectionHeading}>
                            <h2>Dane kontaktowe</h2>
                        </header>
                        <SettingsRow
                            title="E-mail"
                            description={manager.email}
                            icon={<Mail size={17} />}
                        />
                        <SettingsRow
                            title="Telefon"
                            description={manager.phone || 'Nie podano'}
                            icon={<Phone size={17} />}
                        />
                        <SettingsRow
                            title="Stanowisko"
                            description={manager.position || 'Nie podano'}
                            icon={<BriefcaseBusiness size={17} />}
                        />
                    </div>
                    <div className={c.card}>
                        <header className={c.sectionHeading}>
                            <div className={c.sectionTitle}>
                                <ShieldCheck size={19} aria-hidden="true" />
                                <h2>Bezpieczeństwo</h2>
                            </div>
                            <p>
                                Zmiany zatwierdzisz jednorazowym linkiem z
                                poczty.
                            </p>
                        </header>
                        <SettingsRow
                            title="Zmień e-mail"
                            description="Potwierdzenie na obecny i nowy adres"
                            icon={<MailCheck size={17} />}
                            disabled={busy}
                            onClick={() => setEditing('email')}
                        />
                        <SettingsRow
                            title="Zmień hasło"
                            description="Aktualne hasło i potwierdzenie e-mail"
                            icon={<KeyRound size={17} />}
                            disabled={busy}
                            onClick={() => setEditing('password')}
                        />
                    </div>
                </div>
                {isTeam && (
                    <div className={c.calendar}>
                        <div className={c.card}>
                            <header className={c.sectionHeading}>
                                <h2>Moja przestrzeń</h2>
                                <p>
                                    Osobiste materiały dostępne zawsze pod ręką.
                                </p>
                            </header>
                            <SettingsRow
                                title="Moje notatki"
                                description="Pomysły, ustalenia i własne listy"
                                icon={<StickyNote size={17} />}
                                href="/main/notes"
                            />
                            <SettingsRow
                                title="Biblioteka dokumentów"
                                description="Pliki do spraw klientów i wiadomości"
                                icon={<Files size={17} />}
                                href="/main/documents"
                            />
                            <SettingsRow
                                title="Ostatnie logowanie"
                                description={
                                    manager.lastLoginAt
                                        ? new Intl.DateTimeFormat('pl-PL', {
                                              dateStyle: 'medium',
                                              timeStyle: 'short',
                                              timeZone: 'Europe/Warsaw',
                                          }).format(
                                              new Date(manager.lastLoginAt),
                                          )
                                        : 'Pierwsza sesja'
                                }
                                icon={<Clock3 size={17} />}
                            />
                        </div>
                        <div className={c.card}>
                            <header className={c.sectionHeading}>
                                <div className={c.sectionTitle}>
                                    <CalendarDays
                                        size={19}
                                        aria-hidden="true"
                                    />
                                    <h2>Kalendarz</h2>
                                </div>
                                <p>
                                    Twój plan pracy, przypomnienia i ważne
                                    terminy.
                                </p>
                            </header>
                            <SettingsRow
                                title="Wydarzenia i zadania"
                                description="Spotkania, prezentacje i zadania bez godziny"
                                icon={<CalendarRange size={17} />}
                                href="/main/calendar"
                            />
                            <SettingsRow
                                title="Przypomnienia"
                                description="Wszystko, o czym chcesz pamiętać"
                                icon={<Bell size={17} />}
                                href="/main/calendar/reminders"
                            />
                            <SettingsRow
                                title="Terminy"
                                description="Daty graniczne i zaległe sprawy"
                                icon={<Flag size={17} />}
                                href="/main/calendar/deadlines"
                            />
                            {isAdmin && (
                                <SettingsRow
                                    title="Typy wydarzeń"
                                    description="Ikony, kolory i czasy przypomnień"
                                    icon={<Shapes size={17} />}
                                    href="/main/management/calendar"
                                />
                            )}
                        </div>
                        <div className={c.card}>
                            <header className={c.sectionHeading}>
                                <h2>Powiadomienia</h2>
                            </header>
                            <div className={c.notifications}>
                                <span className={c.mailIcon} aria-hidden="true">
                                    {manager.remindersEnabled ? (
                                        <MailCheck size={20} />
                                    ) : (
                                        <MailX size={20} />
                                    )}
                                </span>
                                <div className={c.notificationContent}>
                                    <strong id="calendar-email-label">
                                        Powiadomienia e-mail z kalendarza
                                    </strong>
                                    <p id="calendar-email-description">
                                        Wydarzenia, przypomnienia, terminy i
                                        przypomnienia z etapów klientów.
                                    </p>
                                </div>
                                <Switch
                                    checked={manager.remindersEnabled}
                                    disabled={busy}
                                    aria-labelledby="calendar-email-label"
                                    aria-describedby="calendar-email-description"
                                    aria-busy={update.isPending}
                                    onChange={(enabled) => {
                                        void changeNotifications(enabled)
                                    }}
                                />
                            </div>
                            <div className={c.notificationStatus}>
                                {update.isPending ? (
                                    <p role="status">
                                        <LoaderCircle
                                            className={c.spinner}
                                            size={13}
                                            aria-hidden="true"
                                        />
                                        Zapisywanie ustawienia…
                                    </p>
                                ) : (
                                    <p
                                        role={
                                            notificationSaved
                                                ? 'status'
                                                : undefined
                                        }
                                    >
                                        {manager.remindersEnabled
                                            ? 'Włączone — przypomnienia przyjdą na Twój adres e-mail.'
                                            : 'Wyłączone — kalendarz działa, wiadomości nie są wysyłane.'}
                                    </p>
                                )}
                                {notificationError && (
                                    <p className={c.error} role="alert">
                                        {notificationError}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <footer className={c.footer}>
                <Button
                    className={c.logout}
                    disabled={update.isPending || formPending}
                    pending={logoutMutation.isPending}
                    onClick={() => logoutMutation.mutate()}
                >
                    <LogOut size={16} aria-hidden="true" />
                    {logoutMutation.isPending
                        ? 'Wylogowywanie…'
                        : 'Wyloguj się'}
                </Button>
                {logoutMutation.error && (
                    <p className={c.error} role="alert">
                        {authErrorMessage(logoutMutation.error, 'logout')}
                    </p>
                )}
            </footer>
            {editing && (
                <Popup
                    title={
                        editing === 'data'
                            ? 'Edytuj profil'
                            : editing === 'avatar'
                              ? 'Zmień zdjęcie'
                              : editing === 'email'
                                ? 'Zmień e-mail'
                                : 'Zmień hasło'
                    }
                    closeDisabled={formPending}
                    fallbackFocusRef={sectionRef}
                    onClose={() => setEditing(null)}
                >
                    {editing === 'data' ? (
                        <ProfileEditForm
                            manager={manager}
                            onPendingChange={setFormPending}
                            onSuccess={() => {
                                setEditing(null)

                                setFormPending(false)
                            }}
                            onCancel={() => setEditing(null)}
                        />
                    ) : editing === 'avatar' ? (
                        <ProfileAvatarForm
                            manager={manager}
                            onPendingChange={setFormPending}
                            onSuccess={() => {
                                setEditing(null)

                                setFormPending(false)
                            }}
                            onCancel={() => setEditing(null)}
                        />
                    ) : (
                        <ProfileSecurityForm
                            operation={editing}
                            email={manager.email}
                            onPendingChange={setFormPending}
                            onCancel={() => setEditing(null)}
                        />
                    )}
                </Popup>
            )}
        </section>
    )
}
