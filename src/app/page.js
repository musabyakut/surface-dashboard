
'use client';

import dynamic from 'next/dynamic'

// SurfaceDashboard bileşenini istemci tarafında (client-side) yüklüyoruz
// çünkü tarayıcı API'larını kullanıyor
const SurfaceDashboard = dynamic(() => import('@/components/SurfaceDashboard'), {
  ssr: false
})

export default function Home() {
  return (
    <main>
      <SurfaceDashboard />
    </main>
  )
}