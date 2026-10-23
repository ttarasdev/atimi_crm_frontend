import Image from 'next/image'
import c from './Brand.module.scss'

export function Brand({ compact = false }: { compact?: boolean }) {
    return (
        <div
            className={`${c.brand} ${compact ? c.compact : ''}`}
            aria-label="Atimi CRM · Atlantis"
        >
            <Image
                src="/atlantis-logo.png"
                alt=""
                width={42}
                height={40}
                priority
            />
            <div>
                <strong>ATIMI</strong>
                <span className={c.subtitle}>ATLANTIS · CRM</span>
            </div>
        </div>
    )
}
