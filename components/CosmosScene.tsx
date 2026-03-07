"use client";

import * as THREE from 'three';
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import { useStore } from '@/lib/store';

// Deterministic PRNG for React Purity
const seededRandom = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
};

const GALAXY_COLORS: Record<number, string> = {
  0: '#ffffff',
  1: '#3178c6',
  2: '#f1e05a',
  3: '#3572A5',
  4: '#dea584',
  5: '#00ADD8',
  6: '#b07219',
  7: '#372c61',
  8: '#178600',
  9: '#701516',
  10: '#4F5D95'
};

function Starships() {
  const graph = useStore((state) => state.graph);
  const selectedIdx = useStore((state) => state.selectedNodeIndex);
  const setSelectedNode = useStore((state) => state.setSelectedNode);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const colorArray = useMemo(() => new Float32Array((graph?.nodeCount || 0) * 3), [graph]);

  const shipGeometry = useMemo(() => {
    const geo = new THREE.ConeGeometry(0.5, 3.0, 3);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);

  useEffect(() => {
    if (!graph || !meshRef.current) return;

    const tempObject = new THREE.Object3D();
    const tempColor = new THREE.Color();

    for (let i = 0; i < graph.nodeCount; i++) {
      const x = graph.positions[i * 3];
      const y = graph.positions[i * 3 + 1];
      const z = graph.positions[i * 3 + 2];
      const starCount = graph.nodeData[i * 3 + 1];
      const isRoot = graph.nodeData[i * 3 + 2] === 1;
      const vitality = graph.intelligence[i * 3];
      const innovation = graph.intelligence[i * 3 + 1];
      const gravity = graph.intelligence[i * 3 + 2];

      tempObject.position.set(x, y, z);
      // Gravity affects scale
      const s = (0.5 + (Math.log10(starCount + 1)) * (0.8 + vitality * 0.4)) * (1 + gravity * 0.5);
      tempObject.scale.set(s, s, s);
      tempObject.lookAt(0, 0, 0); 
      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);

      if (isRoot) {
        tempColor.set('#fbbf24').multiplyScalar(1.5 + gravity);
      } else if (innovation > 0.7) {
        tempColor.set('#4ade80').multiplyScalar(1.5); // Innovation Green
      } else if (vitality < 0.2) {
        tempColor.set('#ef4444').multiplyScalar(0.5); // Abandoned Red
      } else {
        tempColor.set(GALAXY_COLORS[i % 11] || '#3b82f6');
      }
      
      if (selectedIdx === i) tempColor.multiplyScalar(4.0);
      tempColor.toArray(colorArray, i * 3);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [graph, colorArray, selectedIdx]);

  const timelineYear = useStore((state) => state.timelineYear);

  useFrame((state) => {
    if (!meshRef.current || !graph) return;
    const time = state.clock.getElapsedTime();
    const tempMatrix = new THREE.Matrix4();
    const tempObject = new THREE.Object3D();

    for (let i = 0; i < graph.nodeCount; i++) {
        const nodeIdx3 = i * 3;
        const nodeIdx4 = i * 4;
        
        const isRoot = graph.nodeData[nodeIdx3 + 2] === 1;
        const x = graph.positions[nodeIdx3];
        const y = graph.positions[nodeIdx3 + 1];
        const z = graph.positions[nodeIdx3 + 2];
        const vitality = graph.intelligence[nodeIdx4];
        const innovation = graph.intelligence[nodeIdx4 + 1];
        const pushedYear = graph.intelligence[nodeIdx4 + 3];
        
        // Software Evolution Simulation: Hide future nodes
        if (pushedYear > timelineYear) {
            tempObject.scale.set(0, 0, 0);
            tempObject.position.set(0, -9999, 0); // Hide in the void
            tempObject.updateMatrix();
            meshRef.current.setMatrixAt(i, tempObject.matrix);
            continue;
        }

        meshRef.current.getMatrixAt(i, tempMatrix);
        tempObject.matrix.copy(tempMatrix);
        tempObject.matrix.decompose(tempObject.position, tempObject.quaternion, tempObject.scale);

        if (!isRoot) {
            const px = graph.positions[0], py = graph.positions[1], pz = graph.positions[2];
            const dx = x - px, dz = z - pz;
            const r = Math.sqrt(dx * dx + dz * dz);
            const v = 0.5 / (Math.sqrt(r) || 1);
            const currentTheta = Math.atan2(dz, dx);
            const newTheta = currentTheta + v * 0.1;
            
            tempObject.position.x = px + Math.cos(newTheta) * r;
            tempObject.position.z = pz + Math.sin(newTheta) * r;
            
            const flicker = vitality < 0.3 ? (Math.sin(time * 10 + i) > 0.5 ? 1 : 0.2) : 1;
            tempObject.position.y = py + Math.sin(time * 0.5 + i) * 2.0 * flicker; 
            
            if (innovation > 0.6) {
                const pulse = 1 + Math.sin(time * 3 + i) * 0.2;
                tempObject.scale.multiplyScalar(pulse);
            }

            tempObject.lookAt(px, py, pz);
        } else {
            tempObject.position.y = y + Math.sin(time * 0.2 + i) * 1.5;
        }

        tempObject.updateMatrix();
        meshRef.current.setMatrixAt(i, tempObject.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (!graph) return null;

  return (
    <instancedMesh 
        ref={meshRef} 
        args={[shipGeometry, undefined, graph.nodeCount]}
        onClick={(e) => { e.stopPropagation(); setSelectedNode(e.instanceId!); }}
    >
      <meshStandardMaterial vertexColors emissive="#ffffff" emissiveIntensity={0.2} metalness={1} roughness={0} />
    </instancedMesh>
  );
}

function WarpRoutes() {
  const graph = useStore((state) => state.graph);
  
  const linePositions = useMemo(() => {
    if (!graph) return new Float32Array(0);
    const pos = new Float32Array(graph.edgeCount * 2 * 3);
    for (let i = 0; i < graph.edgeCount; i++) {
        const s = graph.edgeIndices[i * 2];
        const t = graph.edgeIndices[i * 2 + 1];
        pos.set([graph.positions[s*3], graph.positions[s*3+1], graph.positions[s*3+2]], i * 6);
        pos.set([graph.positions[t*3], graph.positions[t*3+1], graph.positions[t*3+2]], i * 6 + 3);
    }
    return pos;
  }, [graph]);

  if (!graph) return null;

  return (
    <lineSegments frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial 
        color="#38bdf8" 
        transparent 
        opacity={0.15} 
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
}

function WarpTrails() {
  const graph = useStore((state) => state.graph);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const cargoCount = (graph?.edgeCount || 0) * 2;

  const cargoData = useMemo(() => {
    if (!graph) return [];
    const data = [];
    for (let i = 0; i < cargoCount; i++) {
      const edgeIdx = Math.floor(seededRandom(i * 13) * graph.edgeCount);
      data.push({
        edgeIdx,
        prog: seededRandom(i * 17),
        spd: 0.005 + seededRandom(i * 19) * 0.015,
      });
    }
    return data;
  }, [graph, cargoCount]);

  useFrame((state) => {
    if (!graph || !meshRef.current || !cargoData.length) return;
    const tempObj = new THREE.Object3D();
    const time = state.clock.getElapsedTime();

    cargoData.forEach((c, i) => {
      c.prog += c.spd;
      if (c.prog > 1) {
        c.prog = 0;
        c.edgeIdx = Math.floor(seededRandom(time + i) * graph.edgeCount);
      }
      const si = graph.edgeIndices[c.edgeIdx * 2];
      const ti = graph.edgeIndices[c.edgeIdx * 2 + 1];
      const sx = graph.positions[si * 3], sy = graph.positions[si * 3 + 1], sz = graph.positions[si * 3 + 2];
      const tx = graph.positions[ti * 3], ty = graph.positions[ti * 3 + 1], tz = graph.positions[ti * 3 + 2];
      const x = sx + (tx - sx) * c.prog;
      const y = sy + (ty - sy) * c.prog;
      const z = sz + (tz - sz) * c.prog;
      tempObj.position.set(x, y, z);
      tempObj.scale.set(0.1, 0.1, 8.0);
      tempObj.lookAt(tx, ty, tz);
      tempObj.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObj.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, Math.floor(cargoCount)]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#4ade80" emissive="#4ade80" emissiveIntensity={10} />
    </instancedMesh>
  );
}

function Nebula() {
  const meshRef = useRef<THREE.Points>(null);
  const count = 50000;

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const colorChoices = ['#0ea5e9', '#3b82f6', '#8b5cf6', '#d946ef'];
    const tempCol = new THREE.Color();
    
    for (let i = 0; i < count; i++) {
        const r = 200 + seededRandom(i * 7) * 800;
        const theta = seededRandom(i * 9) * Math.PI * 2;
        const phi = Math.acos(2 * seededRandom(i * 11) - 1);
        
        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i * 3 + 2] = r * Math.cos(phi);
        
        tempCol.set(colorChoices[Math.floor(seededRandom(i * 13) * colorChoices.length)]);
        tempCol.toArray(col, i * 3);
    }
    return [pos, col];
  }, []);

  const shader = useMemo(() => ({
    uniforms: {
        uTime: { value: 0 }
    },
    vertexShader: `
        attribute vec3 color;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uTime;
        void main() {
            vColor = color;
            vec4 modelPosition = modelMatrix * vec4(position, 1.0);
            float dist = length(position);
            modelPosition.xyz += normalize(position) * sin(uTime * 0.5 + dist * 0.01) * 2.0;

            vec4 viewPosition = viewMatrix * modelPosition;
            gl_Position = projectionMatrix * viewPosition;
            gl_PointSize = (10.0 + sin(uTime + dist) * 5.0) / -viewPosition.z;
            vAlpha = 0.6 + sin(uTime * 0.8 + dist * 0.05) * 0.4;
        }
    `,
    fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
            float dist = distance(gl_PointCoord, vec2(0.5));
            if (dist > 0.5) discard;
            float strength = 1.0 - (dist * 2.0);
            gl_FragColor = vec4(vColor, strength * vAlpha * 0.3);
        }
    `
  }), []);

  useFrame((state) => {
    if (meshRef.current) {
      (meshRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <shaderMaterial args={[shader]} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

function PilotHUD() {
  const cameraMode = useStore((state) => state.cameraMode);
  if (cameraMode !== 'explorer') return null;

  return (
    <div className="pilot-hud glass">
        <div className="hud-velocity">THRUSTERS: ACTIVE</div>
        <div className="hud-coord">VECTOR: STABLE</div>
        <div className="hud-controls">WASD: THRUST | SHIFT/SPACE: ELEVATION</div>
    </div>
  );
}

function ExplorerShip() {
  const meshRef = useRef<THREE.Mesh>(null);
  const isLaunched = useStore((state) => state.isLaunched);
  const { camera } = useThree();
  const [keys, setKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isLaunched) return;
    const down = (e: KeyboardEvent) => setKeys((k: Record<string, boolean>) => ({ ...k, [e.code]: true }));
    const up = (e: KeyboardEvent) => setKeys((k: Record<string, boolean>) => ({ ...k, [e.code]: false }));
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [isLaunched]);

  useFrame((_, delta) => {
    if (!meshRef.current || !isLaunched) return;
    
    const speed = 300 * delta;
    if (keys['KeyW']) camera.translateZ(-speed);
    if (keys['KeyS']) camera.translateZ(speed);
    if (keys['KeyA']) camera.translateX(-speed);
    if (keys['KeyD']) camera.translateX(speed);
    if (keys['Space']) camera.translateY(speed);
    if (keys['ShiftLeft']) camera.translateY(-speed);

    // Ship lerp to camera for smooth follow
    const offset = new THREE.Vector3(0, -2, -10).applyQuaternion(camera.quaternion);
    meshRef.current.position.copy(camera.position).add(offset);
    meshRef.current.quaternion.slerp(camera.quaternion, 0.1);
  });

  return (
    <mesh ref={meshRef}>
      <coneGeometry args={[0.8, 4, 3]} />
      <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={5} />
    </mesh>
  );
}

function CameraController() {
  const cameraMode = useStore((state) => state.cameraMode);
  const selectedIdx = useStore((state) => state.selectedNodeIndex);
  const graph = useStore((state) => state.graph);
  const { camera } = useThree();

  useFrame(() => {
    if (cameraMode === 'focus' && selectedIdx !== null && graph) {
        const tx = graph.positions[selectedIdx * 3];
        const ty = graph.positions[selectedIdx * 3 + 1];
        const tz = graph.positions[selectedIdx * 3 + 2];
        const isRoot = graph.nodeData[selectedIdx * 3 + 2] === 1;

        const offset = isRoot ? 200 : 80;
        const targetPos = new THREE.Vector3(tx, ty + offset * 0.5, tz + offset);
        
        camera.position.lerp(targetPos, 0.05);
        camera.lookAt(tx, ty, tz);
    }
  });

  return null;
}

export default function CosmosScene() {
  const graph = useStore((state) => state.graph);
  const cameraMode = useStore((state) => state.cameraMode);

  return (
    <div className="scene-container">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [500, 400, 500], fov: 45 }}>
        <color attach="background" args={['#000000']} />
        <CameraController />
        {cameraMode === 'explorer' && <OrbitControls makeDefault enableDamping dampingFactor={0.05} maxDistance={2000} minDistance={10} />}
        <ambientLight intensity={0.01} />
        <pointLight position={[0, 0, 0]} intensity={2} color="#ffffff" distance={5000} decay={1} />
        {graph && (
           <pointLight position={[graph.positions[0], graph.positions[1], graph.positions[2]]} intensity={5.0} color="#fbbf24" distance={300} decay={2} />
        )}
        <Stars radius={1000} depth={100} count={30000} factor={6} saturation={1} fade speed={2} />
        <React.Suspense fallback={null}>
          <Nebula />
          <Starships />
          <WarpRoutes />
          <WarpTrails />
          {cameraMode === 'explorer' && <ExplorerShip />}
        </React.Suspense>
        <EffectComposer enableNormalPass={false}>
            <Bloom luminanceThreshold={0.1} luminanceSmoothing={0.9} height={400} intensity={2.5} />
            <Noise opacity={0.04} />
            <Vignette eskil={false} offset={0.3} darkness={1.3} />
        </EffectComposer>
      </Canvas>
      <PilotHUD />
    </div>
  );
}
