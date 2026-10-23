export type PartnerCategory =
    | 'notary'
    | 'legal'
    | 'translation'
    | 'education'
    | 'employment'
    | 'accounting'
    | 'insurance'
    | 'other'

export interface Partner {
    id: number
    name: string
    category: PartnerCategory
    contactPerson: string | null
    phone: string | null
    additionalPhone: string | null
    email: string | null
    website: string | null
    city: string | null
    address: string | null
    notes: string | null
    isFeatured: boolean
    isActive: boolean
    createdAt: string
    updatedAt: string
}

export interface CreatePartnerDto {
    name: string
    category: PartnerCategory
    contactPerson?: string | null
    phone?: string | null
    additionalPhone?: string | null
    email?: string | null
    website?: string | null
    city?: string | null
    address?: string | null
    notes?: string | null
    isFeatured?: boolean
}

export type UpdatePartnerDto = Partial<CreatePartnerDto> & {
    isActive?: boolean
}

export interface PartnersQuery {
    page?: number
    limit?: number
    offset?: number
    search?: string
    category?: PartnerCategory
    isFeatured?: boolean
    isActive?: boolean
}

export interface PartnersList {
    rows: Partner[]
    total: number
    page: number
    limit: number
    offset: number
}
