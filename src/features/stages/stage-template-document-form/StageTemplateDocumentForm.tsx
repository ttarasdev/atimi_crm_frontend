'use client'

import { PrivateBucket } from '@/api/private-assets/private-assets.types'
import type { StageTemplateDocument } from '@/api/stage-template-documents/stage-template-documents.types'
import { ClientDocumentForm } from '@/features/clients/client-records/ClientDocumentForm'
import {
    useCreateStageTemplateDocument,
    useUpdateStageTemplateDocument,
} from '@/shared/hooks/useStageTemplateContent'

const libraryBuckets = [PrivateBucket.CLIENT_DOCUMENTS]

export function StageTemplateDocumentForm({
    templateId,
    document,
    onSuccess,
    onCancel,
    onPendingChange,
}: {
    templateId: number
    document?: StageTemplateDocument
    onSuccess: () => void
    onCancel: () => void
    onPendingChange: (pending: boolean) => void
}) {
    const create = useCreateStageTemplateDocument()

    const update = useUpdateStageTemplateDocument()

    return (
        <ClientDocumentForm
            document={document}
            withCategory={false}
            fixedVisibility="team"
            libraryBuckets={libraryBuckets}
            libraryVisibility="team"
            fileInputTitle="Plik dokumentu"
            hint="Dokument szablonu jest dostępny dla całego zespołu. Przy dodaniu etapu kopiuje się powiązanie z plikiem. Odłączenie z szablonu nie usuwa pliku ani dokumentów w sprawach klientów."
            onPendingChange={onPendingChange}
            onCancel={onCancel}
            onSaved={onSuccess}
            onSave={(dto, signal) =>
                document
                    ? update.mutateAsync({
                          templateId,
                          id: document.id,
                          dto: { title: dto.title },
                          signal,
                      })
                    : create.mutateAsync({
                          templateId,
                          dto: {
                              title: dto.title,
                              privateAssetId: dto.privateAssetId,
                          },
                          signal,
                      })
            }
        />
    )
}
