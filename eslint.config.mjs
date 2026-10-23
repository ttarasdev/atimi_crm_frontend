import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

export default defineConfig([
    ...nextVitals,
    ...nextTs,
    {
        rules: {
            'padding-line-between-statements': [
                'error',
                { blankLine: 'always', prev: '*', next: '*' },
                { blankLine: 'any', prev: 'import', next: 'import' },
            ],
            'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],
            'lines-between-class-members': ['error', 'always'],
        },
    },
    globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
])
