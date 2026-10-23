'use client'

import { useEffect, useRef, useState } from 'react'
import {
    Archive,
    FileText,
    Pencil,
    RotateCcw,
    WandSparkles,
} from 'lucide-react'
import type { DocumentTemplate } from '@/api/document-templates/document-templates.types'
import type { PrivateAsset } from '@/api/private-assets/private-assets.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { Button } from '@/components/ui/button/Button'
import { useClientSubmit } from '@/features/clients/useClientSubmit'
import { DocumentDownloadButton } from '@/features/documents/document-download-button/DocumentDownloadButton'
import {
    useDocumentTemplate,
    useDocumentFields,
    useDocumentTemplateVariables,
    useUpdateDocumentTemplate,
} from '@/shared/hooks/useDocumentTemplates'
import { DocumentTemplateForm } from '../document-template-form/DocumentTemplateForm'
import { GenerateDocumentForm } from '../generate-document-form/GenerateDocumentForm'
import { documentVariableGroups } from '../DocumentVariablesCatalog'
import c from '../DocumentTemplates.module.scss'

export function DocumentTemplateDetails({
    template,
    isAdmin,
    onChange,
    onGenerated,
    onPendingChange,
}: {
    template: DocumentTemplate
    isAdmin: boolean
    onChange: (template: DocumentTemplate) => void
    onGenerated: (asset: PrivateAsset, clientId: number | null) => void
    onPendingChange: (pending: boolean) => void
}) {
    const [editor, setEditor] = useState<
        'edit' | 'archive' | 'generate' | null
    >(null)

    const view = useRef<HTMLDivElement>(null)

    const returnFocus = useRef(false)

    const query = useDocumentTemplate(template.id)

    const variables = useDocumentTemplateVariables()

    const fields = useDocumentFields()

    const update = useUpdateDocumentTemplate()

    const submit = useClientSubmit(onPendingChange)

    const current = query.data ?? template

    useEffect(() => {
        if (editor)
            view.current
                ?.querySelector<HTMLElement>(
                    'input:not([disabled]), textarea:not([disabled]), button:not([disabled])',
                )
                ?.focus({ preventScroll: true })
        else if (returnFocus.current) {
            view.current?.focus({ preventScroll: true })

            returnFocus.current = false
        }
    }, [editor])

    function closeEditor() {
        onPendingChange(false)

        submit.setError(undefined)

        returnFocus.current = true

        setEditor(null)
    }

    if (editor === 'edit')
        return (
            <div ref={view}>
                <DocumentTemplateForm
                    template={current}
                    onPendingChange={onPendingChange}
                    onCancel={closeEditor}
                    onSuccess={(saved) => {
                        onChange(saved)

                        closeEditor()
                    }}
                />
            </div>
        )

    if (editor === 'generate')
        return (
            <div ref={view}>
                <GenerateDocumentForm
                    template={current}
                    onPendingChange={onPendingChange}
                    onCancel={closeEditor}
                    onSuccess={onGenerated}
                />
            </div>
        )

    if (editor === 'archive')
        return (
            <div ref={view}>
                <FormContainer
                    aria-label="Archiwizacja szablonu dokumentu"
                    submitTitle="Archiwizuj"
                    isPending={submit.pending}
                    error={submit.error}
                    onCancel={closeEditor}
                    onSubmit={() =>
                        void submit.run(async (signal) => {
                            const saved = await update.mutateAsync({
                                id: current.id,
                                dto: { isActive: false },
                                signal,
                            })

                            if (!signal.aborted) {
                                onChange(saved)

                                closeEditor()
                            }
                        })
                    }
                >
                    <p className={c.hint}>
                        Archiwizować szablon „{current.name}”? Nie będzie można
                        generować z niego nowych dokumentów. Plik szablonu i
                        wcześniej wygenerowane dokumenty pozostaną bez zmian.
                    </p>
                </FormContainer>
            </div>
        )

    return (
        <div ref={view} tabIndex={-1} className={c.details}>
            {query.isPending && (
                <p role="status" className={c.hint}>
                    Wczytywanie szablonu…
                </p>
            )}
            {query.isError && (
                <div role="alert" className={c.error}>
                    <p>Nie udało się odświeżyć szablonu.</p>
                    <Button
                        type="button"
                        pending={query.isFetching}
                        onClick={() => void query.refetch()}
                    >
                        Spróbuj ponownie
                    </Button>
                </div>
            )}
            <div className={c.summary}>
                <span className={c.fileIcon}>
                    <FileText size={26} aria-hidden="true" />
                </span>
                <div>
                    <strong>{current.name}</strong>
                    <small>
                        {current.isActive ? 'Aktywny szablon' : 'Archiwum'} ·
                        DOCX
                    </small>
                </div>
            </div>
            {current.type && (
                <p className={c.hint}>
                    Rodzaj: {current.type.name}
                    {!current.type.isActive &&
                        ' · Rodzaj w archiwum — generowanie wyłączone'}
                </p>
            )}
            {current.description && (
                <p className={c.description}>{current.description}</p>
            )}
            {current.asset && (
                <div className={c.source}>
                    <span>{current.asset.originalName}</span>
                    <DocumentDownloadButton
                        id={current.privateAssetId}
                        filename={current.asset.originalName}
                        compact
                    />
                </div>
            )}
            <div className={c.fieldList}>
                <h3>Pola w dokumencie</h3>
                {!current.fields.length && (
                    <p className={c.hint}>
                        Szablon nie zawiera pól do uzupełnienia.
                    </p>
                )}
                {Object.entries(documentVariableGroups).map(
                    ([group, title]) => {
                        const rows = current.fields.filter((key) => {
                            const system = variables.data?.find(
                                (field) => field.key === key,
                            )

                            return system
                                ? (system.group ?? 'client') === group
                                : group === 'custom'
                        })

                        return (
                            rows.length > 0 && (
                                <section
                                    key={group}
                                    className={c.fieldList}
                                    aria-label={`Pola szablonu: ${title}`}
                                >
                                    <h3>{title}</h3>
                                    {rows.map((key) => (
                                        <span key={key}>
                                            <code>{`{${key}}`}</code>
                                            <small>
                                                {variables.data?.find(
                                                    (field) =>
                                                        field.key === key,
                                                )?.label ??
                                                    fields.data?.find(
                                                        (field) =>
                                                            field.key === key,
                                                    )?.label ??
                                                    key}{' '}
                                                · {title}
                                            </small>
                                        </span>
                                    ))}
                                </section>
                            )
                        )
                    },
                )}
            </div>
            {variables.isError && (
                <div role="alert" className={c.error}>
                    <p>Nie udało się wczytać opisu pól.</p>
                    <Button
                        type="button"
                        pending={variables.isFetching}
                        onClick={() => void variables.refetch()}
                    >
                        Spróbuj ponownie
                    </Button>
                </div>
            )}
            {!current.isActive && (
                <p className={c.hint}>
                    Ten szablon jest w archiwum. Administrator może go
                    przywrócić.
                </p>
            )}
            <div className={c.actions}>
                <Button
                    type="button"
                    disabled={
                        !current.isActive ||
                        current.type?.isActive === false ||
                        query.isPending ||
                        query.isError ||
                        submit.pending
                    }
                    onClick={() => setEditor('generate')}
                >
                    <WandSparkles size={16} aria-hidden="true" />
                    Generuj dokument
                </Button>
                {isAdmin && (
                    <>
                        <Button
                            type="button"
                            disabled={submit.pending || query.isPending}
                            onClick={() => setEditor('edit')}
                        >
                            <Pencil size={15} aria-hidden="true" />
                            Edytuj szablon
                        </Button>
                        <Button
                            type="button"
                            pending={submit.pending}
                            disabled={query.isPending}
                            onClick={() => {
                                submit.setError(undefined)

                                if (current.isActive) setEditor('archive')
                                else
                                    void submit.run(async (signal) => {
                                        const saved = await update.mutateAsync({
                                            id: current.id,
                                            dto: { isActive: true },
                                            signal,
                                        })

                                        if (!signal.aborted) onChange(saved)
                                    })
                            }}
                        >
                            {current.isActive ? (
                                <Archive size={15} aria-hidden="true" />
                            ) : (
                                <RotateCcw size={15} aria-hidden="true" />
                            )}
                            {current.isActive
                                ? 'Archiwizuj szablon'
                                : 'Przywróć szablon'}
                        </Button>
                    </>
                )}
            </div>
            {submit.error && (
                <p role="alert" className={c.error}>
                    {submit.error}
                </p>
            )}
        </div>
    )
}
