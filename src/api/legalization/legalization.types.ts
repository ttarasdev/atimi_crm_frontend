export interface LegalizationProfile {
    birthDate?: string
    birthPlace?: string
    birthCountry?: string
    citizenship?: string
    otherCitizenships?: string
    maidenName?: string
    nativeName?: string
    sex?: string
    maritalStatus?: string
    pesel?: string
    fatherName?: string
    motherName?: string
    motherMaidenName?: string
    postalCode?: string
    city?: string
    street?: string
    houseNumber?: string
    apartmentNumber?: string
    registeredAddress?: string
    correspondenceAddress?: string
    entryDate?: string
    stayBasis?: string
    ukrStatus?: string
    employerName?: string
    employerTaxId?: string
    employerAddress?: string
    jobTitle?: string
    contractType?: string
    contractFrom?: string
    contractTo?: string
    schoolName?: string
    emailMarketingConsent: boolean
    emailAutomationConsent: boolean
}

export interface DocumentCardType {
    id: number
    code: string
    title: string
    requiresExpiry: boolean
    reminderMonths: number[]
    reminderTime: string
    notificationEmail?: string
    color: string
}

export interface DocumentCard {
    id: number
    clientId: number
    typeId: number
    number?: string
    issuingCountry?: string
    issuingAuthority?: string
    issuedAt?: string
    expiresAt?: string
    status: 'active' | 'replaced' | 'archived'
    isStayBasis: boolean
    reminderMonths: number[]
    notes?: string
    type: DocumentCardType
    createdAt: string
    updatedAt: string
}

export interface SaveDocumentCardDto {
    typeId: number
    number?: string
    issuingCountry?: string
    issuingAuthority?: string
    issuedAt?: string
    expiresAt?: string
    status?: DocumentCard['status']
    isStayBasis?: boolean
    reminderMonths?: number[]
    notes?: string
}

export interface ClientRelation {
    id: number
    clientId: number
    relatedClientId: number
    type: 'parent' | 'spouse' | 'sibling'
    direction: 'parent' | 'child' | 'spouse' | 'sibling'
    relatedClient: { id: number; name: string; surname: string | null }
}

export interface LegalizationList<T> {
    rows: T[]
    total: number
    page: number
    limit: number
    offset: number
}
