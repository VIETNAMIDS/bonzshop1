import { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
 
const Logo = () => {
   const groupRef = useRef<THREE.Group>(null);
   const primaryColor = '#a855f7';
   const secondaryColor = '#ec4899';
 
   useFrame((state) => {
     if (groupRef.current) {
       groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
     }
   });
 
   return (
     <Float
       speed={2}
       rotationIntensity={0.3}
       floatIntensity={0.5}
     >
       <group ref={groupRef}>
         {/* Main "B" shape using geometric forms */}
         <mesh position={[0, 0, 0]}>
           <torusKnotGeometry args={[1, 0.3, 128, 16, 2, 3]} />
           <meshStandardMaterial
             color={primaryColor}
             emissive={primaryColor}
             emissiveIntensity={0.4}
             metalness={0.8}
             roughness={0.2}
           />
         </mesh>
         
         {/* Orbiting rings */}
         <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
           <torusGeometry args={[2.2, 0.03, 16, 64]} />
           <meshStandardMaterial
             color={secondaryColor}
             emissive={secondaryColor}
             emissiveIntensity={0.5}
             transparent
             opacity={0.7}
           />
         </mesh>
         
         <mesh rotation={[0, 0, Math.PI / 3]} position={[0, 0, 0]}>
           <torusGeometry args={[2.5, 0.02, 16, 64]} />
           <meshStandardMaterial
             color={primaryColor}
             emissive={primaryColor}
             emissiveIntensity={0.5}
             transparent
             opacity={0.5}
           />
         </mesh>
 
         {/* Glowing core */}
         <mesh position={[0, 0, 0]}>
           <sphereGeometry args={[0.4, 32, 32]} />
           <meshStandardMaterial
             color="#ffffff"
             emissive={primaryColor}
             emissiveIntensity={2}
             transparent
             opacity={0.9}
           />
         </mesh>
       </group>
     </Float>
   );
};
 
 interface FloatingLogo3DProps {
   className?: string;
 }
 
 export function FloatingLogo3D({ className = '' }: FloatingLogo3DProps) {
   return (
     <div className={`w-full h-full ${className}`}>
       <Canvas
         camera={{ position: [0, 0, 6], fov: 50 }}
         style={{ background: 'transparent' }}
         dpr={[1, 2]}
         gl={{ antialias: true, alpha: true }}
       >
         <Suspense fallback={null}>
           <ambientLight intensity={0.4} />
           <pointLight position={[5, 5, 5]} intensity={1} color="#a855f7" />
           <pointLight position={[-5, -5, 5]} intensity={0.5} color="#ec4899" />
           <spotLight
             position={[0, 10, 0]}
             angle={0.3}
             penumbra={1}
             intensity={0.5}
             color="#ffffff"
           />
           <Logo />
         </Suspense>
       </Canvas>
     </div>
   );
 }