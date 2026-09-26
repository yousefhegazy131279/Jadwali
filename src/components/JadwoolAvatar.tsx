'use client'

import { motion } from 'framer-motion'

export function JadwoolAvatar({
  size = 40,
  animated = true,
  state = 'idle', // 'idle' | 'thinking' | 'happy'
}: {
  size?: number
  animated?: boolean
  state?: 'idle' | 'thinking' | 'happy'
}) {
  const eyeColor = '#0b1a2e'
  const goldColor = '#D4AF37'
  const goldLight = '#E8C84A'
  const blueAccent = '#3b82f6'

  // تحريك العيون حسب الحالة
  const eyeAnimation =
    state === 'thinking'
      ? { scaleY: [1, 0.3, 1], transition: { duration: 1.5, repeat: Infinity } }
      : state === 'happy'
      ? { y: [0, -2, 0], transition: { duration: 0.5, repeat: Infinity, repeatDelay: 0.5 } }
      : {}

  // نبض الهالة
  const pulseAnimation = animated
    ? { scale: [1, 1.08, 1], opacity: [0.3, 0.5, 0.3] }
    : {}

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* هالة نبضية */}
      {animated && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${goldColor}55 0%, transparent 70%)`,
          }}
          animate={pulseAnimation}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* جسم الأفاتار */}
      <motion.svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="relative z-10"
        animate={animated ? { rotate: [0, 2, -2, 0] } : {}}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <defs>
          <linearGradient id="jBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={goldLight} />
            <stop offset="100%" stopColor={goldColor} />
          </linearGradient>
          <linearGradient id="jFace" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <radialGradient id="jHighlight" cx="0.3" cy="0.3" r="0.7">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* هوائي */}
        <motion.g
          animate={
            animated
              ? { rotate: [-3, 3, -3] }
              : {}
          }
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '50px 25px' }}
        >
          <line
            x1="50"
            y1="20"
            x2="50"
            y2="32"
            stroke={goldColor}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="50" cy="18" r="4" fill={goldColor}>
            <animate
              attributeName="r"
              values="4;5.5;4"
              dur="1.8s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="fill"
              values={`${goldColor};${blueAccent};${goldColor}`}
              dur="3s"
              repeatCount="indefinite"
            />
          </circle>
        </motion.g>

        {/* رأس/جسم */}
        <rect
          x="20"
          y="32"
          width="60"
          height="56"
          rx="18"
          fill="url(#jBody)"
          stroke={goldColor}
          strokeWidth="1.5"
        />

        {/* وجه داكن */}
        <rect
          x="26"
          y="38"
          width="48"
          height="42"
          rx="14"
          fill="url(#jFace)"
        />

        {/* لمعة الوجه */}
        <ellipse
          cx="42"
          cy="46"
          rx="16"
          ry="10"
          fill="url(#jHighlight)"
        />

        {/* العينان */}
        <motion.g animate={eyeAnimation}>
          <ellipse cx="40" cy="56" rx="4.5" ry="5" fill={goldLight} />
          <ellipse cx="60" cy="56" rx="4.5" ry="5" fill={goldLight} />
          {/* البؤبؤ */}
          <circle cx="41" cy="56.5" r="1.8" fill={eyeColor} />
          <circle cx="61" cy="56.5" r="1.8" fill={eyeColor} />
        </motion.g>

        {/* الفم - يتحرك عند الحديث */}
        <motion.path
          d="M 42 68 Q 50 73 58 68"
          stroke={goldLight}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          animate={
            animated
              ? { d: [
                  'M 42 68 Q 50 73 58 68',
                  'M 42 68 Q 50 70 58 68',
                  'M 42 68 Q 50 73 58 68',
                ] }
              : {}
          }
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* نقاط جانبية ديكورية */}
        <circle cx="18" cy="50" r="2" fill={goldColor} opacity="0.6" />
        <circle cx="18" cy="60" r="1.5" fill={goldColor} opacity="0.4" />
        <circle cx="82" cy="50" r="2" fill={goldColor} opacity="0.6" />
        <circle cx="82" cy="60" r="1.5" fill={goldColor} opacity="0.4" />

        {/* شارة صغيرة ذهبية */}
        <circle cx="72" cy="76" r="3" fill={blueAccent} opacity="0.8">
          <animate
            attributeName="opacity"
            values="0.8;0.3;0.8"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
      </motion.svg>
    </div>
  )
}