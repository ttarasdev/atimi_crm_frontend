'use client'

import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query'
import { managersApi } from '@/api/managers/managers.api'
import { managerAuthApi } from '@/api/manager-auth/manager-auth.api'
import type {
    Manager,
    ManagersQuery,
    UpdateManagerDto,
    CreateManagerDto,
} from '@/api/managers/managers.types'
import { sessionQueryKey } from '@/shared/auth/session-query'
import {
    infiniteManagersQueryOptions,
    managerQueryOptions,
    managersQueryKeys,
    managersQueryOptions,
} from '@/shared/query/managers-query'

export function useManagers(query: ManagersQuery = {}) {
    return useQuery(managersQueryOptions(query))
}

export function useInfiniteManagers(
    query: Omit<ManagersQuery, 'page' | 'limit' | 'offset'>,
    enabled = true,
) {
    return useInfiniteQuery({ ...infiniteManagersQueryOptions(query), enabled })
}

export function useManager(id: number | null) {
    return useQuery(managerQueryOptions(id))
}

export function useManagerRoles() {
    return useQuery({
        queryKey: managersQueryKeys.roles,
        queryFn: ({ signal }) => managersApi.roles({ signal }),
    })
}

export function useCreateManager() {
    const queryClient = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            dto,
            signal,
        }: {
            dto: CreateManagerDto
            signal?: AbortSignal
        }) => managersApi.create(dto, { signal }),
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: managersQueryKeys.lists,
            }),
    })
}

export function useResendManagerConfirmation() {
    return useMutation({
        retry: false,
        mutationFn: ({
            email,
            signal,
        }: {
            email: string
            signal?: AbortSignal
        }) => managerAuthApi.resendConfirmation({ email }, { signal }),
    })
}

export function useUpdateManager() {
    const queryClient = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            id,
            dto,
            signal,
        }: {
            id: number
            dto: UpdateManagerDto
            signal?: AbortSignal
        }) => managersApi.update(id, dto, { signal }),
        onSuccess: async (manager) => {
            queryClient.setQueryData(
                managersQueryKeys.detail(manager.id),
                manager,
            )

            const session = queryClient.getQueryData<Manager>(sessionQueryKey)

            if (session?.id === manager.id) {
                await queryClient.cancelQueries({ queryKey: sessionQueryKey })

                queryClient.setQueryData(sessionQueryKey, manager)
            }

            await queryClient.invalidateQueries({
                queryKey: managersQueryKeys.lists,
            })
        },
    })
}

export function useSetManagerStatus() {
    const queryClient = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            id,
            status,
            signal,
        }: {
            id: number
            status: Manager['status']
            signal?: AbortSignal
        }) => managersApi.setStatus(id, status, { signal }),
        onSuccess: async (manager) => {
            queryClient.setQueryData(
                managersQueryKeys.detail(manager.id),
                manager,
            )

            await queryClient.invalidateQueries({
                queryKey: managersQueryKeys.lists,
            })
        },
    })
}

export function useSetManagerRoles() {
    const queryClient = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            id,
            roleIds,
            signal,
        }: {
            id: number
            roleIds: number[]
            signal?: AbortSignal
        }) => managersApi.setRoles(id, roleIds, { signal }),
        onSuccess: async (manager) => {
            queryClient.setQueryData(
                managersQueryKeys.detail(manager.id),
                manager,
            )

            await queryClient.invalidateQueries({
                queryKey: managersQueryKeys.lists,
            })
        },
    })
}

export function useUpdateMyManager() {
    const queryClient = useQueryClient()

    return useMutation({
        retry: false,

        mutationFn: ({
            dto,
            signal,
        }: {
            dto: UpdateManagerDto
            signal?: AbortSignal
        }) => managersApi.updateMe(dto, { signal }),

        onSuccess: async (manager) => {
            await queryClient.cancelQueries({ queryKey: sessionQueryKey })

            queryClient.setQueryData(sessionQueryKey, manager)

            await queryClient.invalidateQueries({
                queryKey: sessionQueryKey,
                refetchType: 'none',
            })
        },
    })
}

export function useChangeMyAvatar() {
    const queryClient = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            file,
            signal,
        }: {
            file: File | null
            signal?: AbortSignal
        }) =>
            file
                ? managersApi.uploadMyAvatar(file, { signal })
                : managersApi.removeMyAvatar({ signal }),
        onSuccess: async (manager) => {
            await queryClient.cancelQueries({ queryKey: sessionQueryKey })

            queryClient.setQueryData(sessionQueryKey, manager)

            await queryClient.invalidateQueries({
                queryKey: sessionQueryKey,
                refetchType: 'none',
            })
        },
    })
}
