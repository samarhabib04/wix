import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
		fontFamily: {
			berkshire: ['var(--font-berkshire)', 'cursive'],
			sans: ['var(--font-inter)', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
			'playfair': ['"Playfair Display"', 'Georgia', 'serif'],
			'lora': ['Lora', 'Georgia', 'serif'],
			'inter': ['var(--font-inter)', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
		},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				'brand': {
					'dark-green': 'hsl(152, 18%, 26%)',
					'soft-green': 'hsl(102, 13%, 49%)',
					'light-green': 'hsl(108, 22%, 77%)',
				},
				'boost': {
					'bronze': 'hsl(var(--boost-bronze))',
					'silver': 'hsl(var(--boost-silver))',
					'gold': 'hsl(var(--boost-gold))',
				},
				'brown': {
					'50': '#fdf8f6',
					'100': '#f2e8e5',
					'200': '#eaddd7',
					'300': '#e0cec7',
					'400': '#d2bab0',
					'500': '#bfa094',
					'600': '#a18072',
					'700': '#977669',
					'800': '#846358',
					'900': '#43302b',
				},
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			zIndex: {
				'60': '60',
				'70': '70',
				'80': '80',
				'90': '90',
				'100': '100',
			},
			keyframes: {
                'pulseScale': {
                '0%, 100%': { transform: 'scale(1)', opacity: '1' },
                '50%': { transform: 'scale(1.05)', opacity: '0.9' },
                    },
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'pulse-shadow': {
					'0%, 100%': {
						boxShadow: '0 0 0 rgba(115, 138, 110, 0.4)'
					},
					'50%': {
						boxShadow: '0 0 20px rgba(115, 138, 110, 0.7)'
					}
				},
				'fade-in': {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' },
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'pulse-shadow': 'pulse-shadow 2s infinite',
				'pulseScale': 'pulseScale 4s ease-in-out infinite',
				'fade-in': 'fade-in 1s ease-out',
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			boxShadow: {
				'boost-bronze': '0 0 0 2px hsl(var(--boost-bronze) / 0.3), 0 0 12px hsl(var(--boost-bronze) / 0.4)',
				'boost-silver': '0 0 0 2px hsl(var(--boost-silver) / 0.3), 0 0 12px hsl(var(--boost-silver) / 0.4)',
				'boost-gold': '0 0 0 2px hsl(var(--boost-gold) / 0.3), 0 0 12px hsl(var(--boost-gold) / 0.4)',
			},
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
































