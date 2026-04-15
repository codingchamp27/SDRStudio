import React, { useContext, useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { DataContext } from '../Context/DataContext'

export default function DisplayVideo({
  latestEndpoint = 'http://localhost:3001/api/latest-mp4',
  width = 720
}) {
  const { start, videoStart, loopVideo, mp4Url, setMp4Url } = useContext(DataContext)
  const videoRef = useRef(null)
  const [loading, setLoading] = useState(false)

  // new part for continous vid
  useEffect(() => {
    const savedTime = sessionStorage.getItem('videoCurrentTime')
    if (savedTime && videoRef.current) {
      videoRef.current.currentTime = parseFloat(savedTime)
    }
  }, [])

  useEffect(() => {
    const v = videoRef.current
    const saveTime = () => {
      if (v) {
        sessionStorage.setItem('videoCurrentTime', v.currentTime)
      }
    }
    window.addEventListener('beforeunload', saveTime)

    return () => {
      saveTime()
      window.removeEventListener('beforeunload', saveTime)
    }
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.mp4Url) {
        const cacheBustedUrl = `${e.detail.mp4Url}?t=${Date.now()}`
        setMp4Url(cacheBustedUrl)
        setLoading(true)
      }
    }
    window.addEventListener('newVideoReady', handler)
    return () => window.removeEventListener('newVideoReady', handler)
  }, [])

  useEffect(() => {
    const v = videoRef.current
    if (!v || !mp4Url) return

    v.pause()
    v.src = mp4Url
    v.load()
    v.loop = loopVideo

    // if (videoStart && start) {
    //   v.play().catch(() => setPlaying(false));
    // }
  }, [mp4Url])

  useEffect(() => {
    const v = videoRef.current
    if (v) v.loop = loopVideo
  }, [loopVideo])

  useEffect(() => {
    const v = videoRef.current
    if (!v || !mp4Url) return

    if (videoStart && start) {
      v.play()
    } else {
      v.pause()
    }
  }, [videoStart, start])

  // const togglePlay = () => {
  //   const v = videoRef.current;
  //   if (!v || !mp4Url) return;

  //   if (!videoStart) {
  //     v.play()
  //       .then(() => setPlaying(true))
  //       .catch(() => setPlaying(false));
  //   } else {
  //     v.pause();
  //     setPlaying(false);
  //   }
  // };

  return (
    <div
      style={{
        maxWidth: typeof width === 'number' ? `${width}px` : width,
        fontFamily: 'sans-serif'
      }}
    >
      <div
        style={{
          position: 'relative',
          background: '#000',
          borderRadius: 8,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%'
        }}
      >
        <video
          ref={videoRef}
          width="100%"
          style={{
            display: mp4Url ? 'block' : 'none',
            background: '#000',
            // position: 'absolute',
            marginTop: 0,
            top: 0,
            left: 0,            
            height: '100%',
            objectFit: 'contain'
          }}
          onCanPlay={() => setLoading(false)}
        >
          {mp4Url ? <source src={mp4Url} type="video/mp4" /> : null}
          Your browser does not support the video tag.
        </video>

        {!mp4Url && !loading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              padding: 24,
              textAlign: 'center'
            }}
          >
            No converted video available yet
          </div>
        )}

        {loading && (
          <div
            style={{
              position: 'absolute',
              top: '0',
              left: '0',
              width: '100%',
              height: '100%',
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div
              style={{
                width: 50,
                height: 50,
                border: '6px solid #fff',
                borderTop: '6px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

DisplayVideo.propTypes = {
  latestEndpoint: PropTypes.string,
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
}
