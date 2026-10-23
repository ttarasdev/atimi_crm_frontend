'use client'

import { useId } from 'react'
import c from './FormColorInput.module.scss'

const colors = [
    '#4676B4',
    '#7390BA',
    '#5A90A2',
    '#7B86B2',
    '#508B77',
    '#B18B4E',
    '#B46F7C',
    '#718095',
]

interface Props {
    inputTitle: string
    value: string
    onChange: (value: string) => void
    disabled?: boolean
}

export function FormColorInput({
    inputTitle,
    value,
    onChange,
    disabled = false,
}: Props) {
    const id = useId()

    return (
        <fieldset className={c.field} disabled={disabled}>
            <legend className={c.label}>{inputTitle}</legend>
            <div className={c.controls}>
                {colors.map((color) => (
                    <label
                        key={color}
                        className={c.swatch}
                        style={{ color }}
                        title={color}
                    >
                        <input
                            type="radio"
                            name={`${id}-color`}
                            value={color}
                            checked={value.toUpperCase() === color}
                            aria-label={`Kolor ${color}`}
                            onChange={() => onChange(color)}
                        />
                        <span aria-hidden="true" />
                    </label>
                ))}
                <label className={c.custom} htmlFor={id}>
                    <input
                        id={id}
                        type="color"
                        value={value}
                        aria-label="Własny kolor"
                        onChange={(event) =>
                            onChange(event.target.value.toUpperCase())
                        }
                    />
                    <span>{value.toUpperCase()}</span>
                </label>
            </div>
        </fieldset>
    )
}
