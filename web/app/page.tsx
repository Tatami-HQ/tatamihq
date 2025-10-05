'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to dashboard since the app is live and working
    router.push('/dashboard')
  }, [router])

  return (
    <main
      style={{
        backgroundColor: '#0d1117',
        color: 'white',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '1.5rem'
      }}
    >
      Redirecting to dashboard...
    </main>
  );
}
