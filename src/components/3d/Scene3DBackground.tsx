import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
 
const FloatingShape = ({ 
   position, 
   shape, 
   color, 
   scale = 1,
   speed = 1
 }: { 
   position: [number, number, number]; 
   shape: 'torus' | 'box' | 'sphere' | 'octahedron' | 'icosahedron';
   color: string;
   scale?: number;
   speed?: number;
}) => {
   const meshRef = useRef<THREE.Mesh>(null);
 
   useFrame((state) => {
     if (meshRef.current) {
       meshRef.current.rotation.x += 0.002 * speed;
       meshRef.current.rotation.y += 0.003 * speed;
     }
   });
 
   const material = useMemo(() => (
     <meshStandardMaterial
       color={color}
       transparent
       opacity={0.6}
       wireframe
       emissive={color}
       emissiveIntensity={0.3}
     />
   ), [color]);
 
  const renderShape = () => {
    switch (shape) {
      case 'torus':
        return <mesh ref={meshRef} scale={scale}><torusGeometry args={[1, 0.4, 16, 32]} />{material}</mesh>;
      case 'box':
        return <mesh ref={meshRef} scale={scale}><boxGeometry args={[1.5, 1.5, 1.5]} />{material}</mesh>;
      case 'sphere':
        return <mesh ref={meshRef} scale={scale}><sphereGeometry args={[1, 16, 16]} />{material}</mesh>;
      case 'octahedron':
        return <mesh ref={meshRef} scale={scale}><octahedronGeometry args={[1]} />{material}</mesh>;
      case 'icosahedron':
        return <mesh ref={meshRef} scale={scale}><icosahedronGeometry args={[1]} />{material}</mesh>;
      default:
        return null;
    }
   };
 
   return (
     <Float
       speed={speed}
       rotationIntensity={0.5}
       floatIntensity={0.8}
       position={position}
     >
      {renderShape()}
     </Float>
   );
};
 
const Particles = () => {
   const particlesRef = useRef<THREE.Points>(null);
   
   const particleCount = 100;
   const positions = useMemo(() => {
     const pos = new Float32Array(particleCount * 3);
     for (let i = 0; i < particleCount; i++) {
       pos[i * 3] = (Math.random() - 0.5) * 30;
       pos[i * 3 + 1] = (Math.random() - 0.5) * 30;
       pos[i * 3 + 2] = (Math.random() - 0.5) * 15;
     }
     return pos;
   }, []);
 
   useFrame((state) => {
     if (particlesRef.current) {
       particlesRef.current.rotation.y += 0.0005;
     }
   });
 
   return (
     <points ref={particlesRef}>
       <bufferGeometry>
         <bufferAttribute
           attach="attributes-position"
           args={[positions, 3]}
         />
       </bufferGeometry>
       <pointsMaterial
         size={0.05}
         color="#a855f7"
         transparent
         opacity={0.6}
         sizeAttenuation
       />
     </points>
   );
};
 
 function Scene() {
   return (
     <>
       <ambientLight intensity={0.3} />
       <pointLight position={[10, 10, 10]} intensity={0.5} color="#a855f7" />
       <pointLight position={[-10, -10, -10]} intensity={0.3} color="#ec4899" />
 
       {/* Floating shapes */}
       <FloatingShape position={[-6, 3, -5]} shape="torus" color="#a855f7" scale={0.8} speed={1.2} />
       <FloatingShape position={[7, -2, -8]} shape="octahedron" color="#ec4899" scale={1.2} speed={0.8} />
       <FloatingShape position={[-4, -4, -6]} shape="icosahedron" color="#f97316" scale={0.6} speed={1.5} />
       <FloatingShape position={[5, 4, -10]} shape="box" color="#a855f7" scale={0.7} speed={1} />
       <FloatingShape position={[-8, 0, -12]} shape="sphere" color="#ec4899" scale={1} speed={0.6} />
       <FloatingShape position={[3, -5, -7]} shape="torus" color="#f97316" scale={0.5} speed={1.3} />
       <FloatingShape position={[0, 5, -15]} shape="octahedron" color="#a855f7" scale={1.5} speed={0.4} />
       <FloatingShape position={[-3, 2, -4]} shape="icosahedron" color="#ec4899" scale={0.4} speed={1.8} />
 
       <Particles />
     </>
   );
 }
 
 export function Scene3DBackground() {
   return (
     <div className="fixed inset-0 -z-10 pointer-events-none">
       <Canvas
         camera={{ position: [0, 0, 10], fov: 60 }}
         style={{ background: 'transparent' }}
         dpr={[1, 1.5]}
         gl={{ 
           antialias: true, 
           alpha: true,
           powerPreference: 'high-performance'
         }}
       >
         <Suspense fallback={null}>
           <Scene />
         </Suspense>
       </Canvas>
     </div>
   );
 }