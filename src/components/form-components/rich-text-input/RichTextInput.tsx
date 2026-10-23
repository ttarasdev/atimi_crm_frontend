'use client'

import { useEffect, useId } from 'react'
import { EditorContent, useEditor, type JSONContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
    Bold,
    Italic,
    Underline,
    List,
    ListOrdered,
    Heading2,
    Undo2,
    Redo2,
    Quote,
} from 'lucide-react'
import c from './RichTextInput.module.scss'

export const EMPTY_RICH_TEXT: JSONContent = {
    type: 'doc',
    content: [{ type: 'paragraph' }],
}

export function RichTextInput({
    value,
    onChange,
    inputTitle = 'Treść',
    disabled = false,
}: {
    value: JSONContent
    onChange: (value: JSONContent) => void
    inputTitle?: string
    disabled?: boolean
}) {
    const labelId = useId()

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                link: false,
                heading: { levels: [1, 2, 3] },
            }),
        ],
        immediatelyRender: false,
        shouldRerenderOnTransaction: true,
        content: value,
        onUpdate: ({ editor }) => onChange(editor.getJSON()),
        editorProps: {
            attributes: {
                role: 'textbox',
                'aria-labelledby': labelId,
                'aria-multiline': 'true',
            },
        },
    })

    useEffect(() => {
        editor?.setEditable(!disabled)
    }, [editor, disabled])

    useEffect(() => {
        if (
            editor &&
            JSON.stringify(editor.getJSON()) !== JSON.stringify(value)
        )
            editor.commands.setContent(value, { emitUpdate: false })
    }, [editor, value])

    const buttons = [
        {
            title: 'Pogrubienie',
            Icon: Bold,
            active: editor?.isActive('bold'),
            run: () => editor?.chain().focus().toggleBold().run(),
        },
        {
            title: 'Kursywa',
            Icon: Italic,
            active: editor?.isActive('italic'),
            run: () => editor?.chain().focus().toggleItalic().run(),
        },
        {
            title: 'Podkreślenie',
            Icon: Underline,
            active: editor?.isActive('underline'),
            run: () => editor?.chain().focus().toggleUnderline().run(),
        },
        {
            title: 'Nagłówek',
            Icon: Heading2,
            active: editor?.isActive('heading'),
            run: () =>
                editor?.chain().focus().toggleHeading({ level: 2 }).run(),
        },
        {
            title: 'Lista',
            Icon: List,
            active: editor?.isActive('bulletList'),
            run: () => editor?.chain().focus().toggleBulletList().run(),
        },
        {
            title: 'Lista numerowana',
            Icon: ListOrdered,
            active: editor?.isActive('orderedList'),
            run: () => editor?.chain().focus().toggleOrderedList().run(),
        },
        {
            title: 'Cytat',
            Icon: Quote,
            active: editor?.isActive('blockquote'),
            run: () => editor?.chain().focus().toggleBlockquote().run(),
        },
        {
            title: 'Cofnij',
            Icon: Undo2,
            run: () => editor?.chain().focus().undo().run(),
        },
        {
            title: 'Ponów',
            Icon: Redo2,
            run: () => editor?.chain().focus().redo().run(),
        },
    ]

    return (
        <div className={c.field}>
            <span id={labelId} className={c.label}>
                {inputTitle}
            </span>
            <div className={c.control}>
                <div
                    className={c.toolbar}
                    role="toolbar"
                    aria-label="Formatowanie tekstu"
                >
                    {buttons.map(({ title, Icon, active, run }) => (
                        <button
                            key={title}
                            type="button"
                            title={title}
                            aria-label={title}
                            aria-pressed={active}
                            disabled={disabled || !editor}
                            onClick={run}
                        >
                            <Icon size={16} aria-hidden="true" />
                        </button>
                    ))}
                </div>
                <EditorContent editor={editor} className={c.editor} />
            </div>
        </div>
    )
}
