import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        sidrah: {
          50: '#eff6ee',
          100: '#d4e8d4',
          200: '#a7d1a8',
          300: '#79b97b',
          400: '#4b9f51',
          500: '#1F5E3B',
          600: '#1a4d31',
          700: '#173e27',
          800: '#132f1d',
          900: '#0f2014'
        },
        gold: '#D7B56D',
        page: '#F8F8F8'
      },
      boxShadow: {
        soft: '0 20px 45px rgba(31,94,59,0.08)'
      }
    },
  },
  plugins: [],
};

export default config;
