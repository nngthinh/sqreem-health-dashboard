import autoprefixer from 'autoprefixer'

// Tailwind's Vite plugin already prefixes its own output through Lightning CSS,
// so this runs as a safety net over any hand-written CSS and stays a no-op while
// the browserslist in package.json matches Tailwind v4's own support floor.
export default { plugins: [autoprefixer()] }
