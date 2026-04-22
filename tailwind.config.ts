import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f0e0e',
        surface: '#141313',
        'surface-dim': '#141313',
        'surface-bright': '#1c1b1b',
        'surface-variant': '#5b4039',
        'surface-container': '#211f1f',
        'surface-container-low': '#1c1b1b',
        'surface-container-high': '#2b2929',
        'surface-container-highest': '#363433',
        'surface-container-lowest': '#0f0e0e',
        'on-background': '#fcf9f8',
        'on-surface': '#fcf9f8',
        'on-surface-variant': '#e4beb4',
        primary: '#ff5722',
        'on-primary': '#690005',
        'primary-container': '#ff5722',
        'primary-fixed': '#ffdbd1',
        secondary: '#fabd00',
        'on-secondary': '#402f00',
        'secondary-container': '#6c5000',
        tertiary: '#78dc77',
        'tertiary-container': '#005313',
        outline: '#a48b84',
        'outline-variant': '#5b4039',
        error: '#ffb4ab',
        'error-container': '#93000a',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      spacing: {
        'container-padding': '20px',
        gutter: '12px',
      },
    },
  },
  plugins: [],
}
export default config
