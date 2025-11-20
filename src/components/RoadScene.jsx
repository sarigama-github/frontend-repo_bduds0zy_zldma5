import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

// Simple endless road scene inspired by slowroads.io
// Keyboard controls: arrows / WASD
export default function RoadScene({ onTick }) {
  const mountRef = useRef(null)
  const requestRef = useRef(0)
  const [ready, setReady] = useState(false)

  // player state
  const player = useRef({ x: 0, z: 0, speed: 0, heading: 0 })

  // input state
  const input = useRef({ left: false, right: false, up: false, down: false })

  useEffect(() => {
    let scene, camera, renderer
    let road
    let clock = new THREE.Clock()

    const init = () => {
      scene = new THREE.Scene()

      // background gradient sky
      const skyTop = new THREE.Color(0x87ceeb)
      const skyBottom = new THREE.Color(0xf5f3ff)
      const skyUniforms = {
        topColor: { value: skyTop },
        bottomColor: { value: skyBottom },
        offset: { value: 400 },
        exponent: { value: 0.6 }
      }
      scene.fog = new THREE.Fog(skyBottom, 60, 200)

      camera = new THREE.PerspectiveCamera(70, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000)
      camera.position.set(0, 2.2, -5)
      camera.lookAt(0, 1, 5)

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
      renderer.setClearColor(0x000000, 0)
      mountRef.current.appendChild(renderer.domElement)

      // lighting
      const ambient = new THREE.AmbientLight(0xffffff, 0.6)
      scene.add(ambient)
      const dir = new THREE.DirectionalLight(0xffffff, 0.8)
      dir.position.set(5, 10, -5)
      scene.add(dir)

      // ground
      const groundGeo = new THREE.PlaneGeometry(200, 200, 1, 1)
      const groundMat = new THREE.MeshLambertMaterial({ color: 0x8ec07c })
      const ground = new THREE.Mesh(groundGeo, groundMat)
      ground.rotation.x = -Math.PI / 2
      ground.position.z = 50
      scene.add(ground)

      // road - long thin plane with repeating texture-like stripes made procedurally
      const roadWidth = 4
      const roadLength = 200
      const roadGeo = new THREE.PlaneGeometry(roadWidth, roadLength, 1, 1)
      const roadMat = new THREE.MeshStandardMaterial({ color: 0x333333 })
      road = new THREE.Mesh(roadGeo, roadMat)
      road.rotation.x = -Math.PI / 2
      road.position.z = roadLength / 2
      scene.add(road)

      // lane lines (simple repeating boxes)
      const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffaa })
      for (let i = 0; i < 80; i++) {
        const line = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.01, 1), lineMat)
        line.position.set(0, 0.01, i * 2.5)
        scene.add(line)
      }

      // roadside objects for parallax
      const treeMat = new THREE.MeshLambertMaterial({ color: 0x2d6a4f })
      for (let i = 0; i < 60; i++) {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.6, 6), new THREE.MeshLambertMaterial({ color: 0x8d6e63 }))
        const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 0), treeMat)
        const group = new THREE.Group()
        trunk.position.y = 0.3
        crown.position.y = 1.0
        group.add(trunk)
        group.add(crown)
        const side = i % 2 === 0 ? -1 : 1
        group.position.set(side * (roadWidth/2 + 1.5 + Math.random()*1.5), 0, i * 4 + Math.random()*2)
        scene.add(group)
      }

      // handle resize
      const onResize = () => {
        if (!mountRef.current) return
        const w = mountRef.current.clientWidth
        const h = mountRef.current.clientHeight
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setSize(w, h)
      }
      window.addEventListener('resize', onResize)

      // input events
      const onKey = (e, down) => {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.current.left = down
        if (e.code === 'ArrowRight' || e.code === 'KeyD') input.current.right = down
        if (e.code === 'ArrowUp' || e.code === 'KeyW') input.current.up = down
        if (e.code === 'ArrowDown' || e.code === 'KeyS') input.current.down = down
      }
      window.addEventListener('keydown', (e) => onKey(e, true))
      window.addEventListener('keyup', (e) => onKey(e, false))

      setReady(true)

      const animate = () => {
        const dt = clock.getDelta()

        // accelerate / brake
        const targetSpeed = input.current.up ? 25 : input.current.down ? 5 : 12
        const accel = 5
        player.current.speed += (targetSpeed - player.current.speed) * Math.min(1, accel * dt)

        // steering
        const steer = (input.current.left ? -1 : 0) + (input.current.right ? 1 : 0)
        player.current.heading += steer * 0.9 * dt
        player.current.x += Math.sin(player.current.heading) * player.current.speed * dt
        player.current.z += Math.cos(player.current.heading) * player.current.speed * dt

        // camera follows slightly behind
        const camTarget = new THREE.Vector3(player.current.x * 0.1, 2.2, -5)
        camera.position.lerp(camTarget, 0.1)
        camera.lookAt(player.current.x, 1, camera.position.z + 10)

        // loop road by moving it forward relative to player z
        road.position.z = (player.current.z % roadLength)

        renderer.render(scene, camera)

        if (onTick) onTick({ speed: player.current.speed * 3.6 / 10, distance: player.current.z / 1000 })
        requestRef.current = requestAnimationFrame(animate)
      }

      animate()

      return () => {
        cancelAnimationFrame(requestRef.current)
        window.removeEventListener('resize', onResize)
        renderer.dispose()
        mountRef.current?.removeChild(renderer.domElement)
      }
    }

    init()

    return () => cancelAnimationFrame(requestRef.current)
  }, [])

  return <div ref={mountRef} className="absolute inset-0" />
}
