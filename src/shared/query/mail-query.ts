import { queryOptions } from '@tanstack/react-query'
import { mailApi } from '@/api/mail/mail.api'

export const mailQueryKeys = {
    accounts: (clientId?: number, campaigns = false) =>
        [
            'mail',
            'accounts',
            campaigns ? 'campaigns' : (clientId ?? 'admin'),
        ] as const,
    templates: (clientId?: number, campaigns = false) =>
        [
            'mail',
            'templates',
            campaigns ? 'campaigns' : (clientId ?? 'admin'),
        ] as const,
}

export function mailAccountsQueryOptions(clientId?: number, campaigns = false) {
    return queryOptions({
        queryKey: mailQueryKeys.accounts(clientId, campaigns),
        queryFn: ({ signal }) =>
            mailApi.accounts({ signal }, clientId, campaigns),
    })
}

export function mailTemplatesQueryOptions(
    clientId?: number,
    campaigns = false,
) {
    return queryOptions({
        queryKey: mailQueryKeys.templates(clientId, campaigns),
        queryFn: ({ signal }) =>
            mailApi.templates({ signal }, clientId, campaigns),
    })
}
