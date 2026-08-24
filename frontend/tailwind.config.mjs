/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // RowPoly identity: deep emerald + warm gold, Colombian without the
        // full flag-primary cliché. Neutral graphite base.
        base: {
          900: '#0e1512',
          800: '#14201b',
          700: '#1c2b24',
          600: '#26382f',
        },
        gold: {
          400: '#f4c430',
          500: '#e0ae1f',
        },
        emerald: {
          500: '#1f8f5f',
          600: '#177a4f',
        },
        coral: '#ef5b5b',
      },
      fontFamily: {
        display: ['"Poppins"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
