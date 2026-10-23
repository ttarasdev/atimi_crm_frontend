import type { MailHistoryQuery, MailHistoryList } from './mail.types'
import { http } from '@/api/http'
import type { RequestOptions } from '@/api/http.types'
import type {
    MailAccount,
    MailTemplate,
    MailPreview,
    MailSent,
    PreviewMailDto,
    PreviewMailCampaignDto,
    SendMailDto,
    SendClientMailDto,
} from './mail.types'

const mailPath = (clientId?: number, campaigns = false) =>
    campaigns
        ? '/mail-campaigns'
        : clientId === undefined
          ? '/mail'
          : `/clients/${clientId}/mail`

export const mailApi = {
    history: (
        query: MailHistoryQuery = {},
        options?: RequestOptions,
        clientId?: number,
    ) =>
        http.get<MailHistoryList>(
            `${clientId ? `/clients/${clientId}/mail` : '/mail'}/history`,
            { ...options, query: { ...query } },
        ),
    accounts: (
        options?: RequestOptions,
        clientId?: number,
        campaigns = false,
    ) =>
        http.get<MailAccount[]>(
            `${mailPath(clientId, campaigns)}/accounts`,
            options,
        ),
    templates: (
        options?: RequestOptions,
        clientId?: number,
        campaigns = false,
    ) =>
        http.get<MailTemplate[]>(
            `${mailPath(clientId, campaigns)}/templates`,
            options,
        ),
    preview: (
        dto: PreviewMailDto | PreviewMailCampaignDto,
        options?: RequestOptions,
        clientId?: number,
        campaigns = false,
    ) =>
        http.post<MailPreview>(
            `${mailPath(clientId, campaigns)}/preview`,
            dto,
            options,
        ),
    send: (
        dto: SendMailDto | SendClientMailDto,
        files: File[] = [],
        options?: RequestOptions,
        clientId?: number,
    ) => {
        const body = new FormData()

        if ('contactId' in dto && clientId !== undefined)
            body.append('contactId', String(dto.contactId))
        else if ('to' in dto && clientId === undefined)
            body.append('to', dto.to)
        else throw new RangeError('Mail recipient does not match its scope')

        body.append('subject', dto.subject)

        body.append('text', dto.text)

        if (dto.account) body.append('account', dto.account)

        if (dto.template) body.append('template', dto.template)

        if (dto.privateAssetIds?.length)
            body.append('privateAssetIds', JSON.stringify(dto.privateAssetIds))

        for (const file of files) body.append('files', file, file.name)

        return http.post<MailSent>(`${mailPath(clientId)}/send`, body, options)
    },
}
