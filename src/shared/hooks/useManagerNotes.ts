'use client'

import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query'
import { managerNotesApi } from '@/api/manager-notes/manager-notes.api'
import type {
    CreateManagerNoteDto,
    ManagerNote,
    ManagerNotesQuery,
    UpdateManagerNoteDto,
} from '@/api/manager-notes/manager-notes.types'
import {
    infiniteManagerNotesQueryOptions,
    managerNoteQueryOptions,
    managerNotesQueryKeys,
    managerNotesQueryOptions,
} from '@/shared/query/manager-notes-query'

export function useManagerNotes(query: ManagerNotesQuery = {}) {
    return useQuery(managerNotesQueryOptions(query))
}

export function useInfiniteManagerNotes(
    query: Omit<ManagerNotesQuery, 'page' | 'limit' | 'offset'> = {},
) {
    return useInfiniteQuery(infiniteManagerNotesQueryOptions(query))
}

export function useManagerNote(id: number | null) {
    return useQuery(managerNoteQueryOptions(id))
}

export function useCreateManagerNote() {
    const cache = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            dto,
            signal,
        }: {
            dto: CreateManagerNoteDto
            signal?: AbortSignal
        }) => managerNotesApi.create(dto, { signal }),
        onSuccess: async (note) => {
            cache.setQueryData(managerNotesQueryKeys.detail(note.id), note)

            await cache.invalidateQueries({
                queryKey: managerNotesQueryKeys.lists,
            })
        },
    })
}

export function useUpdateManagerNote() {
    const cache = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            id,
            dto,
            signal,
        }: {
            id: number
            dto: UpdateManagerNoteDto
            signal?: AbortSignal
        }) => managerNotesApi.update(id, dto, { signal }),
        onSuccess: async (note) => {
            cache.setQueryData<ManagerNote>(
                managerNotesQueryKeys.detail(note.id),
                note,
            )

            await Promise.all([
                cache.invalidateQueries({
                    queryKey: managerNotesQueryKeys.lists,
                }),
                cache.invalidateQueries({
                    queryKey: managerNotesQueryKeys.detail(note.id),
                }),
            ])
        },
    })
}

export function useDeleteManagerNote() {
    const cache = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({ id, signal }: { id: number; signal?: AbortSignal }) =>
            managerNotesApi.delete(id, { signal }),
        onSuccess: async (_, { id }) => {
            cache.removeQueries({ queryKey: managerNotesQueryKeys.detail(id) })

            await cache.invalidateQueries({
                queryKey: managerNotesQueryKeys.lists,
            })
        },
    })
}
