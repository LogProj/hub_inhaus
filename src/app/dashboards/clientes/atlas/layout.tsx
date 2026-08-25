export default function AtlasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-navy/10 pb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo_atlas_copco.svg" alt="Atlas Copco" className="h-9 w-auto" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Cliente
        </span>
      </div>
      {children}
    </div>
  )
}
