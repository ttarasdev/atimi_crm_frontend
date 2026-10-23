import type { ReactNode } from 'react'
import c from './AccessState.module.scss'

export function AccessState({
    title,
    children,
}: {
    title: string
    children?: ReactNode
}) {
    return (
        <div className={c.state}>
            <h1>{title}</h1>
            {children}
        </div>
    )
}
