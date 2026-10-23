export interface CompanySettings {
    id: number
    name: string
    legalName: string | null
    taxId: string | null
    address: string | null
    phone: string | null
    email: string | null
    website: string | null
    logoPublicAssetId: number | null
    createdAt: string
    updatedAt: string
}

export type UpdateCompanySettingsDto = Partial<
    Omit<CompanySettings, 'id' | 'createdAt' | 'updatedAt'>
>
