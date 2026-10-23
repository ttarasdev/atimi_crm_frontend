export type MailAccountId = 'default' | 'contact' | 'gmail'

export type MailTemplateId = 'pl' | 'en' | 'ua'

export interface MailAccount {
    id: MailAccountId
    name: string
    email: string
}

export interface MailTemplate {
    id: MailTemplateId
    name: string
    description: string
    language: 'pl' | 'en' | 'ua'
    previewSubject: string
    previewText: string
}

export interface PreviewMailDto {
    subject: string
    text: string
    template?: MailTemplateId
}

export interface PreviewMailCampaignDto extends PreviewMailDto {
    account?: MailAccountId
}

export interface SendMailDto extends PreviewMailDto {
    to: string
    account?: MailAccountId
    privateAssetIds?: number[]
}

export interface SendClientMailDto extends PreviewMailDto {
    contactId: number
    account?: MailAccountId
    privateAssetIds?: number[]
}

export type MailPresetScope = 'shared' | 'personal'

export interface MailPreset {
    id: number
    name: string
    subject: string
    text: string
    managerId: number | null
    createdAt: string
    updatedAt: string
}

export interface MailPresetsQuery {
    managerId?: number
    scope?: MailPresetScope
    search?: string
    page?: number
    limit?: number
    offset?: number
}

export interface MailPresetsList {
    rows: MailPreset[]
    total: number
    page: number
    limit: number
    offset: number
}

export interface CreateMailPresetDto {
    name: string
    subject: string
    text: string
    scope: MailPresetScope
}

export type UpdateMailPresetDto = Partial<Omit<CreateMailPresetDto, 'scope'>>

export interface MailPreview {
    html: string
}

export interface MailSent {
    success: true
}

export interface MailHistoryItem {
    id: number
    managerId: number
    clientId?: number
    to: string
    fromEmail: string
    account: string
    template: string
    subject: string
    text: string
    status: 'pending' | 'sent' | 'failed'
    attachments: { filename: string; privateAssetId?: number }[]
    sentAt?: string
    createdAt: string
}

export interface MailHistoryQuery {
    page?: number
    limit?: number
    offset?: number
    search?: string
    status?: MailHistoryItem['status']
}

export interface MailHistoryList {
    rows: MailHistoryItem[]
    total: number
    page: number
    limit: number
    offset: number
}
