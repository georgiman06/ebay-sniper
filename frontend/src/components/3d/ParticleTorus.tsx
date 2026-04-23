'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function TorusKnotParticles() {
  const pointsRef = useRef<THREE.Points>(null)

  const { positions, colors } = useMemo(() => {
    const torusKnot = new THREE.TorusKnotGeometry(1.5, 0.5, 256, 32)
    const positionAttribute = torusKnot.attributes.position
    const count = positionAttribute.count

    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      positions[i * 3] = positionAttribute.getX(i)
      positions[i * 3 + 1] = positionAttribute.getY(i)
      positions[i * 3 + 2] = positionAttribute.getZ(i)

      // Rainbow gradient based on position
      const t = i / count
      const hue = t * 360
      const color = new THREE.Color()
      color.setHSL(hue / 360, 0.8, 0.5)

      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    return { positions, colors }
  }, [])

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.x = state.clock.elapsedTime * 0.1
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.15
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
      />
    </points>
  )
}

export default function ParticleTorus() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <TorusKnotParticles />
      </Canvas>
    </div>
  )
}
