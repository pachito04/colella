export default function Loading() {
  return (
    <div className="flex h-full w-full items-center justify-center p-10">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-[var(--color-brand-primary)]"></div>
        <p className="text-sm text-gray-500">Cargando panel...</p>
      </div>
    </div>
  )
}
