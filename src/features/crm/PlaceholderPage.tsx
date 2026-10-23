import c from './PlaceholderPage.module.scss'

export function PlaceholderPage({ title }: { title: string }) {
    return (
        <section className={c.page}>
            <h1>{title}</h1>
        </section>
    )
}
