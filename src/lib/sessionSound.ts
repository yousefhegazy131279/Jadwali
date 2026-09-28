let audioContext: AudioContext | null = null

function getAudioContext() {
  if (typeof window === 'undefined') return null
  try {
    const Context = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Context) return null
    audioContext ??= new Context()
    return audioContext
  } catch {
    // Audio must never prevent the timer itself from starting or completing.
    return null
  }
}

// Call from the user's start/resume click so the browser allows end-of-session audio later.
export function unlockSessionSound() {
  try {
    const context = getAudioContext()
    if (context?.state === 'suspended') void context.resume().catch(() => undefined)
  } catch {
    // Browsers may disable audio; session timing remains available.
  }
}

export function playSessionSound() {
  try {
    const context = getAudioContext()
    if (!context) return

    const play = () => {
      const now = context.currentTime + 0.04
      // Three bright, layered chimes make the alert noticeable without a remote audio file.
      for (let index = 0; index < 3; index++) {
        const start = now + index * 0.42
        for (const [frequency, volume] of [[880, 0.19], [1174, 0.12]] as const) {
          const oscillator = context.createOscillator()
          const gain = context.createGain()
          oscillator.type = 'sine'
          oscillator.frequency.setValueAtTime(frequency, start)
          gain.gain.setValueAtTime(0.0001, start)
          gain.gain.exponentialRampToValueAtTime(volume, start + 0.025)
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.34)
          oscillator.connect(gain)
          gain.connect(context.destination)
          oscillator.start(start)
          oscillator.stop(start + 0.36)
        }
      }
    }

    if (context.state === 'running') play()
    else void context.resume().then(play).catch(() => undefined)
  } catch {
    // Ignore device audio errors after preserving the completed timer state.
  }
}
