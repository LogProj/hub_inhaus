export default function EnjoeiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-navy/10 pb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo_enjoei.svg" alt="Enjoei" className="h-9 w-auto" />
        <span className="text-sm font-semibold text-navy">Enjoei</span>
      </div>
      {children}
    </div>
  )
}
