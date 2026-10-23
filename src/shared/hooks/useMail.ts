'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mailApi } from '@/api/mail/mail.api'
import type {
    PreviewMailDto,
    PreviewMailCampaignDto,
    SendMailDto,
    SendClientMailDto,
} from '@/api/mail/mail.types'
import {
    mailAccountsQueryOptions,
    mailTemplatesQueryOptions,
} from '@/shared/query/mail-query'

export function useMailAccounts(clientId?: number, campaigns = false) {
    return useQuery(mailAccountsQueryOptions(clientId, campaigns))
}

export function useMailTemplates(clientId?: number, campaigns = false) {
    return useQuery(mailTemplatesQueryOptions(clientId, campaigns))
}

export function usePreviewMail(clientId?: number, campaigns = false) {
    return useMutation({
        retry: false,
        mutationFn: ({
            dto,
            signal,
        }: {
            dto: PreviewMailDto | PreviewMailCampaignDto
            signal?: AbortSignal
        }) => mailApi.preview(dto, { signal }, clientId, campaigns),
    })
}

export function useSendMail(clientId?: number) {
    const qc = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            dto,
            files,
            signal,
        }: {
            dto: SendMailDto | SendClientMailDto
            files?: File[]
            signal?: AbortSignal
        }) => mailApi.send(dto, files, { signal }, clientId),
        onSettled: () => qc.invalidateQueries({ queryKey: ['mail-history'] }),
    })
}
