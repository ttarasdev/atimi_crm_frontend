import c from './Legalization.module.scss'

export function ReminderMonthsInput({
    value,
    onChange,
    disabled = false,
}: {
    value: number[]
    onChange: (value: number[]) => void
    disabled?: boolean
}) {
    const choices = [...new Set([3, 2, 1, ...value])].sort((a, b) => b - a)

    return (
        <fieldset className={c.months} disabled={disabled}>
            <legend>Przypomnij przed końcem ważności</legend>
            {choices.map((month) => (
                <label key={month}>
                    <input
                        type="checkbox"
                        checked={value.includes(month)}
                        onChange={(event) =>
                            onChange(
                                event.target.checked
                                    ? [...value, month].sort((a, b) => b - a)
                                    : value.filter((item) => item !== month),
                            )
                        }
                    />
                    {month}{' '}
                    {month === 1
                        ? 'miesiąc'
                        : month < 5
                          ? 'miesiące'
                          : 'miesięcy'}
                </label>
            ))}
        </fieldset>
    )
}
