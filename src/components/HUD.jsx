import { useEffect, useRef } from 'react'

export default function HUD({ speed = 0, distance = 0 }) {
  const speedRef = useRef(null)
  const distRef = useRef(null)

  useEffect(() => {
    if (speedRef.current) speedRef.current.textContent = Math.round(speed)
    if (distRef.current) distRef.current.textContent = distance.toFixed(1)
  }, [speed, distance])

  return (
    <div className="pointer-events-none fixed inset-0 flex flex-col justify-between p-6">
      <div className="flex items-center justify-between">
        <div className="text-white/70 text-sm uppercase tracking-widest">Road Runner</div>
        <div className="text-white/70 text-xs">WASD / Arrow Keys to steer</div>
      </div>

      <div className="self-start">
        <div className="bg-black/40 backdrop-blur rounded-xl p-4 border border-white/10">
          <div className="text-5xl font-bold text-white"><span ref={speedRef}>0</span><span className="text-white/60 text-2xl"> km/h</span></div>
          <div className="text-white/60 text-sm">Speed</div>
        </div>
      </div>

      <div className="self-end">
        <div className="bg-black/40 backdrop-blur rounded-xl p-4 border border-white/10 text-right">
          <div className="text-5xl font-bold text-white"><span ref={distRef}>0.0</span><span className="text-white/60 text-2xl"> km</span></div>
          <div className="text-white/60 text-sm">Distance</div>
        </div>
      </div>
    </div>
  )
}
