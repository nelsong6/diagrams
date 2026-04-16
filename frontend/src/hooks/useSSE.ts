import { useState, useEffect, useRef, useCallback } from 'react'
import type { CIRun, ConnectionStatus } from '../types/ci'

const API_BASE = import.meta.env.DEV
  ? 'http://localhost:3000'
  : 'https://api.romaine.life'

const SSE_URL = `${API_BASE}/ci/events`

export function useSSE(enabled: boolean) {
  const [runs, setRuns] = useState<Map<string, CIRun>>(new Map())
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const esRef = useRef<EventSource | null>(null)
  const retryRef = useRef(0)
  const timerRef = useRef<number | null>(null)

  const connect = useCallback(() => {
    if (esRef.current) return

    setStatus('connecting')
    const es = new EventSource(SSE_URL)
    esRef.current = es

    es.addEventListener('init', (e) => {
      const snapshot: CIRun[] = JSON.parse(e.data)
      const map = new Map<string, CIRun>()
      for (const run of snapshot) {
        map.set(`${run.repo}/${run.runId}`, run)
      }
      setRuns(map)
      setStatus('connected')
      retryRef.current = 0
    })

    es.addEventListener('update', (e) => {
      const run: CIRun = JSON.parse(e.data)
      setRuns((prev) => {
        const next = new Map(prev)
        next.set(`${run.repo}/${run.runId}`, run)
        return next
      })
    })

    es.onerror = () => {
      es.close()
      esRef.current = null
      setStatus('disconnected')

      // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
      const delay = Math.min(1000 * 2 ** retryRef.current, 30000)
      retryRef.current++
      timerRef.current = window.setTimeout(connect, delay)
    }
  }, [])

  const disconnect = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }
    setStatus('disconnected')
    retryRef.current = 0
  }, [])

  useEffect(() => {
    if (enabled) {
      connect()
    } else {
      disconnect()
    }
    return disconnect
  }, [enabled, connect, disconnect])

  return { runs, status, disconnect }
}
