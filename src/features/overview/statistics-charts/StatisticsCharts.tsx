'use client'

import { useId } from 'react'

import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'
import type { CrmStatistics } from '@/api/crm-overview/crm-overview.types'
import { clientStatuses } from '../overview-labels'
import c from './StatisticsCharts.module.scss'

const tooltipStyle = {
    border: '1px solid #DCE5EF',
    borderRadius: 12,
    fontSize: 12,
    boxShadow: '0 8px 30px #24395412',
}

function ChartData({
    headings,
    rows,
}: {
    headings: string[]
    rows: { label: string; values: number[] }[]
}) {
    return (
        <details className={c.data}>
            <summary>Pokaż dane wykresu</summary>
            <div>
                <table>
                    <thead>
                        <tr>
                            {headings.map((heading) => (
                                <th key={heading} scope="col">
                                    {heading}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.label}>
                                <th scope="row">{row.label}</th>
                                {row.values.map((value, index) => (
                                    <td key={index}>{value}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </details>
    )
}

export function GrowthChart({
    data,
    compact = false,
}: {
    data: CrmStatistics['monthly']
    compact?: boolean
}) {
    const gradientId = useId()

    const rows = data.map((item) => ({
        ...item,
        label: new Intl.DateTimeFormat('pl-PL', {
            month: 'short',
            year: '2-digit',
            timeZone: 'UTC',
        }).format(new Date(`${item.month}-15T12:00:00Z`)),
    }))

    const totals = data.reduce(
        (total, row) => ({
            clients: total.clients + row.clients,
            completedProcesses:
                total.completedProcesses + row.completedProcesses,
        }),
        { clients: 0, completedProcesses: 0 },
    )

    return (
        <figure
            className={c.figure}
            aria-label="Wykres nowych klientów i zakończonych spraw według miesiąca"
        >
            {totals.clients || totals.completedProcesses ? (
                <div className={`${c.chart} ${compact ? c.compact : ''}`}>
                    <ResponsiveContainer
                        width="100%"
                        height="100%"
                        minWidth={0}
                    >
                        <AreaChart
                            data={rows}
                            margin={{ top: 10, right: 8, left: -22, bottom: 0 }}
                            accessibilityLayer
                        >
                            <defs>
                                <linearGradient
                                    id={gradientId}
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop
                                        offset="0%"
                                        stopColor="#4676B4"
                                        stopOpacity={0.2}
                                    />
                                    <stop
                                        offset="100%"
                                        stopColor="#4676B4"
                                        stopOpacity={0.015}
                                    />
                                </linearGradient>
                            </defs>
                            <CartesianGrid stroke="#EBF0F5" vertical={false} />
                            <XAxis
                                dataKey="label"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11, fill: '#7A879A' }}
                            />
                            <YAxis
                                allowDecimals={false}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11, fill: '#7A879A' }}
                            />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend
                                iconType="circle"
                                wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                            />
                            <Area
                                isAnimationActive={false}
                                type="monotone"
                                dataKey="clients"
                                name="Nowi klienci"
                                stroke="#4676B4"
                                strokeWidth={2.5}
                                fill={`url(#${gradientId})`}
                            />
                            <Area
                                isAnimationActive={false}
                                type="monotone"
                                dataKey="completedProcesses"
                                name="Zakończone sprawy"
                                stroke="#438F73"
                                strokeWidth={2}
                                fill="transparent"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className={`${c.empty} ${compact ? c.compactEmpty : ''}`}>
                    <strong>Brak nowych klientów i zakończonych spraw</strong>
                    <span>
                        W wybranym okresie nie zapisano jeszcze tych zdarzeń.
                    </span>
                </div>
            )}
            <figcaption className={c.summary}>
                Nowi klienci: {totals.clients} · Zakończone sprawy:{' '}
                {totals.completedProcesses}
            </figcaption>
            <ChartData
                headings={['Miesiąc', 'Nowi klienci', 'Zakończone sprawy']}
                rows={rows.map((row) => ({
                    label: row.label,
                    values: [row.clients, row.completedProcesses],
                }))}
            />
        </figure>
    )
}

export function StatusChart({ data }: { data: CrmStatistics['clients'] }) {
    const rows = data.map((item) => ({
        name: clientStatuses[item.key]?.title ?? item.key,
        value: item.total,
        color: clientStatuses[item.key]?.color ?? '#4676B4',
    }))

    const total = rows.reduce((sum, row) => sum + row.value, 0)

    return (
        <figure
            className={c.figure}
            aria-label="Podział klientów według statusu"
        >
            {total ? (
                <div className={c.chart}>
                    <ResponsiveContainer
                        width="100%"
                        height="100%"
                        minWidth={0}
                    >
                        <PieChart accessibilityLayer>
                            <Pie
                                isAnimationActive={false}
                                data={rows}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={62}
                                outerRadius={92}
                                paddingAngle={3}
                                stroke="none"
                            >
                                {rows.map((row) => (
                                    <Cell key={row.name} fill={row.color} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend
                                iconType="circle"
                                wrapperStyle={{ fontSize: 11 }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className={c.empty}>
                    <strong>Brak klientów do podziału</strong>
                    <span>Statusy pojawią się po dodaniu klientów.</span>
                </div>
            )}
            <figcaption className={c.summary}>
                Klienci w zestawieniu: {total}
            </figcaption>
            <ChartData
                headings={['Status', 'Klienci']}
                rows={rows.map((row) => ({
                    label: row.name,
                    values: [row.value],
                }))}
            />
        </figure>
    )
}

export function SourcesChart({ data }: { data: CrmStatistics['sources'] }) {
    const total = data.reduce((sum, row) => sum + row.total, 0)

    return (
        <figure
            className={c.figure}
            aria-label="Liczba klientów według źródła kontaktu"
        >
            {total ? (
                <div
                    className={c.chart}
                    style={{ height: Math.max(270, data.length * 34 + 35) }}
                >
                    <ResponsiveContainer
                        width="100%"
                        height="100%"
                        minWidth={0}
                    >
                        <BarChart
                            data={data}
                            layout="vertical"
                            margin={{ top: 8, right: 20, left: 0, bottom: 0 }}
                            accessibilityLayer
                        >
                            <CartesianGrid
                                stroke="#EBF0F5"
                                horizontal={false}
                            />
                            <XAxis
                                type="number"
                                allowDecimals={false}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11 }}
                            />
                            <YAxis
                                type="category"
                                dataKey="name"
                                width={110}
                                tickFormatter={(value: string) =>
                                    value.length > 18
                                        ? `${value.slice(0, 17)}…`
                                        : value
                                }
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11, fill: '#64748B' }}
                            />
                            <Tooltip
                                contentStyle={tooltipStyle}
                                cursor={{ fill: '#4676B408' }}
                            />
                            <Bar
                                isAnimationActive={false}
                                dataKey="total"
                                name="Klienci"
                                fill="#4676B4"
                                radius={[0, 5, 5, 0]}
                                maxBarSize={22}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className={c.empty}>
                    <strong>Brak źródeł kontaktu do porównania</strong>
                    <span>Dane pojawią się wraz z klientami.</span>
                </div>
            )}
            <figcaption className={c.summary}>
                Klienci według źródeł: {total}
            </figcaption>
            <ChartData
                headings={['Źródło kontaktu', 'Klienci']}
                rows={data.map((row) => ({
                    label: row.name,
                    values: [row.total],
                }))}
            />
        </figure>
    )
}
