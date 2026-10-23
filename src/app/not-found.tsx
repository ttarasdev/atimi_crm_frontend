import Link from 'next/link'
import { AccessState } from '@/components/feedback/AccessState'

export default function NotFound() {
    return (
        <AccessState title="Nie znaleziono strony">
            <Link href="/main">Wróć do CRM →</Link>
        </AccessState>
    )
}
