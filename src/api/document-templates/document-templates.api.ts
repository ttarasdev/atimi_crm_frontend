import { http } from '@/api/http'
import type { RequestOptions } from '@/api/http.types'
import type { PrivateAsset } from '@/api/private-assets/private-assets.types'
import type {
    CreateDocumentTemplateDto,
    DocumentType,
    DocumentTemplateAnalysis,
    DocumentField,
    DocumentCatalogResponse,
    CreateDocumentTypeDto,
    UpdateDocumentTypeDto,
    CreateDocumentFieldDto,
    UpdateDocumentFieldDto,
    DocumentPreview,
    DocumentTemplate,
    DocumentTemplatesListResponse,
    DocumentTemplatesQuery,
    DocumentTemplateVariable,
    GenerateDocumentDto,
    UpdateDocumentTemplateDto,
} from './document-templates.types'

function templatePath(id: number) {
    if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647)
        throw new Error('Invalid document template ID')

    return `/document-templates/${id}`
}

export const documentTemplatesApi = {
    types: (query: DocumentTemplatesQuery = {}, options?: RequestOptions) =>
        http.get<DocumentCatalogResponse<DocumentType>>(
            '/document-templates/types',
            { ...options, query: { ...query } },
        ),
    fields: (query: DocumentTemplatesQuery = {}, options?: RequestOptions) =>
        http.get<DocumentCatalogResponse<DocumentField>>(
            '/document-templates/fields',
            { ...options, query: { ...query } },
        ),
    createType: (dto: CreateDocumentTypeDto, options?: RequestOptions) =>
        http.post<DocumentType>('/document-templates/types', dto, options),
    updateType: (
        id: number,
        dto: UpdateDocumentTypeDto,
        options?: RequestOptions,
    ) =>
        http.patch<DocumentType>(
            `/document-templates/types/${id}`,
            dto,
            options,
        ),
    createField: (dto: CreateDocumentFieldDto, options?: RequestOptions) =>
        http.post<DocumentField>('/document-templates/fields', dto, options),
    updateField: (
        id: number,
        dto: UpdateDocumentFieldDto,
        options?: RequestOptions,
    ) =>
        http.patch<DocumentField>(
            `/document-templates/fields/${id}`,
            dto,
            options,
        ),
    analyze: (privateAssetId: number, options?: RequestOptions) =>
        http.post<DocumentTemplateAnalysis>(
            '/document-templates/analyze',
            { privateAssetId },
            options,
        ),
    preview: (id: number, clientId?: number, options?: RequestOptions) =>
        http.post<DocumentPreview>(
            `${templatePath(id)}/preview`,
            clientId ? { clientId } : {},
            options,
        ),
    list: (query: DocumentTemplatesQuery = {}, options?: RequestOptions) =>
        http.get<DocumentTemplatesListResponse>('/document-templates', {
            ...options,
            query: { ...query },
        }),
    get: (id: number, options?: RequestOptions) =>
        http.get<DocumentTemplate>(templatePath(id), options),
    variables: (options?: RequestOptions) =>
        http.get<DocumentTemplateVariable[]>(
            '/document-templates/variables',
            options,
        ),
    create: (dto: CreateDocumentTemplateDto, options?: RequestOptions) =>
        http.post<DocumentTemplate>('/document-templates', dto, options),
    update: (
        id: number,
        dto: UpdateDocumentTemplateDto,
        options?: RequestOptions,
    ) => http.patch<DocumentTemplate>(templatePath(id), dto, options),
    generate: (
        id: number,
        dto: GenerateDocumentDto,
        options?: RequestOptions,
    ) => http.post<PrivateAsset>(`${templatePath(id)}/generate`, dto, options),
}
