'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Mail, Plus, FileText } from 'lucide-react'
import type { MailPreset, MailTemplate } from '@/api/mail/mail.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { ActionMenu } from '@/components/ui/action-menu/ActionMenu'
import { Button } from '@/components/ui/button/Button'
import { Popup } from '@/components/ui/popup/Popup'
import { useMailTemplates } from '@/shared/hooks/useMail'
import {
    useMailPresets,
    useDeleteMailPreset,
} from '@/shared/hooks/useMailPresets'
import { useCompanySettings } from '@/shared/hooks/useCompanySettings'
import { useRoles } from '@/shared/hooks/useRoles'
import { MailTemplateCard } from '../mail-template-card/MailTemplateCard'
import { MailPreview } from '../mail-preview/MailPreview'
import { MailPresetForm } from '../mail-preset-form/MailPresetForm'
import c from './MailTemplateLibrary.module.scss'

export function MailTemplateLibrary() {
    const { hasRole } = useRoles()

    if (!hasRole('admin')) return null

    return <Library />
}

function Library() {
    const templates = useMailTemplates()

    const company = useCompanySettings()

    const [search, setSearch] = useState('')

    const presets = useMailPresets({
        scope: 'shared',
        search: search.trim() || undefined,
    })

    const remove = useDeleteMailPreset()

    const [selected, setSelected] = useState<MailTemplate | null>(null)

    const [editing, setEditing] = useState<MailPreset | 'new' | null>(null)

    const [deleting, setDeleting] = useState<MailPreset | null>(null)

    const [pending, setPending] = useState(false)

    const [error, setError] = useState<string>()

    const rows = presets.data?.pages.flatMap((page) => page.rows) ?? []

    async function deletePreset() {
        if (!deleting || remove.isPending) return

        setError(undefined)

        try {
            await remove.mutateAsync({ id: deleting.id })

            setDeleting(null)
        } catch {
            setError('Nie udało się usunąć szablonu. Spróbuj ponownie.')
        }
    }

    return (
        <section className={c.page} aria-label="Szablony e-mail">
            <header className={c.header}>
                <div>
                    <h2>
                        <Mail size={19} aria-hidden />
                        Szablony wiadomości
                    </h2>
                    <p>
                        Firmowe treści dla całego zespołu i jeden klasyczny
                        wygląd wiadomości w trzech językach.
                    </p>
                </div>
                <Button className={c.compose} onClick={() => setEditing('new')}>
                    <Plus size={15} aria-hidden />
                    Dodaj szablon
                </Button>
            </header>
            <div className={c.sectionHeading}>
                <h3>Zapisane wiadomości</h3>
                <span>{presets.data?.pages[0]?.total ?? 0}</span>
            </div>
            <TextInput
                inputTitle="Szukaj szablonu"
                type="search"
                value={search}
                onChange={setSearch}
                placeholder="Nazwa, temat lub treść"
                maxLength={100}
            />
            {presets.isPending ? (
                <p className={c.state}>Wczytywanie zapisanych wiadomości…</p>
            ) : presets.isError ? (
                <div className={c.state} role="alert">
                    <p>Nie udało się wczytać zapisanych wiadomości.</p>
                    <Button onClick={() => void presets.refetch()}>
                        Spróbuj ponownie
                    </Button>
                </div>
            ) : !rows.length ? (
                <p className={c.state}>
                    {search
                        ? 'Brak pasujących szablonów.'
                        : 'Dodaj pierwszą wiadomość dla zespołu.'}
                </p>
            ) : (
                <div className={c.presetGrid}>
                    {rows.map((preset) => (
                        <article className={c.preset} key={preset.id}>
                            <header>
                                <span className={c.presetIcon}>
                                    <FileText size={18} aria-hidden />
                                </span>
                                <h4>{preset.name}</h4>
                                <ActionMenu
                                    label={`Opcje szablonu ${preset.name}`}
                                    items={[
                                        {
                                            label: 'Edytuj',
                                            onSelect: () => setEditing(preset),
                                        },
                                        {
                                            label: 'Usuń',
                                            danger: true,
                                            onSelect: () => {
                                                setError(undefined)

                                                setDeleting(preset)
                                            },
                                        },
                                    ]}
                                />
                            </header>
                            <strong>{preset.subject}</strong>
                            <p>{preset.text}</p>
                            <Link
                                className={c.use}
                                href={`/main/mail?preset=${preset.id}`}
                            >
                                Użyj wiadomości
                            </Link>
                        </article>
                    ))}
                </div>
            )}
            {presets.hasNextPage && (
                <Button
                    onClick={() => void presets.fetchNextPage()}
                    disabled={presets.isFetchingNextPage}
                >
                    Wczytaj więcej
                </Button>
            )}
            <div className={c.sectionHeading}>
                <h3>Język wiadomości</h3>
                <Link href="/main/company">Dane firmy</Link>
            </div>
            <p className={c.hint}>
                Logo i kontakty są pobierane z danych firmy. Własną treść
                uzupełnisz przed wysłaniem.
            </p>
            {templates.isPending ? (
                <p className={c.state}>Wczytywanie języków…</p>
            ) : templates.isError ? (
                <div className={c.state} role="alert">
                    <p>Nie udało się wczytać języków.</p>
                    <Button onClick={() => void templates.refetch()}>
                        Spróbuj ponownie
                    </Button>
                </div>
            ) : (
                <div className={c.grid}>
                    {templates.data.map((template) => (
                        <MailTemplateCard
                            key={template.id}
                            template={template}
                            companyName={company.data?.name}
                            onChoose={() => setSelected(template)}
                            onPreview={() => setSelected(template)}
                        />
                    ))}
                </div>
            )}
            {selected && (
                <Popup
                    title={selected.name}
                    size="wide"
                    onClose={() => setSelected(null)}
                    footer={
                        <Link
                            className={c.compose}
                            href={`/main/mail?template=${selected.id}`}
                        >
                            Użyj tego języka
                        </Link>
                    }
                >
                    <MailPreview
                        dto={{
                            subject: selected.previewSubject,
                            text: selected.previewText,
                            template: selected.id,
                        }}
                    />
                </Popup>
            )}
            {editing && (
                <Popup
                    title={
                        editing === 'new'
                            ? 'Nowy szablon wiadomości'
                            : 'Edytuj szablon wiadomości'
                    }
                    onClose={() => setEditing(null)}
                    closeDisabled={pending}
                >
                    <MailPresetForm
                        preset={editing === 'new' ? undefined : editing}
                        scope="shared"
                        onPendingChange={setPending}
                        onCancel={() => setEditing(null)}
                        onSaved={() => setEditing(null)}
                    />
                </Popup>
            )}
            {deleting && (
                <Popup
                    title="Usuń szablon wiadomości"
                    onClose={() => setDeleting(null)}
                    closeDisabled={remove.isPending}
                >
                    <FormContainer
                        onSubmit={() => void deletePreset()}
                        onCancel={() => setDeleting(null)}
                        submitTitle="Usuń szablon"
                        isPending={remove.isPending}
                        error={error}
                    >
                        <p className={c.hint}>
                            Usunąć „{deleting.name}”? Treść już przygotowanych
                            wiadomości pozostanie bez zmian.
                        </p>
                    </FormContainer>
                </Popup>
            )}
        </section>
    )
}
