import React, { useContext, useEffect, useRef, useState, useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import 'chart.js/auto'
import styles from './SignalVisualization.module.css'
import { DataContext } from '../Context/DataContext'
import toast from 'react-hot-toast'

const n_fft = 1024
const frameCount = 100

const freqSpan = 3.497 - 3.495

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  elements: { line: { tension: 0.2 } },
  scales: {
    x: {
      type: 'linear',
      title: { display: true, text: 'Frequency (GHz)', color: '#ffffff' },
      ticks: { color: '#d5d5d5' },
      grid: { color: 'rgba(0,0,0,0.05)' }
    },
    y: {
      min: -100,
      max: 0,
      title: { display: true, text: 'Power (dB)', color: '#ffffff' },
      ticks: { color: '#d5d5d5' },
      grid: { color: 'rgba(0,0,0,0.05)' }
    }
  },
  plugins: { legend: { display: false } }
}

export default function SignalVisualization() {
  const { centerFrequency, channel, rfBandwidth, sliderValueHz, setSliderValueHz } =
    useContext(DataContext)

  const [spectrum, setSpectrum] = useState(Array(n_fft).fill(-100))
  const waterfallBufferRef = useRef(
    Array.from({ length: frameCount }, () => Array(n_fft).fill(-100))
  )
  const canvasRef = useRef(null)
  const chartRef = useRef(null)
  const lastWfRef = useRef(Date.now())
  const draggingRef = useRef(false)

  const freqs = useMemo(() => {
    const halfSpan = freqSpan / 2
    const start = centerFrequency - halfSpan
    const stop = centerFrequency + halfSpan
    return Array.from({ length: n_fft }, (_, i) =>
      parseFloat((start + (i / (n_fft - 1)) * (stop - start)).toFixed(6))
    )
  }, [centerFrequency])

  useEffect(() => {
    const ws = new WebSocket('ws://127.0.0.1:8887')
    ws.binaryType = 'arraybuffer'

    ws.onopen = () => console.log('[WS] Connected')
    ws.onmessage = (evt) => {
      try {
        const floats = new Float32Array(evt.data, 36)
        const newSpec = Array.from(floats).slice(0, n_fft)
        setSpectrum(newSpec)

        const now = Date.now()
        if (now - lastWfRef.current > 200) {
          lastWfRef.current = now

          const buffer = waterfallBufferRef.current
          buffer.push(newSpec)
          if (buffer.length > frameCount) buffer.shift()

          const cnv = canvasRef.current
          if (cnv) {
            const ctx = cnv.getContext('2d')
            const { width, height } = cnv
            const rowH = height / frameCount
            const colW = width / n_fft
            ctx.clearRect(0, 0, width, height)
            buffer.forEach((row, r) => {
              row.forEach((val, c) => {
                const norm = Math.max(0, Math.min(1, (val + 100) / 100))
                ctx.fillStyle = `hsl(${240 - norm * 240},100%,${norm * 60 + 10}%)`
                ctx.fillRect(c * colW, r * rowH, colW, rowH)
              })
            })
          }
        }
      } catch (err) {
        console.error('[WS] parse error', err)
      }
    }
    ws.onerror = (e) => {
      console.error(e)
      toast.error('WebSocket error')
    }
    ws.onclose = () => console.log('[WS] Closed')

    return () => ws.close()
  }, [channel])

  const selectedFreqGHz = useMemo(
    () => centerFrequency + sliderValueHz / 1e9,
    [centerFrequency, sliderValueHz]
  )

  const chartData = useMemo(() => {
    const mainData = freqs.map((f, i) => ({ x: f, y: spectrum[i] ?? -100 }))
    const marker = [
      { x: selectedFreqGHz, y: -100 },
      { x: selectedFreqGHz, y: 0 }
    ]

    return {
      datasets: [
        {
          label: 'spectrum',
          data: mainData,
          borderColor: '#2563eb',
          borderWidth: 1,
          pointRadius: 0,
          parsing: false
        },
        {
          label: 'marker',
          data: marker,
          borderColor: '#ef4444',
          borderWidth: 1,
          pointRadius: 0,
          borderDash: [6, 4],
          fill: false,
          parsing: false
        }
      ]
    }
  }, [spectrum, freqs, selectedFreqGHz])

  useEffect(() => {
    const half = rfBandwidth / 2
    if (sliderValueHz > half) setSliderValueHz(half)
    if (sliderValueHz < -half) setSliderValueHz(-half)
  }, [rfBandwidth])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart || !chart.canvas) return
    const canvas = chart.canvas

    const toFreqGHz = (clientX) => {
      const rect = canvas.getBoundingClientRect()
      const x = clientX - rect.left
      try {
        const scale = chart.scales?.x
        if (!scale) return null
        const value = scale.getValueForPixel(x)
        return Number(value)
      } catch (err) {
        return null
      }
    }

    const pointerDown = (ev) => {
      ev.preventDefault()
      const freq = toFreqGHz(ev.clientX)
      if (freq == null) return
      const newHz = Math.round((freq - centerFrequency) * 1e9)
      const half = rfBandwidth / 2
      const clamped = Math.max(-half, Math.min(half, newHz))
      setSliderValueHz(clamped)
      draggingRef.current = true
      canvas.style.cursor = 'grabbing'
    }

    const pointerMove = (ev) => {
      if (!draggingRef.current) return
      ev.preventDefault()
      const freq = toFreqGHz(ev.clientX)
      if (freq == null) return
      const newHz = Math.round((freq - centerFrequency) * 1e9)
      const half = rfBandwidth / 2
      const clamped = Math.max(-half, Math.min(half, newHz))
      setSliderValueHz(clamped)
    }

    const pointerUp = (ev) => {
      if (!draggingRef.current) return
      draggingRef.current = false
      canvas.style.cursor = 'default'
    }

    canvas.addEventListener('pointerdown', pointerDown)
    window.addEventListener('pointermove', pointerMove)
    window.addEventListener('pointerup', pointerUp)

    const pointerEnter = () => (canvas.style.cursor = 'grab')
    const pointerLeave = () => {
      if (!draggingRef.current) canvas.style.cursor = 'default'
    }
    canvas.addEventListener('pointerenter', pointerEnter)
    canvas.addEventListener('pointerleave', pointerLeave)

    return () => {
      canvas.removeEventListener('pointerdown', pointerDown)
      window.removeEventListener('pointermove', pointerMove)
      window.removeEventListener('pointerup', pointerUp)
      canvas.removeEventListener('pointerenter', pointerEnter)
      canvas.removeEventListener('pointerleave', pointerLeave)
      canvas.style.cursor = 'default'
    }
  }, [chartRef.current, centerFrequency, rfBandwidth])

  return (
    <>
      <div className={styles.conatiner}>
        <div className={styles.card}>
          <h3 className={styles.heading}>Spectrum Analyzer</h3>
          <div className={styles.chartWrapper} style={{ height: 300 }}>
            <Line ref={chartRef} data={chartData} options={chartOptions} />
          </div>
        </div>
        <div className={styles.card}>
          <h3 className={styles.heading}>Waterfall Display</h3>
          <div className={styles.waterfallWrapper}>
            <canvas ref={canvasRef} width={600} height={300} className={styles.waterfallCanvas} />
          </div>
        </div>
      </div>
    </>
  )
}
