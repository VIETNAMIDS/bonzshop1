import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

interface StepSceneProps {
  step: number;
}

const ShoppingBag3D = () => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.5;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.15;
    }
  });
  return (
    <Float speed={2} rotationIntensity={0.4} floatIntensity={0.6}>
      <group ref={groupRef}>
        <mesh>
          <boxGeometry args={[1.4, 1.6, 0.8]} />
          <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.4} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 1, 0]}>
          <torusGeometry args={[0.5, 0.06, 16, 32]} />
          <meshStandardMaterial color="#60a5fa" emissive="#60a5fa" emissiveIntensity={0.6} />
        </mesh>
        {/* Sparkle particles */}
        {[...Array(6)].map((_, i) => (
          <mesh key={i} position={[
            Math.cos(i * Math.PI / 3) * 1.8,
            Math.sin(i * Math.PI / 3) * 1.2,
            Math.sin(i * 0.8) * 0.5
          ]}>
            <octahedronGeometry args={[0.12]} />
            <meshStandardMaterial color="#93c5fd" emissive="#93c5fd" emissiveIntensity={1} transparent opacity={0.8} />
          </mesh>
        ))}
      </group>
    </Float>
  );
};

const CoinStack3D = () => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.6;
    }
  });
  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
      <group ref={groupRef}>
        {[0, 0.25, 0.5, 0.75, 1].map((y, i) => (
          <mesh key={i} position={[0, y - 0.5, 0]} rotation={[Math.PI / 2, 0, i * 0.2]}>
            <cylinderGeometry args={[0.8, 0.8, 0.15, 32]} />
            <meshStandardMaterial
              color="#f59e0b"
              emissive="#f59e0b"
              emissiveIntensity={0.5}
              metalness={0.9}
              roughness={0.1}
            />
          </mesh>
        ))}
        <mesh position={[1.5, 0.3, 0]}>
          <torusGeometry args={[0.4, 0.08, 16, 32]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.8} />
        </mesh>
      </group>
    </Float>
  );
};

const Community3D = () => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.4;
    }
  });
  const colors = ['#22c55e', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.7}>
      <group ref={groupRef}>
        {colors.map((color, i) => {
          const angle = (i / colors.length) * Math.PI * 2;
          const radius = 1.2;
          return (
            <mesh key={i} position={[Math.cos(angle) * radius, Math.sin(angle) * radius * 0.5, Math.sin(angle) * 0.5]}>
              <sphereGeometry args={[0.35, 32, 32]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} metalness={0.6} roughness={0.3} />
            </mesh>
          );
        })}
        {/* Central connection hub */}
        <mesh>
          <icosahedronGeometry args={[0.5]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.6} wireframe />
        </mesh>
        {/* Connection lines as thin torus */}
        {[0, 1, 2].map((i) => (
          <mesh key={`ring-${i}`} rotation={[i * 0.8, i * 0.5, 0]}>
            <torusGeometry args={[1.2, 0.015, 8, 64]} />
            <meshStandardMaterial color="#34d399" emissive="#34d399" emissiveIntensity={0.5} transparent opacity={0.4} />
          </mesh>
        ))}
      </group>
    </Float>
  );
};

const Welcome3D = () => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.3;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });
  return (
    <Float speed={2} rotationIntensity={0.4} floatIntensity={0.6}>
      <group ref={groupRef}>
        <mesh>
          <torusKnotGeometry args={[0.9, 0.3, 128, 16, 2, 3]} />
          <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={0.5} metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2, 0.03, 16, 64]} />
          <meshStandardMaterial color="#ec4899" emissive="#ec4899" emissiveIntensity={0.6} transparent opacity={0.6} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 3]}>
          <torusGeometry args={[2.3, 0.02, 16, 64]} />
          <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={0.5} transparent opacity={0.4} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.3, 32, 32]} />
          <meshStandardMaterial color="#ffffff" emissive="#a855f7" emissiveIntensity={2} transparent opacity={0.9} />
        </mesh>
      </group>
    </Float>
  );
};

const StepScene = ({ step }: StepSceneProps) => {
  switch (step) {
    case 0: return <Welcome3D />;
    case 1: return <ShoppingBag3D />;
    case 2: return <CoinStack3D />;
    case 3: return <Community3D />;
    default: return <Welcome3D />;
  }
};

const lightConfigs = [
  { primary: '#a855f7', secondary: '#ec4899' },
  { primary: '#3b82f6', secondary: '#06b6d4' },
  { primary: '#f59e0b', secondary: '#f97316' },
  { primary: '#22c55e', secondary: '#10b981' },
];

export function OnboardingScene3D({ step }: { step: number }) {
  const config = lightConfigs[step] || lightConfigs[0];

  return (
    <div className="w-full h-48 sm:h-56">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ background: 'transparent' }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <pointLight position={[5, 5, 5]} intensity={1} color={config.primary} />
          <pointLight position={[-5, -5, 5]} intensity={0.5} color={config.secondary} />
          <spotLight position={[0, 8, 0]} angle={0.3} penumbra={1} intensity={0.4} />
          <StepScene step={step} />
        </Suspense>
      </Canvas>
    </div>
  );
}
