'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Building2, Mail, MapPin, Phone, Globe, Check } from 'lucide-react'
import type { CompanySettings } from '@/api/company-settings/company-settings.types'
import { publicAssetsApi } from '@/api/public-assets/public-assets.api'
import { PublicBucket } from '@/api/public-assets/public-assets.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { MediaFileInput } from '@/components/form-components/media-file-input/MediaFileInput'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { FormTextarea } from '@/components/form-components/form-textarea/FormTextarea'
import { Button } from '@/components/ui/button/Button'
import {
    useCompanySettings,
    useUpdateCompanySettings,
} from '@/shared/hooks/useCompanySettings'
import {
    useCreatePublicAsset,
    useDeletePublicAsset,
} from '@/shared/hooks/usePublicAssets'
import { useRoles } from '@/shared/hooks/useRoles'
import { useUploadName } from '@/shared/hooks/useUploadName'
import c from './CompanySettingsPage.module.scss'

export function CompanySettingsPage() {
    const company = useCompanySettings()

    const { hasRole } = useRoles()

    if (company.isPending)
        return <p className={c.state}>Wczytywanie danych firmy…</p>

    if (company.isError)
        return (
            <div className={c.state} role="alert">
                <p>Nie udało się wczytać danych firmy.</p>
                <Button onClick={() => void company.refetch()}>
                    Spróbuj ponownie
                </Button>
            </div>
        )

    return (
        <section className={c.page} aria-label="Dane firmy">
            <header className={c.header}>
                <span className={c.mark}>
                    <Building2 size={22} aria-hidden />
                </span>
                <div>
                    <h2>Dane firmy</h2>
                    <p>Jedne dane we wszystkich firmowych wiadomościach.</p>
                </div>
            </header>
            <div className={c.columns}>
                {hasRole('admin') ? (
                    <CompanyForm company={company.data} />
                ) : (
                    <div className={c.card}>
                        <h3>{company.data.legalName || company.data.name}</h3>
                        <p className={c.hint}>
                            Dane firmy aktualizuje administrator.
                        </p>
                        {company.data.taxId && <p>NIP: {company.data.taxId}</p>}
                    </div>
                )}
                <CompanySummary company={company.data} />
            </div>
        </section>
    )
}

function CompanySummary({ company }: { company: CompanySettings }) {
    return (
        <aside className={c.summary} aria-label="Firmowy podpis">
            <p className={c.eyebrow}>FIRMOWY PODPIS</p>
            {company.logoPublicAssetId && (
                <Image
                    unoptimized
                    src={publicAssetsApi.fileUrl(company.logoPublicAssetId)}
                    alt={`Logo ${company.name}`}
                    width={180}
                    height={64}
                    className={c.logo}
                />
            )}
            <h3>{company.name}</h3>
            <div className={c.contacts}>
                {company.address && (
                    <p>
                        <MapPin size={15} aria-hidden />
                        <span>{company.address}</span>
                    </p>
                )}
                {company.phone && (
                    <p>
                        <Phone size={15} aria-hidden />
                        <span>{company.phone}</span>
                    </p>
                )}
                {company.email && (
                    <p>
                        <Mail size={15} aria-hidden />
                        <span>{company.email}</span>
                    </p>
                )}
                {company.website && (
                    <p>
                        <Globe size={15} aria-hidden />
                        <span>{company.website}</span>
                    </p>
                )}
            </div>
            <p className={c.hint}>
                Dane pojawią się w każdym nowym liście. Podpis nadawcy pochodzi
                z jego profilu.
            </p>
        </aside>
    )
}

function CompanyForm({ company }: { company: CompanySettings }) {
    const [name, setName] = useState(company.name)

    const [legalName, setLegalName] = useState(company.legalName ?? '')

    const [taxId, setTaxId] = useState(company.taxId ?? '')

    const [address, setAddress] = useState(company.address ?? '')

    const [phone, setPhone] = useState(company.phone ?? '')

    const [email, setEmail] = useState(company.email ?? '')

    const [website, setWebsite] = useState(company.website ?? '')

    const [file, setFile] = useState<File | null>(null)

    const [logoId, setLogoId] = useState(company.logoPublicAssetId)

    const [preview, setPreview] = useState<string>()

    const [error, setError] = useState<string>()

    const [saved, setSaved] = useState(false)

    const update = useUpdateCompanySettings()

    const upload = useCreatePublicAsset()

    const removeUploaded = useDeletePublicAsset()

    const controller = useRef<AbortController | null>(null)

    const uploaded = useRef<{
        file: File
        originalName: string
        id: number
    } | null>(null)

    const uploadName = useUploadName()

    useEffect(
        () => () => {
            if (preview) URL.revokeObjectURL(preview)
        },
        [preview],
    )

    useEffect(() => () => controller.current?.abort(), [])

    async function submit() {
        if (controller.current) return

        setError(undefined)

        setSaved(false)

        if (file && !uploadName.isValid) {
            setError(
                'Nazwa pliku logo musi mieć od 1 do 255 znaków bez znaków sterujących.',
            )

            return
        }

        controller.current = new AbortController()

        try {
            let id = logoId

            if (file) {
                const originalName = uploadName.name.trim()

                if (
                    uploaded.current?.file === file &&
                    uploaded.current.originalName === originalName
                )
                    id = uploaded.current.id
                else {
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

                    id = asset.id
                }
            }

            await update.mutateAsync({
                dto: {
                    name: name.trim(),
                    legalName: legalName.trim() || null,
                    taxId: taxId.trim() || null,
                    address: address.trim() || null,
                    phone: phone.trim() || null,
                    email: email.trim() || null,
                    website: website.trim() || null,
                    logoPublicAssetId: id,
                },
                signal: controller.current.signal,
            })

            setLogoId(id)

            setFile(null)

            setPreview(undefined)

            uploaded.current = null

            setSaved(true)
        } catch {
            if (!controller.current?.signal.aborted)
                setError(
                    'Nie udało się zapisać danych firmy. Sprawdź pola i spróbuj ponownie.',
                )
        } finally {
            controller.current = null
        }
    }

    const logo = file
        ? preview
        : logoId
          ? publicAssetsApi.fileUrl(logoId)
          : undefined

    return (
        <div className={c.card}>
            <FormContainer
                aria-label="Edycja danych firmy"
                onSubmit={() => void submit()}
                isPending={
                    upload.isPending ||
                    update.isPending ||
                    removeUploaded.isPending
                }
                error={error}
                submitTitle="Zapisz dane firmy"
            >
                <MediaFileInput
                    inputTitle="Logo firmy"
                    value={file}
                    accept="image/png,image/jpeg,image/webp"
                    setFile={(next) => {
                        setError(undefined)

                        if (
                            next &&
                            (![
                                'image/png',
                                'image/jpeg',
                                'image/webp',
                            ].includes(next.type) ||
                                next.size > 8 * 1024 * 1024 ||
                                !next.size)
                        ) {
                            setError('Wybierz PNG, JPEG lub WebP do 8 MB.')

                            return
                        }

                        setFile(next)

                        uploadName.setFileName(next)

                        setPreview(next ? URL.createObjectURL(next) : undefined)
                    }}
                    preview={
                        logo ? (
                            <Image
                                unoptimized
                                src={logo}
                                alt="Logo firmy"
                                width={64}
                                height={48}
                                className={c.logo}
                            />
                        ) : undefined
                    }
                    hint="PNG, JPEG lub WebP. Plik zachowuje oryginalny format."
                />
                {file && (
                    <TextInput
                        inputTitle="Nazwa pliku logo"
                        value={uploadName.name}
                        onChange={uploadName.setName}
                        maxLength={255}
                        required
                    />
                )}
                {(file || logoId) && (
                    <Button
                        type="button"
                        className={c.secondary}
                        onClick={() => {
                            setFile(null)

                            setPreview(undefined)

                            setLogoId(null)
                        }}
                    >
                        Przywróć logo domyślne
                    </Button>
                )}
                <TextInput
                    inputTitle="Nazwa firmy"
                    value={name}
                    onChange={setName}
                    maxLength={100}
                    required
                />
                <div className={c.fieldPair}>
                    <TextInput
                        inputTitle="Pełna nazwa prawna"
                        value={legalName}
                        onChange={setLegalName}
                        maxLength={200}
                    />
                    <TextInput
                        inputTitle="NIP / numer podatkowy"
                        value={taxId}
                        onChange={setTaxId}
                        maxLength={40}
                    />
                </div>
                <FormTextarea
                    inputTitle="Adres"
                    value={address}
                    onChange={setAddress}
                    maxLength={300}
                    rows={2}
                    autoComplete="street-address"
                />
                <div className={c.fieldPair}>
                    <TextInput
                        inputTitle="Telefon firmy"
                        value={phone}
                        onChange={setPhone}
                        maxLength={32}
                        type="tel"
                        autoComplete="tel"
                    />
                    <TextInput
                        inputTitle="E-mail kontaktowy"
                        value={email}
                        onChange={setEmail}
                        maxLength={254}
                        type="email"
                        autoComplete="email"
                    />
                </div>
                <TextInput
                    inputTitle="Strona internetowa"
                    value={website}
                    onChange={setWebsite}
                    maxLength={500}
                    type="url"
                    placeholder="https://"
                    autoComplete="url"
                />
                <p className={c.hint}>
                    Zmiany dotyczą nowych wiadomości. Konta nadawców wybierasz
                    osobno w poczcie.
                </p>
                {saved && (
                    <p className={c.saved} role="status">
                        <Check size={15} aria-hidden />
                        Dane firmy zapisane.
                    </p>
                )}
            </FormContainer>
        </div>
    )
}
