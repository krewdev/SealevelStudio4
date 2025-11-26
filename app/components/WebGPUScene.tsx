"use client";

import * as THREE from "three";
import { useEffect, useRef, useState } from "react";

interface WebGPUSceneProps {
  intensity?: number;
  particleCount?: number;
  color?: string;
}

export default function WebGPUScene({ 
  intensity = 0.3,
  particleCount = 1000,
  color = "#44aaff"
}: WebGPUSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isSupported, setIsSupported] = useState(true);
  const sceneRef = useRef<{
    renderer?: THREE.WebGLRenderer;
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    animationId?: number;
    particles?: THREE.Points;
  }>({});

  useEffect(() => {
    if (!mountRef.current) return;

            // Check WebGPU support
            if (!('gpu' in navigator)) {
              console.warn("WebGPU not supported, falling back to WebGL");
              setIsSupported(false);
            }

    // Initialize Three.js scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505); // Almost black

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    // Renderer setup (WebGL fallback for now, WebGPU when stable)
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // Lighting (Ray-tracing feel)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 100, 100);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(parseInt(color.replace("#", ""), 16), 50, 50);
    pointLight2.position.set(-5, -5, 5);
    scene.add(pointLight2);

    // Create floating glass orbs
    const orbs: THREE.Mesh[] = [];
    for (let i = 0; i < 5; i++) {
      const geometry = new THREE.IcosahedronGeometry(0.3 + Math.random() * 0.2, 2);
      const material = new THREE.MeshStandardMaterial({ 
        roughness: 0,
        metalness: 1,
        color: parseInt(color.replace("#", ""), 16),
        transparent: true,
        opacity: 0.6,
        emissive: parseInt(color.replace("#", ""), 16),
        emissiveIntensity: 0.2
      });
      const orb = new THREE.Mesh(geometry, material);
      orb.position.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      );
      scene.add(orb);
      orbs.push(orb);
    }

    // Particle system
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = particleCount;
    const posArray = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 20;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.02,
      color: parseInt(color.replace("#", ""), 16),
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);

    // Store refs
    sceneRef.current = {
      renderer,
      scene,
      camera,
      particles
    };

    // Animation loop
    let frame = 0;
    function animate() {
      frame += 0.01;

      // Animate orbs
      orbs.forEach((orb, i) => {
        orb.rotation.x += 0.005 + i * 0.001;
        orb.rotation.y += 0.003 + i * 0.001;
        orb.position.y += Math.sin(frame + i) * 0.002;
        orb.position.x += Math.cos(frame + i * 0.5) * 0.002;
      });

      // Animate particles
      if (particles) {
        particles.rotation.y += 0.0005;
        const positions = particles.geometry.attributes.position.array as Float32Array;
        for (let i = 1; i < positions.length; i += 3) {
          positions[i] += Math.sin(frame + i) * 0.0001;
        }
        particles.geometry.attributes.position.needsUpdate = true;
      }

      // Rotate camera slightly for dynamic feel
      camera.position.x = Math.sin(frame * 0.1) * 0.5;
      camera.position.y = Math.cos(frame * 0.1) * 0.5;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      sceneRef.current.animationId = requestAnimationFrame(animate);
    }

    animate();

    // Handle resize
    const handleResize = () => {
      if (!sceneRef.current.camera || !sceneRef.current.renderer) return;
      
      sceneRef.current.camera.aspect = window.innerWidth / window.innerHeight;
      sceneRef.current.camera.updateProjectionMatrix();
      sceneRef.current.renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (sceneRef.current.animationId) {
        cancelAnimationFrame(sceneRef.current.animationId);
      }
      if (mountRef.current && sceneRef.current.renderer) {
        mountRef.current.removeChild(sceneRef.current.renderer.domElement);
      }
      sceneRef.current.renderer?.dispose();
    };
  }, [color, particleCount]);

  if (!isSupported) {
    return (
      <div className="fixed top-0 left-0 -z-10 w-full h-full bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900" />
    );
  }

  return (
    <div 
      ref={mountRef} 
      className="fixed top-0 left-0 -z-10 w-full h-full pointer-events-none"
      style={{ opacity: intensity }}
    />
  );
}


