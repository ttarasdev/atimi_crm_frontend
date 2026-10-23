'use client'

import { useId, useState } from 'react'
import c from './FormReminderInput.module.scss'

const presets = [
    { minutes: 0, title: 'W chwili rozpoczęcia' },
    { minutes: 5, title: '5 min przed' },
    { minutes: 10, title: '10 min przed' },
    { minutes: 15, title: '15 min przed' },
    { minutes: 30, title: '30 min przed' },
    { minutes: 60, title: '1 godz. przed' },
    { minutes: 120, title: '2 godz. przed' },
    { minutes: 1440, title: '1 dzień przed' },
    { minutes: 10080, title: '1 tydzień przed' },
]

interface Props {
    inputTitle: string
    value: number[]
    onChange: (value: number[]) => void
    disabled?: boolean
}

export function FormReminderInput({
    inputTitle,
    value,
    onChange,
    disabled = false,
}: Props) {
    const id = useId()

    const [custom, setCustom] = useState('')

    const minutes = Number(custom)

    const canAdd =
        custom.trim() !== '' &&
        Number.isInteger(minutes) &&
        minutes >= 0 &&
        minutes <= 525600 &&
        !value.includes(minutes) &&
        value.length < 10

    const options = [
        ...presets,
        ...value
            .filter(
                (item) => !presets.some((preset) => preset.minutes === item),
            )
            .map((item) => ({ minutes: item, title: `${item} min przed` })),
    ]

    const add = (offset: number) =>
        onChange([...value, offset].sort((first, second) => second - first))

    return (
        <fieldset className={c.field} disabled={disabled}>
            <legend className={c.label}>{inputTitle}</legend>
            <div className={c.options}>
                {options.map((option) => {
                    const checked = value.includes(option.minutes)

                    return (
                        <label key={option.minutes} className={c.chip}>
                            <input
                                type="checkbox"
                                checked={checked}
                                disabled={!checked && value.length >= 10}
                                onChange={() => {
                                    if (checked)
                                        onChange(
                                            value.filter(
                                                (item) =>
                                                    item !== option.minutes,
                                            ),
                                        )
                                    else add(option.minutes)
                                }}
                            />
                            {option.title}
                        </label>
                    )
                })}
            </div>
            <div className={c.custom}>
                <label htmlFor={id}>Inny czas (minuty)</label>
                <div className={c.customControl}>
                    <input
                        id={id}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={525600}
                        step={1}
                        value={custom}
                        placeholder="np. 45"
                        aria-describedby={`${id}-hint`}
                        onChange={(event) => setCustom(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault()

                                if (canAdd) {
                                    add(minutes)

                                    setCustom('')
                                }
                            }
                        }}
                    />
                    <button
                        type="button"
                        className={c.add}
                        disabled={!canAdd}
                        onClick={() => {
                            if (!canAdd) return

                            add(minutes)

                            setCustom('')
                        }}
                    >
                        Dodaj czas
                    </button>
                </div>
            </div>
            <p id={`${id}-hint`} className={c.hint}>
                {value.length === 0
                    ? 'Brak przypomnień e-mail.'
                    : `Wybrane przypomnienia: ${value.length} / 10.`}
            </p>
        </fieldset>
    )
}
