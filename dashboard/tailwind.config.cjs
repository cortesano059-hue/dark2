/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--color-background)",
                foreground: "var(--color-foreground)",
                card: {
                    DEFAULT: "var(--color-card)",
                    secondary: "var(--color-card-secondary)",
                    foreground: "var(--color-card-foreground)",
                },
                primary: {
                    DEFAULT: "var(--color-primary)",
                    foreground: "var(--color-primary-foreground)",
                },
                secondary: {
                    DEFAULT: "var(--color-secondary)",
                    foreground: "var(--color-secondary-foreground)",
                },
                accent: {
                    DEFAULT: "var(--color-accent)",
                    foreground: "var(--color-accent-foreground)",
                },
                muted: {
                    DEFAULT: "var(--color-muted)",
                    foreground: "var(--color-muted-foreground)",
                },
                border: "var(--color-border)",
                input: "var(--color-input)",
                ring: "var(--color-ring)",
            },
            borderRadius: {
                '3xl': "var(--radius-3xl)",
                '2xl': "var(--radius-2xl)",
                'xl': "var(--radius-xl)",
                'lg': "var(--radius-lg)",
            }
        },
    },
    plugins: [],
}
