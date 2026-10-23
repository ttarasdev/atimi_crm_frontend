import type { Metadata } from 'next'
import { NotesBoard } from '@/features/notes/notes-board/NotesBoard'

export const metadata: Metadata = { title: 'Notatki' }

export default async function Page({
    searchParams,
}: {
    searchParams: Promise<{ noteId?: string | string[] }>
}) {
    const { noteId } = await searchParams

    const id =
        typeof noteId === 'string' &&
        /^[1-9]\d*$/.test(noteId) &&
        Number(noteId) <= 2147483647
            ? Number(noteId)
            : undefined

    return <NotesBoard key={id ?? 'list'} initialNoteId={id} />
}
