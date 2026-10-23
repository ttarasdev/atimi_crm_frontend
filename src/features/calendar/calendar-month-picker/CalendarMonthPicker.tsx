'use client'

import { useId, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button/Button'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import {
    addCalendarDays,
    calendarMonthLabel,
    calendarWeekStart,
    isCalendarDateInRange,
} from '../calendar-view'
import { calendarDateLabel } from '../calendar-date'
import c from './CalendarMonthPicker.module.scss'

export function CalendarMonthPicker({
    date,
    today,
    onSelect,
}: {
    date: string
    today: string
    onSelect: (date: string) => void
}) {
    const [monthDate, setMonthDate] = useState(`${date.slice(0, 7)}-01`)

    const [yearInput, setYearInput] = useState(date.slice(0, 4))

    const yearId = useId()

    const year = Number(monthDate.slice(0, 4))

    const month = Number(monthDate.slice(5, 7))

    const start = calendarWeekStart(monthDate)

    function moveMonth(offset: number) {
        const value = new Date(`${monthDate}T12:00:00Z`)

        value.setUTCMonth(value.getUTCMonth() + offset)

        if (value.getUTCFullYear() >= 1000 && value.getUTCFullYear() <= 9999) {
            setMonthDate(value.toISOString().slice(0, 10))

            setYearInput(String(value.getUTCFullYear()))
        }
    }

    return (
        <div className={c.picker}>
            <div className={c.navigation}>
                <Button
                    type="button"
                    className={c.arrow}
                    aria-label="Poprzedni miesiąc"
                    onClick={() => moveMonth(-1)}
                >
                    <ChevronLeft size={18} aria-hidden="true" />
                </Button>
                <strong>{calendarMonthLabel(monthDate)}</strong>
                <Button
                    type="button"
                    className={c.arrow}
                    aria-label="Następny miesiąc"
                    onClick={() => moveMonth(1)}
                >
                    <ChevronRight size={18} aria-hidden="true" />
                </Button>
            </div>
            <div className={c.inputs}>
                <FormSelect
                    selectTitle="Miesiąc"
                    value={month}
                    onChange={(value) =>
                        setMonthDate(
                            `${year}-${String(value).padStart(2, '0')}-01`,
                        )
                    }
                    options={Array.from({ length: 12 }, (_, index) => ({
                        value: index + 1,
                        title: new Intl.DateTimeFormat('pl-PL', {
                            timeZone: 'UTC',
                            month: 'long',
                        }).format(new Date(Date.UTC(2026, index, 1))),
                    }))}
                />
                <div>
                    <label htmlFor={yearId}>Rok</label>
                    <input
                        id={yearId}
                        type="number"
                        min={1000}
                        max={9999}
                        step={1}
                        value={yearInput}
                        onBlur={() => setYearInput(String(year))}
                        onChange={(event) => {
                            const value = Number(event.target.value)

                            setYearInput(event.target.value)

                            if (
                                Number.isInteger(value) &&
                                value >= 1000 &&
                                value <= 9999
                            )
                                setMonthDate(
                                    `${value}-${String(month).padStart(2, '0')}-01`,
                                )
                        }}
                    />
                </div>
            </div>
            <div className={c.grid}>
                {['pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.', 'niedz.'].map(
                    (label) => (
                        <span className={c.weekday} key={label}>
                            {label}
                        </span>
                    ),
                )}
                {Array.from({ length: 42 }, (_, index) => {
                    const value = addCalendarDays(start, index)

                    return (
                        <button
                            key={value}
                            type="button"
                            className={`${c.date} ${value === date ? c.selected : ''} ${value.slice(0, 7) !== monthDate.slice(0, 7) ? c.outside : ''} ${value === today ? c.today : ''}`}
                            aria-label={calendarDateLabel(value)}
                            aria-pressed={value === date}
                            disabled={!isCalendarDateInRange(value)}
                            onClick={() => onSelect(value)}
                        >
                            {Number(value.slice(-2))}
                        </button>
                    )
                })}
            </div>
            <Button
                type="button"
                className={c.current}
                onClick={() => onSelect(today)}
            >
                Dzisiaj
            </Button>
        </div>
    )
}
