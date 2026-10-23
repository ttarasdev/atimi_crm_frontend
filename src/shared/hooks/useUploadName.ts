'use client'

import { useRef, useState } from 'react'

export function useUploadName(initialName = '') {
    const [name, setName] = useState(initialName)

    const fileName = useRef(initialName)

    const trimmed = name.trim()

    const isValid =
        trimmed.length > 0 &&
        trimmed.length <= 255 &&
        !Array.from(name).some((character) => {
            const code = character.charCodeAt(0)

            return code < 32 || (code >= 127 && code <= 159)
        })

    function setFileName(file: File | null) {
        if (!file) return

        const previous = fileName.current

        setName((current) =>
            !current.trim() || current === previous ? file.name : current,
        )

        fileName.current = file.name
    }

    return { name, setName, setFileName, isValid }
}
