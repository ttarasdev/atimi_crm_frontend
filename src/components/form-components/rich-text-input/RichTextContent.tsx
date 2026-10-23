import type { JSONContent } from '@tiptap/react'
import type { ReactNode } from 'react'
import c from './RichTextInput.module.scss'

function renderNode(node: JSONContent, key: number): ReactNode {
    const children = node.content?.map(renderNode)

    if (node.type === 'text') {
        let text: ReactNode = node.text ?? ''

        for (const [index, mark] of (node.marks ?? []).entries()) {
            if (mark.type === 'bold') text = <strong key={index}>{text}</strong>
            else if (mark.type === 'italic') text = <em key={index}>{text}</em>
            else if (mark.type === 'underline') text = <u key={index}>{text}</u>
            else if (mark.type === 'strike') text = <s key={index}>{text}</s>
            else if (mark.type === 'code')
                text = <code key={index}>{text}</code>
        }

        return <span key={key}>{text}</span>
    }

    if (node.type === 'paragraph') return <p key={key}>{children}</p>

    if (node.type === 'heading') {
        if (node.attrs?.level === 1) return <h2 key={key}>{children}</h2>

        if (node.attrs?.level === 3) return <h4 key={key}>{children}</h4>

        return <h3 key={key}>{children}</h3>
    }

    if (node.type === 'bulletList') return <ul key={key}>{children}</ul>

    if (node.type === 'orderedList')
        return (
            <ol
                key={key}
                start={
                    typeof node.attrs?.start === 'number' ? node.attrs.start : 1
                }
            >
                {children}
            </ol>
        )

    if (node.type === 'listItem') return <li key={key}>{children}</li>

    if (node.type === 'blockquote')
        return <blockquote key={key}>{children}</blockquote>

    if (node.type === 'codeBlock')
        return (
            <pre key={key}>
                <code>{children}</code>
            </pre>
        )

    if (node.type === 'hardBreak') return <br key={key} />

    if (node.type === 'horizontalRule') return <hr key={key} />

    return <div key={key}>{children}</div>
}

export function RichTextContent({ content }: { content: JSONContent }) {
    return <div className={c.readonly}>{renderNode(content, 0)}</div>
}
