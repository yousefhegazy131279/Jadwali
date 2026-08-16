import Image from 'next/image'

interface LogoProps {
  className?: string
}

export function Logo({ className }: LogoProps) {
  return (
    <div className={`relative w-full h-full ${className}`}>
      <Image
        src="/logo.png"
        alt="شعار جَدْوَلِي"
        fill
        className="object-contain"
        priority
      />
    </div>
  )
}