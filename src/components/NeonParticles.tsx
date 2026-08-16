'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from '@/context/ThemeContext'

export function NeonParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { theme } = useTheme()
  // ✅ التصحيح: استخدام null كقيمة ابتدائية
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const ctxSafe = ctx

    let width = window.innerWidth
    let height = window.innerHeight
    let particles: any[] = []
    const particleCount = 50
    const mouse = { x: width / 2, y: height / 2 }

    const resizeCanvas = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width
      canvas.height = height
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    class Particle {
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      opacity: number
      pulse: number

      constructor() {
        this.x = Math.random() * width
        this.y = Math.random() * height
        this.size = Math.random() * 2 + 1.5
        this.speedX = (Math.random() - 0.5) * 0.4
        this.speedY = (Math.random() - 0.5) * 0.4
        this.opacity = 0.3 + Math.random() * 0.5
        this.pulse = Math.random() * Math.PI * 2
      }

      update() {
        this.x += this.speedX
        this.y += this.speedY
        this.pulse += 0.02

        if (this.x < 0 || this.x > width) this.speedX *= -1
        if (this.y < 0 || this.y > height) this.speedY *= -1

        const dx = mouse.x - this.x
        const dy = mouse.y - this.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 150) {
          const force = (150 - dist) / 150
          this.x -= dx * force * 0.02
          this.y -= dy * force * 0.02
        }
      }

      draw() {
        const alpha = this.opacity * (0.5 + 0.5 * Math.sin(this.pulse))
        const size = this.size * (0.8 + 0.4 * Math.sin(this.pulse * 0.7))

        const isLight = theme === 'light'
        const baseColor = isLight ? 'rgba(180, 150, 50, ' : 'rgba(212, 175, 55, '

        const gradient = ctxSafe.createRadialGradient(
          this.x, this.y, 0,
          this.x, this.y, size * 4
        )
        gradient.addColorStop(0, `${baseColor}${alpha * 0.8})`)
        gradient.addColorStop(0.4, `${baseColor}${alpha * 0.3})`)
        gradient.addColorStop(1, `${baseColor}0)`)

        ctxSafe.beginPath()
        ctxSafe.arc(this.x, this.y, size * 4, 0, Math.PI * 2)
        ctxSafe.fillStyle = gradient
        ctxSafe.fill()

        ctxSafe.shadowColor = `rgba(212, 175, 55, ${alpha * 0.5})`
        ctxSafe.shadowBlur = 20
        ctxSafe.beginPath()
        ctxSafe.arc(this.x, this.y, size * 0.5, 0, Math.PI * 2)
        ctxSafe.fillStyle = `rgba(255, 235, 180, ${alpha * 0.9})`
        ctxSafe.fill()
        ctxSafe.shadowBlur = 0
      }
    }

    const initParticles = () => {
      particles = []
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle())
      }
    }

    initParticles()

    function drawConnections() {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 150) {
            const alpha = (1 - dist / 150) * 0.25
            const isLight = theme === 'light'
            ctxSafe.strokeStyle = isLight
              ? `rgba(180, 150, 50, ${alpha})`
              : `rgba(212, 175, 55, ${alpha})`
            ctxSafe.lineWidth = 0.7
            ctxSafe.shadowColor = `rgba(212, 175, 55, ${alpha * 0.2})`
            ctxSafe.shadowBlur = 8
            ctxSafe.beginPath()
            ctxSafe.moveTo(particles[i].x, particles[i].y)
            ctxSafe.lineTo(particles[j].x, particles[j].y)
            ctxSafe.stroke()
            ctxSafe.shadowBlur = 0
          }
        }
      }
    }

    function animate() {
      ctxSafe.clearRect(0, 0, width, height)

      for (const p of particles) {
        p.update()
        p.draw()
      }

      drawConnections()

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
    }
    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('mousemove', handleMouseMove)
      // ✅ التحقق من وجود animationRef.current قبل الإلغاء
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [theme])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{
        opacity: theme === 'light' ? 0.15 : 0.6,
        transition: 'opacity 0.5s ease'
      }}
    />
  )
}