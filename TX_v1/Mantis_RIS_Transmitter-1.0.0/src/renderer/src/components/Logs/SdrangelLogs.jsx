import React, { use, useEffect, useRef, useState } from 'react'
import { HiDownload } from 'react-icons/hi'
import { GrClear } from 'react-icons/gr'
import toast from 'react-hot-toast'
import styles from './SdrangelLogs.module.css'
import { useApiFunctions } from '../../api/api'

const BASE = 'http://localhost:8000' // adjust if server runs elsewhere

const SdrangelLogs = () => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const { _getLogsPacket } = useApiFunctions()

  const posRef = useRef(0)
  const inodeRef = useRef(null)
  const leftoverRef = useRef('')

  // Keep only last 2000 lines
  const pushLines = (newLines) => {
    setLogs((prev) => {
      const combined = [...prev, newLines]
      return combined.length > 2000 ? combined.slice(combined.length - 2000) : combined
    })
  }

  const handleGetLogs = async () => {
    try {
      const response = await _getLogsPacket()
      // const data = await response.json();
      // console.log("response", response);
      response.data.packets.map((item, key) => {
        // console.log("item", item);
        pushLines(item)
      })
      // console.log(response);
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    handleGetLogs()
    setLoading(false)

    const id = setInterval(handleGetLogs, 1000)

    return () => {
      clearInterval(id)
    }
  }, [])

  useEffect(() => {
    console.log('logs', logs)
  }, [logs])

  // useEffect(() => {
  //   let mounted = true;

  //   // Initialize pos
  //   (async () => {
  //     try {
  //       const r = await fetch(`${BASE}/sdrangelsrv/pos`);
  //       if (r.ok) {
  //         const j = await r.json();
  //         posRef.current = j.pos || 0;
  //         inodeRef.current = j.inode || null;
  //       }
  //     } catch (err) {
  //       console.warn("pos init failed", err);
  //     } finally {
  //       setLoading(false);
  //     }
  //   })();

  //   // Poll every second
  //   const id = setInterval(async () => {
  //     try {
  //       const p = posRef.current || 0;
  //       const r = await fetch(
  //         `${BASE}/sdrangelsrv/poll?pos=${p}&max=65536`
  //       );
  //       if (!r.ok) return;
  //       const j = await r.json();
  //       if (!j.ok) return;

  //       // handle rotation
  //       if (j.rotated) {
  //         posRef.current = j.pos || 0;
  //         inodeRef.current = j.inode || null;
  //         leftoverRef.current = "";
  //       } else {
  //         posRef.current = j.pos || posRef.current;
  //       }

  //       const raw = j.raw || "";
  //       if (!raw) return;

  //       // Merge leftover
  //       const combined = leftoverRef.current + raw;
  //       const parts = combined.split(/\r?\n/);
  //       const last = parts[parts.length - 1];
  //       const complete =
  //         last === "" ? parts.slice(0, -1) : parts.slice(0, -1);
  //       leftoverRef.current = last === "" ? "" : last;

  //       if (complete.length) {
  //         pushLines(complete.map((l) => ({ line: l })));
  //       }
  //     } catch (err) {
  //       console.warn("poll error", err);
  //     }
  //   }, 1000);

  //   return () => {
  //     mounted = false;
  //     clearInterval(id);
  //   };
  // }, []);

  const handleDownload = async () => {
    try {
      const resp = await fetch(`${BASE}/sdrangelsrv/log`)
      if (!resp.ok) throw new Error(`Server returned ${resp.status}`)
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sdrangelsrv.log`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Log downloaded')
    } catch (err) {
      toast.error('Download failed: ' + (err.message || 'unknown'))
    }
  }

  const handleClear = async () => {
    setLogs([])
    toast.success('Cleared logs locally')

    try {
      const r = await fetch(`${BASE}/sdrangelsrv/clear`, { method: 'POST' })
      if (r.ok) {
        const text = await r.text()
        toast.success(text || 'Server log cleared')
      }
    } catch (err) {
      toast('Server-side clear unavailable', { icon: '⚠️' })
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.heading}>Transmitter Logs</div>
        <div className={styles.right}>
          <div className={styles.clear} onClick={handleClear} role="button" tabIndex={0}>
            <div className={styles.clicon}>
              <GrClear />
            </div>
            <div className={styles.cltext}>Clear log</div>
          </div>
          <div className={styles.download} onClick={handleDownload} role="button" tabIndex={0}>
            <div className={styles.clicon}>
              <HiDownload />
            </div>
            <div className={styles.cltext}>Save log</div>
          </div>
        </div>
      </div>

      <div className={styles.body}>
        {loading ? (
          <div className={styles.empty}>Loading logs…</div>
        ) : logs.length === 0 ? (
          <div className={styles.empty}>No Entries found</div>
        ) : (
          logs.map((packet, index) => (
            <div key={index}>
              <div className={styles.packet}>
                <div className={styles.phead}>
                  <div className={styles.pdate}>
                    {packet.TimeStamp} {packet.Protocol}
                  </div>
                </div>
                <div className={styles.pbody}>{packet.Message}</div>
              </div>
              <div className={styles.divider}></div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default SdrangelLogs
