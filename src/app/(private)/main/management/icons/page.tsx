import type { Metadata } from 'next'
import { IconGallery } from '@/features/icons/icon-gallery/IconGallery'

export const metadata: Metadata = { title: 'Galeria ikon' }

export default function Page() {
    return <IconGallery />
}
