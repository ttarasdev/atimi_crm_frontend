export type LeadSource =
    | 'website'
    | 'instagram'
    | 'facebook'
    | 'manual'
    | 'other'

export type LeadStatus =
    | 'new'
    | 'contacted'
    | 'qualified'
    | 'lost'
    | 'converted'

export type LeadLanguage = 'pl' | 'en' | 'ua' | 'de'

export interface Lead {
    id: number
    name: string
    email: string | null
    phone: string | null
    message: string
    language: LeadLanguage
    source: LeadSource
    status: LeadStatus
    managerId: number | null
    clientId: number | null
    internalNote: string | null
    externalId: string | null
    consentedAt: string | null
    convertedAt: string | null
    createdAt: string
    updatedAt: string
    manager?: {
        id: number
        name: string
        surname: string
        email: string
    } | null
}

export interface LeadsQuery {
    page?: number
    limit?: number
    offset?: number
    search?: string
    status?: LeadStatus
    source?: LeadSource
    managerId?: number
    unassigned?: boolean
}

export interface LeadsListResponse {
    rows: Lead[]
    total: number
    page: number
    limit: number
    offset: number
}

export interface CreateLeadDto {
    name: string
    email?: string
    phone?: string
    message: string
    language: LeadLanguage
    source: LeadSource
    managerId?: number | null
}

export interface UpdateLeadDto {
    status?: Exclude<LeadStatus, 'converted'>
    managerId?: number | null
    internalNote?: string | null
}

export interface ConvertLeadDto {
    clientId?: number
    managerId?: number
    name?: string
    surname?: string
}

export interface ConvertLeadResponse {
    lead: Lead
    clientId: number
}
