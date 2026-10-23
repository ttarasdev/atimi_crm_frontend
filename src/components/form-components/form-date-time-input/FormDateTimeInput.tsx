'use client'

import { TextInput } from '../text-input/TextInput'
import c from './FormDateTimeInput.module.scss'

export function FormDateTimeInput({
    date,
    time,
    onDateChange,
    onTimeChange,
    dateTitle = 'Data',
    timeTitle = 'Godzina',
    disabled,
}: {
    date: string
    time: string
    onDateChange: (value: string) => void
    onTimeChange: (value: string) => void
    dateTitle?: string
    timeTitle?: string
    disabled?: boolean
}) {
    return (
        <div className={c.fields}>
            <TextInput
                inputTitle={dateTitle}
                type="date"
                value={date}
                onChange={onDateChange}
                min="1000-01-01"
                max="9999-12-31"
                required
                disabled={disabled}
            />
            <TextInput
                inputTitle={timeTitle}
                type="time"
                value={time}
                onChange={onTimeChange}
                required
                disabled={disabled}
            />
        </div>
    )
}
