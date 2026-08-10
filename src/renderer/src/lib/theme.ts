const QUERY = '(prefers-color-scheme: dark)'

export function installTheme(): void {
  const query = window.matchMedia(QUERY)
  const apply = (): void => {
    document.documentElement.classList.toggle('dark', query.matches)
  }

  apply()
  query.addEventListener('change', apply)
}
