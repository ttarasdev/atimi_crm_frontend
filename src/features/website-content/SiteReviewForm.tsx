'use client'

import { useEffect, useRef, useState } from 'react'
import { PublicBucket } from '@/api/public-assets/public-assets.types'
import type { SiteReview } from '@/api/site-reviews/site-reviews.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { FormTextarea } from '@/components/form-components/form-textarea/FormTextarea'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import { MediaFileInput } from '@/components/form-components/media-file-input/MediaFileInput'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import {
    useCreatePublicAsset,
    useDeletePublicAsset,
} from '@/shared/hooks/usePublicAssets'
import { useSaveSiteReview } from '@/shared/hooks/useWebsiteContent'
import { useUploadName } from '@/shared/hooks/useUploadName'
import {
    LanguageTabs,
    websiteLanguages,
    type WebsiteLanguage,
} from './LanguageTabs'
import { ReviewPreview } from './SiteContentPreview'
import c from './WebsiteContent.module.scss'

const empty = () => ({
    pl: { authorName: '', text: '' },
    en: { authorName: '', text: '' },
    ua: { authorName: '', text: '' },
    de: { authorName: '', text: '' },
})

export function SiteReviewForm({
    review,
    onSuccess,
    onCancel,
    onPendingChange,
}: {
    review?: SiteReview
    onSuccess: () => void
    onCancel: () => void
    onPendingChange: (pending: boolean) => void
}) {
    const [translations, setTranslations] = useState(
        review?.translations ?? empty(),
    )

    const [language, setLanguage] = useState<WebsiteLanguage>('pl')

    const [rating, setRating] = useState(review?.rating ?? 5)

    const [source, setSource] = useState(review?.source ?? 'Google')

    const [file, setFile] = useState<File | null>(null)

    const [imageUrl, setImageUrl] = useState<string>()

    const preview = useRef<string | undefined>(undefined)

    const [removeImage, setRemoveImage] = useState(false)

    const [error, setError] = useState<string>()

    const controller = useRef<AbortController | null>(null)

    const uploaded = useRef<{
        file: File
        originalName: string
        id: number
    } | null>(null)

    const uploadName = useUploadName()

    const upload = useCreatePublicAsset()

    const removeUploaded = useDeletePublicAsset()

    const save = useSaveSiteReview()

    const pending =
        upload.isPending || save.isPending || removeUploaded.isPending

    useEffect(() => {
        onPendingChange(pending)
    }, [pending, onPendingChange])

    useEffect(
        () => () => {
            controller.current?.abort()

            if (preview.current) URL.revokeObjectURL(preview.current)
        },
        [],
    )

    function chooseFile(value: File | null) {
        if (preview.current) URL.revokeObjectURL(preview.current)

        preview.current = value ? URL.createObjectURL(value) : undefined

        setImageUrl(preview.current)

        setFile(value)

        uploadName.setFileName(value)

        if (value) setRemoveImage(false)
    }

    function change(field: 'authorName' | 'text', value: string) {
        setTranslations((current) => ({
            ...current,
            [language]: { ...current[language], [field]: value },
        }))
    }

    async function submit() {
        if (controller.current) return

        setError(undefined)

        for (const lang of websiteLanguages) {
            const value = translations[lang]

            if (
                !value.authorName.trim() ||
                value.authorName.trim().length > 150 ||
                !value.text.trim() ||
                value.text.trim().length > 10000
            ) {
                setLanguage(lang)

                setError(
                    `Uzupełnij autora i treść opinii dla języka ${lang.toUpperCase()}.`,
                )

                return
            }
        }

        if (!source.trim() || source.trim().length > 100) {
            setError('Źródło musi mieć od 1 do 100 znaków.')

            return
        }

        if (
            file &&
            (file.size > 20 * 1024 * 1024 ||
                !['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
        ) {
            setError('Wybierz obraz PNG, JPEG lub WebP do 20 MB.')

            return
        }

        if (file && !uploadName.isValid) {
            setError(
                'Nazwa zdjęcia musi mieć od 1 do 255 znaków bez znaków sterujących.',
            )

            return
        }

        controller.current = new AbortController()

        try {
            let imageId = removeImage ? null : (review?.imageId ?? null)

            if (file) {
                const originalName = uploadName.name.trim()

                if (
                    uploaded.current?.file !== file ||
                    uploaded.current.originalName !== originalName
                ) {
                    if (uploaded.current) {
                        await removeUploaded.mutateAsync({
                            id: uploaded.current.id,
                            signal: controller.current.signal,
                        })

                        uploaded.current = null
                    }

                    const asset = await upload.mutateAsync({
                        dto: {
                            bucket: PublicBucket.SYSTEM_FILES,
                            originalName,
                        },
                        file,
                        signal: controller.current.signal,
                    })

                    uploaded.current = { file, originalName, id: asset.id }
                }

                imageId = uploaded.current.id
            }

            await save.mutateAsync({
                id: review?.id,
                dto: {
                    translations: Object.fromEntries(
                        websiteLanguages.map((lang) => [
                            lang,
                            {
                                authorName:
                                    translations[lang].authorName.trim(),
                                text: translations[lang].text.trim(),
                            },
                        ]),
                    ) as SiteReview['translations'],
                    rating,
                    source: source.trim(),
                    imageId,
                    imagePath:
                        file || removeImage
                            ? null
                            : (review?.imagePath ?? null),
                },
                signal: controller.current.signal,
            })

            uploaded.current = null

            onPendingChange(false)

            onSuccess()
        } catch {
            if (!controller.current?.signal.aborted)
                setError('Nie udało się zapisać opinii. Spróbuj ponownie.')
        } finally {
            controller.current = null
        }
    }

    return (
        <FormContainer
            aria-label={review ? 'Edycja opinii' : 'Tworzenie opinii'}
            submitTitle={review ? 'Zapisz zmiany' : 'Dodaj opinię'}
            error={error}
            isPending={pending}
            onCancel={onCancel}
            onSubmit={() => void submit()}
        >
            <LanguageTabs value={language} onChange={setLanguage} />
            <TextInput
                inputTitle={`Autor (${language.toUpperCase()})`}
                value={translations[language].authorName}
                onChange={(value) => change('authorName', value)}
                maxLength={150}
                required
            />
            <FormTextarea
                inputTitle={`Treść opinii (${language.toUpperCase()})`}
                value={translations[language].text}
                onChange={(value) => change('text', value)}
                maxLength={10000}
                rows={5}
                required
            />
            <div className={c.twoColumns}>
                <FormSelect
                    selectTitle="Ocena"
                    value={rating}
                    onChange={setRating}
                    options={[5, 4, 3, 2, 1].map((value) => ({
                        value,
                        title: `${value}/5`,
                    }))}
                />
                <TextInput
                    inputTitle="Źródło opinii"
                    value={source}
                    onChange={setSource}
                    maxLength={100}
                    required
                />
            </div>
            <MediaFileInput
                inputTitle="Zdjęcie (opcjonalne)"
                value={file}
                setFile={chooseFile}
                accept="image/png,image/jpeg,image/webp"
                hint="Oryginał bez konwersji. Maksymalnie 20 MB."
            />
            {file && (
                <TextInput
                    inputTitle="Nazwa zdjęcia"
                    value={uploadName.name}
                    onChange={uploadName.setName}
                    maxLength={255}
                    required
                />
            )}
            {(review?.imageId || review?.imagePath) && (
                <label className={c.checkbox}>
                    <input
                        type="checkbox"
                        checked={removeImage}
                        onChange={(event) => {
                            setRemoveImage(event.target.checked)

                            if (event.target.checked) chooseFile(null)
                        }}
                    />
                    Usuń obecne zdjęcie z opinii
                </label>
            )}
            <div className={c.previewLabel}>
                Podgląd · {language.toUpperCase()}
            </div>
            <ReviewPreview
                review={{
                    translations,
                    imageUrl,
                    rating,
                    source,
                    imageId: removeImage ? null : (review?.imageId ?? null),
                    imagePath: removeImage ? null : (review?.imagePath ?? null),
                }}
                language={language}
            />
        </FormContainer>
    )
}
