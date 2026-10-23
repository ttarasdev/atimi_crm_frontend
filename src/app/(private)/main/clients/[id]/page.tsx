import type { Metadata } from 'next'
import { ClientPage } from '@/features/clients/client-details/ClientPage'

export const metadata: Metadata = { title: 'Karta klienta' }

export default async function Page({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    const { id } = await params

    const query = await searchParams

    const positiveId = (value: string | string[] | undefined) => {
        const id =
            typeof value === 'string' && /^[1-9]\d*$/.test(value)
                ? Number(value)
                : 0

        return Number.isSafeInteger(id) && id > 0 && id <= 2147483647
            ? id
            : undefined
    }

    return (
        <ClientPage
            clientId={Number(id)}
            initialTab={
                query.tab === 'documents'
                    ? 'documents'
                    : query.tab === 'notes'
                      ? 'notes'
                      : 'details'
            }
            processId={positiveId(query.processId)}
            stageId={positiveId(query.stageId)}
            noteId={positiveId(query.noteId)}
            stageNoteId={positiveId(query.stageNoteId)}
        />
    )
}
