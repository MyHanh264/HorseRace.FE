import { useEffect, useRef, useState } from 'react'
import * as signalR from '@microsoft/signalr'
import { getValidAccessToken } from '../services/api'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const HUB_URL = `${API_BASE_URL}/api/hubs/race-live`

export const RACE_LIVE_CONNECTION = {
  CONNECTING: 'Connecting',
  CONNECTED: 'Connected',
  RECONNECTING: 'Reconnecting',
  DISCONNECTED: 'Disconnected',
}

export function useRaceLiveHub(raceId, { onSnapshot, onResync } = {}) {
  const [connectionState, setConnectionState] = useState(RACE_LIVE_CONNECTION.DISCONNECTED)
  const onSnapshotRef = useRef(onSnapshot)
  const onResyncRef = useRef(onResync)

  useEffect(() => {
    onSnapshotRef.current = onSnapshot
  }, [onSnapshot])

  useEffect(() => {
    onResyncRef.current = onResync
  }, [onResync])

  useEffect(() => {
    const numericRaceId = Number(raceId)
    if (!Number.isFinite(numericRaceId) || numericRaceId <= 0) {
      return undefined
    }

    let disposed = false

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: () => getValidAccessToken(),
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    const joinRace = async () => {
      if (!disposed) {
        await connection.invoke('JoinRace', numericRaceId)
      }
    }

    connection.on('RaceLiveChanged', (snapshot) => {
      onSnapshotRef.current?.(snapshot)
    })

    connection.onreconnecting(() => {
      if (!disposed) setConnectionState(RACE_LIVE_CONNECTION.RECONNECTING)
    })

    connection.onreconnected(async () => {
      if (disposed) return
      setConnectionState(RACE_LIVE_CONNECTION.CONNECTED)

      try {
        await joinRace()
      } finally {
        onResyncRef.current?.()
      }
    })

    connection.onclose(() => {
      if (!disposed) setConnectionState(RACE_LIVE_CONNECTION.DISCONNECTED)
    })

    async function start() {
      try {
        await connection.start()
        if (disposed) {
          await connection.stop()
          return
        }

        await joinRace()
        setConnectionState(RACE_LIVE_CONNECTION.CONNECTED)
      } catch {
        if (!disposed) setConnectionState(RACE_LIVE_CONNECTION.DISCONNECTED)
      }
    }

    start()

    return () => {
      disposed = true
      connection.off('RaceLiveChanged')

      const stop = async () => {
        try {
          if (connection.state === signalR.HubConnectionState.Connected) {
            await connection.invoke('LeaveRace', numericRaceId).catch(() => {})
          }
        } finally {
          await connection.stop().catch(() => {})
        }
      }

      stop()
    }
  }, [raceId])

  return { connectionState }
}
