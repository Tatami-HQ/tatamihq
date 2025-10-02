interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'responsive'
  className?: string
}

export default function Logo({ size = 'md', className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
    xl: 'text-8xl',
    responsive: 'text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl'
  }

  return (
    <div className={`font-bold font-sans uppercase tracking-wide ${sizeClasses[size]} ${className}`}>
      <span className="text-white">TATAMI</span>
      <span className="text-blue-500">HQ</span>
    </div>
  )
}
