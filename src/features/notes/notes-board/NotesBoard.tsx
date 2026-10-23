'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pin, Pencil, Trash2, StickyNote } from 'lucide-react'
import type { ManagerNote } from '@/api/manager-notes/manager-notes.types'
import { Button } from '@/components/ui/button/Button'
import { Popup } from '@/components/ui/popup/Popup'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { RichTextContent } from '@/components/form-components/rich-text-input/RichTextContent'
import {
    useDeleteManagerNote,
    useInfiniteManagerNotes,
    useManagerNote,
    useUpdateManagerNote,
} from '@/shared/hooks/useManagerNotes'
import { NoteForm } from '../note-form/NoteForm'
import c from './NotesBoard.module.scss'

export function NotesBoard({ initialNoteId }: { initialNoteId?: number }) {
    const router = useRouter()

    const [targetOpen, setTargetOpen] = useState(initialNoteId !== undefined)

    const target = useManagerNote(targetOpen ? (initialNoteId ?? null) : null)

    const [search, setSearch] = useState('')

    const [pinnedOnly, setPinnedOnly] = useState(false)

    const [localSelected, setSelected] = useState<ManagerNote | null>(null)

    const selected =
        localSelected ?? (targetOpen && !target.isError ? target.data : null)

    const [editing, setEditing] = useState(false)

    const [creating, setCreating] = useState(false)

    const [deleting, setDeleting] = useState<ManagerNote | null>(null)

    const [pending, setPending] = useState(false)

    const notes = useInfiniteManagerNotes({
        search: search.trim() || undefined,
        isPinned: pinnedOnly ? true : undefined,
    })

    const update = useUpdateManagerNote()

    const remove = useDeleteManagerNote()

    const rows = notes.data?.pages.flatMap((page) => page.rows) ?? []

    const total = notes.data?.pages[0]?.total ?? 0

    function close() {
        if (!pending) {
            setSelected(null)

            setTargetOpen(false)

            setCreating(false)

            setEditing(false)

            if (initialNoteId) router.replace('/main/notes', { scroll: false })
        }
    }

    return (
        <section className={c.section} aria-label="Moje notatki">
            <header className={c.header}>
                <div>
                    <span className={c.eyebrow}>Twoja przestrzeń</span>
                    <h1>Notatki</h1>
                    <p>
                        Pomysły, ustalenia i rzeczy, które chcesz mieć pod ręką.
                    </p>
                </div>
                <Button type="button" onClick={() => setCreating(true)}>
                    <Plus size={17} aria-hidden="true" />
                    Dodaj notatkę
                </Button>
            </header>
            <div className={c.filters}>
                <TextInput
                    inputTitle="Szukaj notatki"
                    type="search"
                    value={search}
                    onChange={setSearch}
                />
                <button
                    type="button"
                    className={c.filter}
                    aria-pressed={pinnedOnly}
                    onClick={() => setPinnedOnly(!pinnedOnly)}
                >
                    <Pin size={15} aria-hidden="true" />
                    Przypięte
                </button>
                <span>{total} notatek</span>
            </div>
            {notes.isPending && (
                <p role="status" className={c.state}>
                    Wczytywanie notatek…
                </p>
            )}
            {notes.isError && (
                <div role="alert" className={c.state}>
                    <p>Nie udało się wczytać notatek.</p>
                    <Button type="button" onClick={() => void notes.refetch()}>
                        Spróbuj ponownie
                    </Button>
                </div>
            )}
            {!notes.isPending && !notes.isError && !rows.length && (
                <div className={c.state}>
                    <StickyNote size={30} aria-hidden="true" />
                    <h2>
                        {search || pinnedOnly
                            ? 'Brak pasujących notatek'
                            : 'Zapisz pierwszą myśl'}
                    </h2>
                    <p>Notatki są przypisane do Twojego profilu.</p>
                </div>
            )}
            {update.isError && (
                <p role="alert">Nie udało się zmienić przypięcia.</p>
            )}
            <div className={c.grid}>
                {rows.map((note) => (
                    <article
                        key={note.id}
                        className={c.card}
                        style={
                            {
                                '--note-color': note.color,
                            } as React.CSSProperties
                        }
                    >
                        <button
                            type="button"
                            className={c.open}
                            aria-label={`Otwórz notatkę ${note.title}`}
                            onClick={() => {
                                setSelected(note)

                                setEditing(false)
                            }}
                        >
                            <div className={c.cardTitle}>
                                <StickyNote size={17} aria-hidden="true" />
                                <h2>{note.title}</h2>
                                {note.isPinned && (
                                    <Pin size={14} aria-label="Przypięta" />
                                )}
                            </div>
                            <p className={c.excerpt}>
                                {note.plainText || 'Pusta notatka'}
                            </p>
                        </button>
                        <footer>
                            <time dateTime={note.updatedAt}>
                                {new Date(note.updatedAt).toLocaleDateString(
                                    'pl-PL',
                                    { day: 'numeric', month: 'short' },
                                )}
                            </time>
                            <div>
                                <button
                                    type="button"
                                    disabled={update.isPending}
                                    aria-label={`${note.isPinned ? 'Odepnij' : 'Przypnij'} notatkę ${note.title}`}
                                    onClick={() =>
                                        update.mutate({
                                            id: note.id,
                                            dto: { isPinned: !note.isPinned },
                                        })
                                    }
                                >
                                    <Pin size={15} aria-hidden="true" />
                                </button>
                                <button
                                    type="button"
                                    aria-label={`Edytuj notatkę ${note.title}`}
                                    onClick={() => {
                                        setSelected(note)

                                        setEditing(true)
                                    }}
                                >
                                    <Pencil size={15} aria-hidden="true" />
                                </button>
                                <button
                                    type="button"
                                    aria-label={`Usuń notatkę ${note.title}`}
                                    onClick={() => {
                                        remove.reset()

                                        setDeleting(note)
                                    }}
                                >
                                    <Trash2 size={15} aria-hidden="true" />
                                </button>
                            </div>
                        </footer>
                    </article>
                ))}
            </div>
            {notes.hasNextPage && (
                <Button
                    type="button"
                    pending={notes.isFetchingNextPage}
                    onClick={() => void notes.fetchNextPage()}
                >
                    Pokaż więcej
                </Button>
            )}
            {(creating || selected || targetOpen) && (
                <Popup
                    title={
                        creating
                            ? 'Nowa notatka'
                            : (selected?.title ?? 'Notatka')
                    }
                    onClose={close}
                    closeDisabled={pending}
                >
                    {creating || editing ? (
                        <NoteForm
                            note={selected ?? undefined}
                            onCancel={close}
                            onPendingChange={setPending}
                            onSuccess={(note) => {
                                setSelected(note)

                                setCreating(false)

                                setEditing(false)
                            }}
                        />
                    ) : selected ? (
                        <div className={c.details}>
                            <RichTextContent content={selected.content} />
                            <Button
                                type="button"
                                onClick={() => setEditing(true)}
                            >
                                <Pencil size={15} aria-hidden="true" />
                                Edytuj notatkę
                            </Button>
                        </div>
                    ) : target.isError ? (
                        <div role="alert">
                            <p>
                                Nie można otworzyć tej notatki. Sprawdź dostęp
                                lub spróbuj ponownie.
                            </p>
                            <Button
                                type="button"
                                onClick={() => void target.refetch()}
                            >
                                Spróbuj ponownie
                            </Button>
                        </div>
                    ) : (
                        <p role="status">Wczytywanie notatki…</p>
                    )}
                </Popup>
            )}
            {deleting && (
                <Popup
                    title="Usunąć notatkę?"
                    onClose={() => {
                        if (!remove.isPending) setDeleting(null)
                    }}
                    closeDisabled={remove.isPending}
                >
                    <FormContainer
                        aria-label="Usuwanie notatki"
                        submitTitle="Usuń notatkę"
                        isPending={remove.isPending}
                        onCancel={() => setDeleting(null)}
                        error={
                            remove.isError
                                ? 'Nie udało się usunąć notatki. Spróbuj ponownie.'
                                : undefined
                        }
                        onSubmit={() =>
                            remove.mutate(
                                { id: deleting.id },
                                {
                                    onSuccess: () => {
                                        if (selected?.id === deleting.id)
                                            close()

                                        setDeleting(null)
                                    },
                                },
                            )
                        }
                    >
                        <p>Notatka „{deleting.title}” zostanie usunięta.</p>
                    </FormContainer>
                </Popup>
            )}
        </section>
    )
}
