import { useState, useCallback } from 'react'
import Game from './components/Game'
import HUD from './components/HUD'

function App() {
  const [speed, setSpeed] = useState(0)
  const [distance, setDistance] = useState(0)

  const handleSpeed = useCallback((v) => setSpeed(v), [])
  const handleDistance = useCallback((v) => setDistance(v), [])

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-900 to-slate-950 relative">
      <div className="absolute inset-0">
        <Game onSpeedChange={handleSpeed} onDistanceChange={handleDistance} />
      </div>

      <HUD speed={speed} distance={distance} />

      <div className="pointer-events-auto absolute top-6 left-1/2 -translate-x-1/2">
        <a href="/test" className="text-white/70 hover:text-white text-sm bg-white/5 px-3 py-1.5 rounded-full border border-white/10">Check backend</a>
      </div>
    </div>
  )
}

export default App
