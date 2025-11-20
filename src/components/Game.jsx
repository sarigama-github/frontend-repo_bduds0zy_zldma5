import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// Simple pseudo-noise using sum of sines for gentle road curves
function roadCurve(t) {
  return Math.sin(t * 0.05) * 6 + Math.sin(t * 0.013) * 4
}

export default function Game({ running = true, onDistanceChange, onSpeedChange }) {
  const mountRef = useRef(null)
  const stateRef = useRef({})

  useEffect(() => {
    const mount = mountRef.current
    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0x0a0f1f, 60, 300)

    const camera = new THREE.PerspectiveCamera(70, mount.clientWidth / mount.clientHeight, 0.1, 1000)
    camera.position.set(0, 3, 8)

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x05070f)
    mount.appendChild(renderer.domElement)

    // Lighting
    const hemi = new THREE.HemisphereLight(0xbfd4ff, 0x223344, 0.6)
    scene.add(hemi)
    const dir = new THREE.DirectionalLight(0xffffff, 0.6)
    dir.position.set(20, 30, 10)
    scene.add(dir)

    // Ground
    const groundGeo = new THREE.PlaneGeometry(1000, 1000, 1, 1)
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x0a1a24 })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.01
    ground.receiveShadow = true
    scene.add(ground)

    // Road segments (recycled)
    const SEG_LEN = 20
    const SEG_COUNT = 20
    const ROAD_WIDTH = 6

    const roadMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 1 })
    const roadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, SEG_LEN)

    const laneMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const laneGeo = new THREE.PlaneGeometry(0.1, SEG_LEN)

    const segments = []
    for (let i = 0; i < SEG_COUNT; i++) {
      const seg = new THREE.Mesh(roadGeo, roadMat)
      seg.rotation.x = -Math.PI / 2
      seg.position.z = -i * SEG_LEN
      scene.add(seg)

      // lane markings (center dashed)
      const mark = new THREE.Mesh(laneGeo, laneMat)
      mark.rotation.x = -Math.PI / 2
      mark.position.set(0, 0.005, seg.position.z)
      scene.add(mark)

      segments.push({ seg, mark })
    }

    // Decorative roadside posts
    const posts = []
    const postGeo = new THREE.CylinderGeometry(0.07, 0.07, 1.2, 8)
    const postMat = new THREE.MeshStandardMaterial({ color: 0x223040, roughness: 0.9 })
    for (let i = 0; i < 60; i++) {
      const left = new THREE.Mesh(postGeo, postMat)
      const right = new THREE.Mesh(postGeo, postMat)
      left.position.set(-ROAD_WIDTH * 0.75, 0.6, -i * 8)
      right.position.set(ROAD_WIDTH * 0.75, 0.6, -i * 8 - 4)
      scene.add(left, right)
      posts.push(left, right)
    }

    // State
    const state = {
      running: true,
      speed: 0, // m/s approx
      maxSpeed: 30,
      accel: 8,
      friction: 3,
      steer: 0,
      steerRate: 1.8,
      x: 0,
      distance: 0,
      tCurve: 0, // curve position
      lastTime: performance.now(),
      keys: {},
    }
    stateRef.current = state

    // Input
    function onKeyDown(e) {
      state.keys[e.code] = true
    }
    function onKeyUp(e) {
      state.keys[e.code] = false
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    // Resize
    function onResize() {
      const w = mount.clientWidth
      const h = mount.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    // Animation loop
    let raf
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const now = performance.now()
      let dt = (now - state.lastTime) / 1000
      if (dt > 0.05) dt = 0.05
      state.lastTime = now

      // Update controls
      const accelerating = state.keys['ArrowUp'] || state.keys['KeyW']
      const braking = state.keys['ArrowDown'] || state.keys['KeyS']
      const left = state.keys['ArrowLeft'] || state.keys['KeyA']
      const right = state.keys['ArrowRight'] || state.keys['KeyD']

      if (accelerating) state.speed += state.accel * dt
      if (braking) state.speed -= state.accel * 2 * dt
      state.speed -= state.friction * dt
      state.speed = Math.max(0, Math.min(state.speed, state.maxSpeed))

      // steering scales with speed
      let steerInput = 0
      if (left) steerInput -= 1
      if (right) steerInput += 1
      state.steer = THREE.MathUtils.damp(state.steer, steerInput, 8, dt)
      state.x += state.steer * state.steerRate * (state.speed / state.maxSpeed) * dt * 2.5
      state.x = THREE.MathUtils.clamp(state.x, -ROAD_WIDTH * 0.45, ROAD_WIDTH * 0.45)

      // Move forward
      const dz = state.speed * dt
      state.distance += dz / 1000 // convert to km approx if we treat units as meters
      state.tCurve += dz

      // Place segments along curve
      for (let i = 0; i < segments.length; i++) {
        const { seg, mark } = segments[i]
        seg.position.z += dz
        mark.position.z += dz
        if (seg.position.z > SEG_LEN) {
          seg.position.z -= SEG_COUNT * SEG_LEN
          mark.position.z = seg.position.z
        }
        const curveOffset = roadCurve((seg.position.z - 10) + state.tCurve)
        seg.position.x = curveOffset
        mark.position.x = curveOffset + 0
      }

      // Move posts and align to curve edges
      for (let p of posts) {
        p.position.z += dz
        if (p.position.z > 10) p.position.z -= 60 * 8
        const curveOffset = roadCurve(p.position.z + state.tCurve)
        const side = p.position.x > 0 ? 1 : -1
        p.position.x = curveOffset + side * ROAD_WIDTH * 0.8
      }

      // Camera follows player x and looks ahead
      const lookAhead = 12
      const camTargetX = roadCurve(state.tCurve + lookAhead) + state.x
      const camPosX = THREE.MathUtils.damp(camera.position.x, camTargetX, 4, dt)
      camera.position.x = camPosX
      camera.position.y = 2.6
      camera.position.z = 6
      const lookAt = new THREE.Vector3(roadCurve(state.tCurve + 18) + state.x, 1.2, -8)
      camera.lookAt(lookAt)

      // HUD callbacks
      onSpeedChange && onSpeedChange(state.speed * 3.6) // km/h
      onDistanceChange && onDistanceChange(state.distance)

      renderer.render(scene, camera)
    }

    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('resize', onResize)
      mount.removeChild(renderer.domElement)
      renderer.dispose()
      groundGeo.dispose(); groundMat.dispose()
      roadGeo.dispose(); roadMat.dispose()
      laneGeo.dispose(); laneMat.dispose()
      postGeo.dispose(); postMat.dispose()
    }
  }, [])

  // React to external running prop (pause)
  useEffect(() => {
    stateRef.current.running = running
  }, [running])

  return (
    <div ref={mountRef} className="w-full h-full" />
  )
}
