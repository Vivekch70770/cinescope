export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: {
      ink: '#0D0D0F', night: '#222228', char: '#19191D', edge: '#34343A',
      lime: '#B83232', 'lime-hover': '#D04444', sand: '#F1E5D5', mute: '#A7A19A',
    },
    fontFamily: { display: ['"Cormorant Garamond"', 'Georgia', 'serif'], sans: ['"DM Sans"', 'system-ui', 'sans-serif'] }
  } },
  plugins: []
}
