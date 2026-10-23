'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import type { CampaignFilters } from '@/api/mail-campaigns/mail-campaigns.types'
import { useCreateCampaign } from '@/shared/hooks/useMailCampaigns'
import { useSearchParams } from 'next/navigation'
import { useQueries } from '@tanstack/react-query'
import {
    CheckCircle2,
    FileText,
    Mail,
    Paperclip,
    X,
    BookmarkPlus,
    Pencil,
} from 'lucide-react'
import type { MailAccountId } from '@/api/mail/mail.types'
import type { ClientContact } from '@/api/client-records/client-records.types'
import { ApiError } from '@/api/api-error'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import { FormTextarea } from '@/components/form-components/form-textarea/FormTextarea'
import { MediaFileInput } from '@/components/form-components/media-file-input/MediaFileInput'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { Button } from '@/components/ui/button/Button'
import { Popup } from '@/components/ui/popup/Popup'
import { DocumentLibraryPicker } from '@/features/documents/document-library-picker/DocumentLibraryPicker'
import {
    useMailAccounts,
    useMailTemplates,
    useSendMail,
} from '@/shared/hooks/useMail'
import { useRoles } from '@/shared/hooks/useRoles'
import { useAuth } from '@/shared/hooks/useAuth'
import { useCompanySettings } from '@/shared/hooks/useCompanySettings'
import { useMailPresets, useMailPreset } from '@/shared/hooks/useMailPresets'
import { privateAssetQueryOptions } from '@/shared/query/private-assets-query'
import { MailPreview } from '../mail-preview/MailPreview'
import { MailTemplateCard } from '../mail-template-card/MailTemplateCard'
import { MailPresetForm } from '../mail-preset-form/MailPresetForm'
import { MailHistory } from '../MailHistory'
import c from './MailComposer.module.scss'

const allowedMimes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg',
    'image/webp',
]

function submissionTimestamp() {
    return Date.now()
}

export function MailComposer() {
    const { hasRole } = useRoles()

    if (!hasRole('admin') && !hasRole('manager') && !hasRole('sender'))
        return null

    return (
        <>
            {(hasRole('admin') || hasRole('sender')) && (
                <Link className={c.secondary} href="/main/mail/campaigns">
                    Rozsyłki do klientów
                </Link>
            )}
            <MailMessageComposer />
        </>
    )
}

export function MailMessageComposer({
    clientId,
    contacts = [],
    contactsPending = false,
    contactsError = false,
    onRetryContacts,
    onMoreContacts,
    onPendingChange,
    campaign,
}: {
    campaign?: {
        name: string
        filters: CampaignFilters
        scheduledAt?: string
        ready: boolean
        controls: ReactNode
        onCreated: () => void
    }
    clientId?: number
    contacts?: ClientContact[]
    contactsPending?: boolean
    contactsError?: boolean
    onRetryContacts?: () => void
    onMoreContacts?: () => void
    onPendingChange?: (pending: boolean) => void
}) {
    const params = useSearchParams()

    const accounts = useMailAccounts(clientId, Boolean(campaign))

    const templates = useMailTemplates(clientId, Boolean(campaign))

    const company = useCompanySettings()

    const presets = useMailPresets()

    const { manager } = useAuth()

    const [presetId, setPresetId] = useState<number | null>(() => {
        const id = Number(params.get('preset'))

        return Number.isSafeInteger(id) && id > 0 ? id : null
    })

    const presetDetail = useMailPreset(presetId)

    const [savingPreset, setSavingPreset] = useState<'new' | 'edit' | null>(
        null,
    )

    const [presetPending, setPresetPending] = useState(false)

    const [contactId, setContactId] = useState<number | null>(null)

    const [accountId, setAccountId] = useState<MailAccountId | null>(null)

    const [templateId, setTemplateId] = useState<string | null>(
        params.get('template'),
    )

    const [to, setTo] = useState('')

    const [customSubject, setCustomSubject] = useState<string | null>(null)

    const [customText, setCustomText] = useState<string | null>(null)

    const [files, setFiles] = useState<File[]>([])

    const [privateAssetIds, setPrivateAssetIds] = useState<number[]>([])

    const [error, setError] = useState<string>()

    const [sent, setSent] = useState(false)

    const controller = useRef<AbortController | null>(null)

    const send = useSendMail(clientId)

    const createCampaign = useCreateCampaign()

    const requestId = useRef<string | null>(null)

    const pending = send.isPending || createCampaign.isPending

    const presetRows = presets.data?.pages.flatMap((page) => page.rows) ?? []

    const selectedPreset =
        presetRows.find((preset) => preset.id === presetId) ?? presetDetail.data

    const presetOptions =
        selectedPreset &&
        !presetRows.some((preset) => preset.id === selectedPreset.id)
            ? [selectedPreset, ...presetRows]
            : presetRows

    const emailContacts = contacts.filter((contact) => contact.type === 'email')

    const recipient =
        emailContacts.find((contact) => contact.id === contactId) ??
        emailContacts.find((contact) => contact.isPrimary) ??
        emailContacts[0]

    const requestedTemplate =
        templateId === 'en' || templateId?.startsWith('en-')
            ? 'en'
            : templateId === 'ua' ||
                templateId === 'uk' ||
                templateId?.startsWith('ua-') ||
                templateId?.startsWith('uk-')
              ? 'ua'
              : 'pl'

    const selected =
        templates.data?.find((template) => template.id === requestedTemplate) ??
        templates.data?.find((template) => template.id === 'pl') ??
        templates.data?.[0]

    const availableAccounts = campaign
        ? accounts.data?.filter(
              (value) =>
                  value.id === 'default' &&
                  value.email.trim().toLowerCase() === 'app@atlantis.info.pl',
          )
        : accounts.data

    const account =
        availableAccounts?.find((value) => value.id === accountId) ??
        availableAccounts?.[0]

    const subject = customSubject ?? selectedPreset?.subject ?? ''

    const text = customText ?? selectedPreset?.text ?? ''

    const library = useQueries({
        queries: privateAssetIds.map((id) => privateAssetQueryOptions(id)),
    })

    const libraryPending = library.some((query) => query.isPending)

    const libraryFailed = library.some((query) => query.isError)

    const bytes =
        files.reduce((sum, file) => sum + file.size, 0) +
        library.reduce(
            (sum, query) => sum + Number(query.data?.sizeBytes ?? 0),
            0,
        )

    useEffect(() => () => controller.current?.abort(), [])

    useEffect(() => {
        onPendingChange?.(pending || presetPending)
    }, [pending, presetPending, onPendingChange])

    function addFile(file: File | null) {
        if (!file) return

        setError(undefined)

        if (files.length + privateAssetIds.length >= 10) {
            setError('Możesz dodać maksymalnie 10 załączników.')

            return
        }

        if (!allowedMimes.includes(file.type) || !file.size) {
            setError('Wybierz PDF, DOCX, XLSX, PNG, JPEG lub WebP.')

            return
        }

        if (bytes + file.size > 20 * 1024 * 1024) {
            setError(
                'Łączny rozmiar załączników może wynosić maksymalnie 20 MB.',
            )

            return
        }

        if (
            files.some(
                (value) =>
                    value.name === file.name &&
                    value.size === file.size &&
                    value.lastModified === file.lastModified,
            )
        ) {
            setError('Ten plik jest już dodany.')

            return
        }

        setFiles((current) => [...current, file])
    }

    async function submit(submittedAt: number) {
        if (controller.current || sent) return

        setError(undefined)

        if (
            !campaign &&
            (clientId !== undefined
                ? !recipient
                : !to.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim()))
        ) {
            setError('Podaj prawidłowy adres odbiorcy.')

            return
        }

        if (
            !subject.trim() ||
            subject.trim().length > 200 ||
            /[\r\n]/.test(subject)
        ) {
            setError('Temat musi mieć od 1 do 200 znaków.')

            return
        }

        if (!text.trim() || text.trim().length > 20000) {
            setError('Uzupełnij treść wiadomości (maksymalnie 20 000 znaków).')

            return
        }

        if (!account || !selected) {
            setError('Wybierz nadawcę i szablon wiadomości.')

            return
        }

        if (libraryPending || libraryFailed) {
            setError('Sprawdź dostępność wybranych dokumentów.')

            return
        }

        if (
            files.length + privateAssetIds.length > 10 ||
            bytes > 20 * 1024 * 1024
        ) {
            setError('Załączniki: maksymalnie 10 plików i 20 MB łącznie.')

            return
        }

        if (campaign && (!campaign.ready || !campaign.name.trim())) {
            setError('Wpisz nazwę rozsyłki i sprawdź listę odbiorców.')

            return
        }

        if (
            !requestId.current &&
            campaign?.scheduledAt &&
            Date.parse(campaign.scheduledAt) <= submittedAt
        ) {
            setError('Wybierz prawidłowy termin wysyłki w przyszłości.')

            return
        }

        controller.current = new AbortController()

        try {
            if (campaign) {
                requestId.current ??= crypto.randomUUID()

                await createCampaign.mutateAsync({
                    dto: {
                        requestId: requestId.current,
                        name: campaign.name.trim(),
                        filters: campaign.filters,
                        scheduledAt: campaign.scheduledAt,
                        subject: subject.trim(),
                        text: text.trim(),
                        account: account.id,
                        template: selected.id,
                        privateAssetIds,
                    },
                    signal: controller.current.signal,
                })

                campaign.onCreated()

                return
            }

            await send.mutateAsync({
                dto: {
                    ...(clientId !== undefined && recipient
                        ? { contactId: recipient.id }
                        : { to: to.trim() }),
                    subject: subject.trim(),
                    text: text.trim(),
                    account: account.id,
                    template: selected.id,
                    privateAssetIds,
                },
                files,
                signal: controller.current.signal,
            })

            setSent(true)
        } catch (failure) {
            if (
                campaign &&
                failure instanceof ApiError &&
                failure.status >= 400 &&
                failure.status < 500 &&
                failure.status !== 409
            )
                requestId.current = null

            if (!controller.current?.signal.aborted)
                setError(
                    campaign
                        ? failure instanceof ApiError && failure.status === 409
                            ? 'Sprawdź listę rozsyłek — wcześniejsza próba mogła już zostać zapisana.'
                            : 'Nie udało się zapisać rozsyłki. Sprawdź odbiorców, termin i załączniki. Treść została zachowana.'
                        : failure instanceof ApiError && failure.status === 400
                          ? 'Sprawdź adres odbiorcy i załączniki. Wiadomość nie została wysłana.'
                          : 'Nie udało się wysłać wiadomości. Treść i załączniki zostały zachowane. Spróbuj ponownie.',
                )
        } finally {
            controller.current = null
        }
    }

    function reset() {
        setTo('')

        setCustomSubject(null)

        setCustomText(null)

        setPresetId(null)

        setFiles([])

        setPrivateAssetIds([])

        setSent(false)

        setError(undefined)
    }

    if (accounts.isPending || templates.isPending)
        return <p className={c.state}>Wczytywanie poczty…</p>

    if (accounts.isError || templates.isError)
        return (
            <div className={c.state} role="alert">
                <p>Nie udało się wczytać nadawców i szablonów.</p>
                <Button
                    onClick={() => {
                        void accounts.refetch()

                        void templates.refetch()
                    }}
                >
                    Spróbuj ponownie
                </Button>
            </div>
        )

    if (!account || !selected)
        return (
            <p className={c.state}>
                {campaign
                    ? 'Rozsyłki wymagają skonfigurowanej skrzynki app@atlantis.info.pl.'
                    : 'Skonfiguruj konto nadawcy, aby wysłać wiadomość.'}
            </p>
        )

    return (
        <section className={c.page} aria-label="Poczta">
            {clientId === undefined && !campaign && (
                <header className={c.header}>
                    <div>
                        <h2>
                            <Mail size={20} aria-hidden="true" />
                            Napisz wiadomość
                        </h2>
                        <p>
                            Wybierz język wiadomości i dodaj materiały z
                            komputera lub swojej biblioteki.
                        </p>
                    </div>
                    <span className={c.admin}>Poczta zespołu</span>
                </header>
            )}
            {sent ? (
                <div className={c.success} role="status">
                    <CheckCircle2 size={32} aria-hidden="true" />
                    <div>
                        <strong>Wiadomość wysłana</strong>
                        <p>
                            Do:{' '}
                            {clientId !== undefined
                                ? recipient?.value
                                : to.trim()}{' '}
                            · {subject.trim()}
                        </p>
                    </div>
                    <Button className={c.primary} onClick={reset}>
                        Napisz kolejną
                    </Button>
                </div>
            ) : (
                <>
                    <div className={c.templates} aria-label="Język wiadomości">
                        {templates.data.map((template) => (
                            <MailTemplateCard
                                key={template.id}
                                template={template}
                                compact
                                companyName={company.data?.name}
                                selected={template.id === selected.id}
                                disabled={pending}
                                onChoose={() => setTemplateId(template.id)}
                            />
                        ))}
                    </div>
                    <div className={c.columns}>
                        <div className={c.form}>
                            <FormContainer
                                aria-label="Wysyłanie wiadomości"
                                submitTitle={
                                    campaign
                                        ? campaign.scheduledAt
                                            ? 'Zaplanuj rozsyłkę'
                                            : 'Uruchom rozsyłkę'
                                        : 'Wyślij wiadomość'
                                }
                                pendingTitle={
                                    campaign ? 'Zapisywanie…' : 'Wysyłanie…'
                                }
                                isPending={pending}
                                submitDisabled={
                                    (campaign && !campaign.ready) ||
                                    libraryPending ||
                                    libraryFailed ||
                                    (clientId !== undefined &&
                                        (!recipient ||
                                            contactsPending ||
                                            contactsError)) ||
                                    bytes > 20 * 1024 * 1024
                                }
                                error={error}
                                onSubmit={() =>
                                    void submit(submissionTimestamp())
                                }
                            >
                                {campaign?.controls}
                                <FormSelect
                                    selectTitle="Nadawca"
                                    value={account.id}
                                    onChange={(value) => setAccountId(value)}
                                    options={(availableAccounts ?? []).map(
                                        (value) => ({
                                            value: value.id,
                                            title: `${value.name} · ${value.email}`,
                                        }),
                                    )}
                                />
                                {campaign ? null : clientId !== undefined ? (
                                    <div className={c.recipient}>
                                        <FormSelect<number | null>
                                            selectTitle="Adres odbiorcy"
                                            value={recipient?.id ?? null}
                                            onChange={setContactId}
                                            options={emailContacts.map(
                                                (contact) => ({
                                                    value: contact.id,
                                                    title: `${contact.value}${contact.label ? ` · ${contact.label}` : ''}`,
                                                }),
                                            )}
                                            disabled={
                                                contactsPending ||
                                                contactsError ||
                                                !emailContacts.length
                                            }
                                            hint="Adres z kontaktów tego klienta."
                                        />
                                        {contactsPending && (
                                            <p className={c.hint}>
                                                Wczytywanie kontaktów…
                                            </p>
                                        )}
                                        {contactsError && (
                                            <Button
                                                type="button"
                                                onClick={onRetryContacts}
                                            >
                                                Wczytaj kontakty ponownie
                                            </Button>
                                        )}
                                        {!contactsPending &&
                                            !contactsError &&
                                            !emailContacts.length && (
                                                <p className={c.hint}>
                                                    Dodaj adres e-mail w
                                                    kontaktach klienta, aby
                                                    wysłać wiadomość.
                                                </p>
                                            )}
                                        {onMoreContacts && (
                                            <Button
                                                type="button"
                                                onClick={onMoreContacts}
                                            >
                                                Wczytaj kolejne kontakty
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <TextInput
                                        inputTitle="Adres odbiorcy"
                                        name="to"
                                        type="email"
                                        autoComplete="email"
                                        value={to}
                                        onChange={setTo}
                                        maxLength={254}
                                        required
                                    />
                                )}
                                <div className={c.presetBlock}>
                                    <FormSelect<number | null>
                                        selectTitle="Zapisana wiadomość"
                                        value={presetId}
                                        onChange={(id) => {
                                            setPresetId(id)

                                            const preset = presetOptions.find(
                                                (row) => row.id === id,
                                            )

                                            if (preset) {
                                                setCustomSubject(preset.subject)

                                                setCustomText(preset.text)
                                            }
                                        }}
                                        options={[
                                            {
                                                value: null,
                                                title: 'Własna wiadomość',
                                            },
                                            ...presetOptions.map((preset) => ({
                                                value: preset.id,
                                                title: `${preset.name} · ${preset.managerId === null ? 'Firmowy' : 'Mój'}`,
                                            })),
                                        ]}
                                        disabled={presets.isPending}
                                        hint="Wybór uzupełnia temat i treść. Możesz je potem zmienić."
                                    />
                                    {presets.isError && (
                                        <Button
                                            type="button"
                                            onClick={() =>
                                                void presets.refetch()
                                            }
                                        >
                                            Wczytaj zapisane wiadomości ponownie
                                        </Button>
                                    )}
                                    {presets.hasNextPage && (
                                        <Button
                                            type="button"
                                            disabled={
                                                presets.isFetchingNextPage
                                            }
                                            onClick={() =>
                                                void presets.fetchNextPage()
                                            }
                                        >
                                            Więcej zapisanych wiadomości
                                        </Button>
                                    )}
                                </div>
                                <TextInput
                                    inputTitle="Temat"
                                    name="subject"
                                    value={subject}
                                    onChange={setCustomSubject}
                                    maxLength={200}
                                    required
                                />
                                <FormTextarea
                                    inputTitle="Treść wiadomości"
                                    name="text"
                                    value={text}
                                    onChange={setCustomText}
                                    maxLength={20000}
                                    rows={8}
                                    required
                                />
                                <div className={c.presetActions}>
                                    <Button
                                        type="button"
                                        className={c.secondary}
                                        disabled={
                                            !subject.trim() || !text.trim()
                                        }
                                        onClick={() => setSavingPreset('new')}
                                    >
                                        <BookmarkPlus size={14} aria-hidden />
                                        Zapisz jako mój szablon
                                    </Button>
                                    {selectedPreset &&
                                        selectedPreset.managerId ===
                                            manager?.id && (
                                            <Button
                                                type="button"
                                                className={c.secondary}
                                                onClick={() =>
                                                    setSavingPreset('edit')
                                                }
                                            >
                                                <Pencil size={14} aria-hidden />
                                                Edytuj mój szablon
                                            </Button>
                                        )}
                                </div>
                                <div className={c.attachmentHeading}>
                                    <Paperclip size={16} aria-hidden="true" />
                                    <strong>Załączniki</strong>
                                    <span>
                                        {files.length + privateAssetIds.length}
                                        /10 · {(bytes / 1024 / 1024).toFixed(
                                            1,
                                        )}{' '}
                                        MB
                                    </span>
                                </div>
                                {!campaign && (
                                    <MediaFileInput
                                        inputTitle="Dodaj plik z komputera"
                                        value={null}
                                        setFile={addFile}
                                        disabled={
                                            files.length +
                                                privateAssetIds.length >=
                                            10
                                        }
                                        accept={allowedMimes.join(',')}
                                        hint="PDF, DOCX, XLSX lub obraz. Maksymalnie 10 plików i 20 MB łącznie."
                                    />
                                )}
                                {files.length > 0 && (
                                    <ul
                                        className={c.files}
                                        aria-label="Pliki z komputera"
                                    >
                                        {files.map((file, index) => (
                                            <li
                                                key={`${file.name}-${file.lastModified}-${index}`}
                                            >
                                                <FileText
                                                    size={16}
                                                    aria-hidden="true"
                                                />
                                                <span>
                                                    <strong>{file.name}</strong>
                                                    <small>
                                                        {(
                                                            file.size / 1024
                                                        ).toFixed(0)}{' '}
                                                        KB
                                                    </small>
                                                </span>
                                                <Button
                                                    type="button"
                                                    className={c.remove}
                                                    onClick={() =>
                                                        setFiles((current) =>
                                                            current.filter(
                                                                (_, i) =>
                                                                    i !== index,
                                                            ),
                                                        )
                                                    }
                                                    aria-label={`Usuń załącznik ${file.name}`}
                                                >
                                                    <X
                                                        size={15}
                                                        aria-hidden="true"
                                                    />
                                                </Button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <DocumentLibraryPicker
                                    selectedIds={privateAssetIds}
                                    onChange={setPrivateAssetIds}
                                    ownOnly
                                    maxFiles={10 - files.length}
                                    disabled={pending}
                                />
                                {libraryFailed && (
                                    <p
                                        className={c.attachmentError}
                                        role="alert"
                                    >
                                        Co najmniej jeden dokument jest
                                        niedostępny. Odłącz go i wybierz
                                        ponownie.
                                    </p>
                                )}
                                {bytes > 20 * 1024 * 1024 && (
                                    <p
                                        className={c.attachmentError}
                                        role="alert"
                                    >
                                        Załączniki przekraczają limit 20 MB.
                                        Usuń część plików.
                                    </p>
                                )}
                                <p className={c.hint}>
                                    Zmiana wyglądu szablonu zachowuje wpisaną
                                    treść. Historię wysyłania znajdziesz
                                    poniżej.
                                </p>
                            </FormContainer>
                        </div>
                        <MailPreview
                            clientId={clientId}
                            campaigns={Boolean(campaign)}
                            dto={{
                                ...(campaign ? { account: account.id } : {}),
                                subject: subject.trim()
                                    ? subject
                                    : selected.previewSubject,
                                text: text.trim() ? text : selected.previewText,
                                template: selected.id,
                            }}
                        />
                    </div>
                </>
            )}
            {!campaign && <MailHistory clientId={clientId} />}
            {savingPreset && (
                <Popup
                    title={
                        savingPreset === 'edit'
                            ? 'Edytuj mój szablon'
                            : 'Zapisz mój szablon'
                    }
                    onClose={() => setSavingPreset(null)}
                    closeDisabled={presetPending}
                >
                    <MailPresetForm
                        preset={
                            savingPreset === 'edit' ? selectedPreset : undefined
                        }
                        initialSubject={subject}
                        initialText={text}
                        onPendingChange={setPresetPending}
                        onCancel={() => setSavingPreset(null)}
                        onSaved={(preset) => {
                            setPresetId(preset.id)

                            setSavingPreset(null)
                        }}
                    />
                </Popup>
            )}
        </section>
    )
}
