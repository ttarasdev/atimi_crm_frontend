import type { ReactNode } from 'react'
import { Brand } from '@/components/ui/brand/Brand'
import { ArrowUpRight, CircleCheck, ShieldCheck } from 'lucide-react'
import c from './AuthShell.module.scss'

export function AuthShell({
    title,
    subtitle,
    children,
    icon,
}: {
    title: string
    subtitle: string
    children: ReactNode
    icon?: ReactNode
}) {
    return (
        <main className={c.shell}>
            <aside className={c.brandPanel}>
                <Brand />
                <div className={c.art} aria-hidden="true">
                    <span />
                    <span />
                    <i />
                </div>
                <div className={c.intro}>
                    <p className={c.eyebrow}>TWOJE CENTRUM PRACY</p>
                    <h2>
                        Relacje z klientami.
                        <br />
                        Wszystko pod kontrolą.
                    </h2>
                    <p>Klienci, procesy i codzienna praca zespołu.</p>
                    <div className={c.preview} aria-hidden="true">
                        <div className={c.previewTitle}>
                            <span>Przestrzeń dla Twojego zespołu</span>
                            <ArrowUpRight size={22} />
                        </div>
                        <div className={c.previewRow}>
                            <CircleCheck size={22} />
                            <span>
                                Od pierwszego kontaktu
                                <br />
                                <strong>do kolejnego wspólnego sukcesu.</strong>
                            </span>
                        </div>
                        <div className={c.previewFooter}>
                            Jedno miejsce do pracy z klientami.
                        </div>
                    </div>
                </div>
                <span className={c.brandFooter}>Atlantis · Atimi · CRM</span>
            </aside>
            <section className={c.formPanel}>
                <div className={c.mobileBrand}>
                    <Brand />
                </div>
                <div className={c.formContent}>
                    {icon && <div className={c.statusIcon}>{icon}</div>}
                    <h1>{title}</h1>
                    <p className={c.subtitle}>{subtitle}</p>
                    {children}
                </div>
                <footer className={c.footer}>
                    <ShieldCheck size={14} />
                    <span>Bezpieczna przestrzeń Twojego zespołu</span>
                    <small>
                        © {new Date().getFullYear()} Atlantis · Atimi
                    </small>
                </footer>
            </section>
        </main>
    )
}
