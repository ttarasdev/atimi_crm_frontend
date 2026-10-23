import type { ClientsQuery } from '@/api/clients/clients.types'
import type { PreviewMailDto, MailAccountId } from '@/api/mail/mail.types'

export type CampaignFilters = Omit<
    ClientsQuery,
    'page' | 'limit' | 'offset' | 'archived'
> & { isPrivate?: boolean }

export type CampaignFilterOptionKind = 'source' | 'stage' | 'manager'

export interface CampaignFilterOption {
    id: number
    label: string
}

export interface CampaignAudience {
    matchedClients: number
    eligibleRecipients: number
    excluded: {
        missingEmail: number
        invalidEmail: number
        missingConsent: number
        duplicateEmail: number
    }
    sample: {
        clientId: number
        name: string
        surname?: string
        email: string
    }[]
}

export type CampaignStatus = 'queued' | 'running' | 'completed' | 'cancelled'

export type RecipientStatus =
    | 'pending'
    | 'sending'
    | 'sent'
    | 'failed'
    | 'skipped'
    | 'cancelled'
    | 'uncertain'

export interface MailCampaign {
    id: number
    name: string
    subject: string
    text: string
    status: CampaignStatus
    scheduledAt?: string
    isScheduled?: boolean
    createdAt: string
    counts: Record<RecipientStatus | 'total', number>
}

export interface CampaignRecipient {
    id: number
    clientId?: number
    email?: string
    status: RecipientStatus
    reason?: string
    sentAt?: string
}

export interface CampaignList<T> {
    rows: T[]
    total: number
    page: number
    limit: number
    offset: number
}

export interface CreateCampaignDto extends PreviewMailDto {
    requestId: string
    name: string
    account?: MailAccountId
    privateAssetIds?: number[]
    filters: CampaignFilters
    scheduledAt?: string
}

export interface CampaignsQuery {
    page?: number
    limit?: number
    offset?: number
    status?: CampaignStatus
    search?: string
}
