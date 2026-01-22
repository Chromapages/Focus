/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./features/**/*.{js,ts,jsx,tsx}",
        "./layout/**/*.{js,ts,jsx,tsx}",
        "./pages/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    primary: '#2C3892',  // Deep Indigo
                    accent: '#23698C',   // Electric Teal
                    base: '#EFEFED',     // Stardust
                    ink: '#030712',      // Void
                    text: '#0F172A',     // Primary Text
                }
            },
            fontFamily: {
                sans: ['Roboto', 'sans-serif'],
                heading: ['Roboto', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            transitionTimingFunction: {
                'aloha': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
            }
        },
    },
    plugins: [],
}
