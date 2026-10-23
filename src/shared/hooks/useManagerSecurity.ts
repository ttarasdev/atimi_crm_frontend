'use client'

import { useMutation } from '@tanstack/react-query'
import { managerAuthApi } from '@/api/manager-auth/manager-auth.api'
import type {
    ChangeEmailDto,
    ChangePasswordDto,
} from '@/api/manager-auth/manager-auth.types'

export function useRequestEmailChange() {
    return useMutation({
        retry: false,
        mutationFn: ({
            dto,
            signal,
        }: {
            dto: ChangeEmailDto
            signal?: AbortSignal
        }) => managerAuthApi.changeEmail(dto, { signal }),
    })
}

export function useRequestPasswordChange() {
    return useMutation({
        retry: false,
        mutationFn: ({
            dto,
            signal,
        }: {
            dto: ChangePasswordDto
            signal?: AbortSignal
        }) => managerAuthApi.changePassword(dto, { signal }),
    })
}

export function useConfirmManagerChange(operation: 'email' | 'password') {
    return useMutation({
        retry: false,
        meta: { skipAuthHandling: true },
        mutationFn: ({
            token,
            signal,
        }: {
            token: string
            signal?: AbortSignal
        }) =>
            operation === 'email'
                ? managerAuthApi.confirmEmailChange({ token }, { signal })
                : managerAuthApi.confirmPasswordChange({ token }, { signal }),
    })
}
