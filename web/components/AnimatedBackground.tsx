'use client'

export default function AnimatedBackground() {
  return (
    <>
      {/* Animated Blue Sparkles Background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Larger prominent sparkles with floating movement */}
        <div 
          className="absolute w-2 h-2 bg-blue-400/60 rounded-full shadow-lg shadow-blue-400/30"
          style={{
            top: '20%',
            left: '15%',
            animation: 'float 6s ease-in-out infinite, pulse 2s ease-in-out infinite',
            animationDelay: '0s'
          }}
        ></div>
        <div 
          className="absolute w-1.5 h-1.5 bg-blue-300/70 rounded-full shadow-lg shadow-blue-300/40"
          style={{
            top: '30%',
            right: '20%',
            animation: 'float 8s ease-in-out infinite, pulse 2.5s ease-in-out infinite',
            animationDelay: '1s'
          }}
        ></div>
        <div 
          className="absolute w-3 h-3 bg-blue-500/50 rounded-full shadow-lg shadow-blue-500/25"
          style={{
            top: '45%',
            left: '25%',
            animation: 'float 7s ease-in-out infinite, pulse 3s ease-in-out infinite',
            animationDelay: '2s'
          }}
        ></div>
        <div 
          className="absolute w-1 h-1 bg-blue-400/80 rounded-full shadow-lg shadow-blue-400/50"
          style={{
            top: '60%',
            right: '30%',
            animation: 'float 9s ease-in-out infinite, pulse 1.8s ease-in-out infinite',
            animationDelay: '3s'
          }}
        ></div>
        <div 
          className="absolute w-2.5 h-2.5 bg-blue-600/40 rounded-full shadow-lg shadow-blue-600/30"
          style={{
            top: '75%',
            left: '40%',
            animation: 'float 5s ease-in-out infinite, pulse 2.2s ease-in-out infinite',
            animationDelay: '4s'
          }}
        ></div>
        
        {/* Medium sparkles with different movement patterns */}
        <div 
          className="absolute w-1 h-1 bg-blue-300/60 rounded-full shadow-md shadow-blue-300/30"
          style={{
            top: '10%',
            right: '40%',
            animation: 'float 10s ease-in-out infinite, pulse 2.8s ease-in-out infinite',
            animationDelay: '0.5s'
          }}
        ></div>
        <div 
          className="absolute w-1.5 h-1.5 bg-blue-400/70 rounded-full shadow-md shadow-blue-400/40"
          style={{
            top: '35%',
            left: '60%',
            animation: 'float 6.5s ease-in-out infinite, pulse 2.1s ease-in-out infinite',
            animationDelay: '1.5s'
          }}
        ></div>
        <div 
          className="absolute w-1 h-1 bg-blue-500/60 rounded-full shadow-md shadow-blue-500/35"
          style={{
            top: '55%',
            right: '15%',
            animation: 'float 8.5s ease-in-out infinite, pulse 3.2s ease-in-out infinite',
            animationDelay: '2.5s'
          }}
        ></div>
        <div 
          className="absolute w-2 h-2 bg-blue-300/50 rounded-full shadow-md shadow-blue-300/25"
          style={{
            top: '80%',
            left: '20%',
            animation: 'float 7.5s ease-in-out infinite, pulse 2.6s ease-in-out infinite',
            animationDelay: '3.5s'
          }}
        ></div>
        
        {/* Smaller quick sparkles */}
        <div 
          className="absolute w-0.5 h-0.5 bg-blue-400/80 rounded-full"
          style={{
            top: '15%',
            left: '70%',
            animation: 'float 4s ease-in-out infinite, pulse 1.5s ease-in-out infinite',
            animationDelay: '0.8s'
          }}
        ></div>
        <div 
          className="absolute w-0.5 h-0.5 bg-blue-300/70 rounded-full"
          style={{
            top: '40%',
            right: '50%',
            animation: 'float 5.5s ease-in-out infinite, pulse 1.9s ease-in-out infinite',
            animationDelay: '1.8s'
          }}
        ></div>
        <div 
          className="absolute w-0.5 h-0.5 bg-blue-500/75 rounded-full"
          style={{
            top: '65%',
            left: '75%',
            animation: 'float 3.5s ease-in-out infinite, pulse 1.7s ease-in-out infinite',
            animationDelay: '2.8s'
          }}
        ></div>
        <div 
          className="absolute w-0.5 h-0.5 bg-blue-400/65 rounded-full"
          style={{
            top: '85%',
            right: '25%',
            animation: 'float 6s ease-in-out infinite, pulse 2.3s ease-in-out infinite',
            animationDelay: '3.8s'
          }}
        ></div>
        
        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-blue-900/5 to-blue-800/10"></div>
      </div>
      
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
          }
          25% {
            transform: translateY(-10px) translateX(5px);
          }
          50% {
            transform: translateY(-5px) translateX(-3px);
          }
          75% {
            transform: translateY(-15px) translateX(8px);
          }
        }
      `}</style>
    </>
  )
}
