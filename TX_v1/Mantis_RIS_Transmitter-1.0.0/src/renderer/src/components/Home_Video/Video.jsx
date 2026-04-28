import { useContext, useRef, useState } from 'react'
import DisplayVideo from '../DisplayVideo/Displayvideo'
import styles from './Video.module.css'
import { FaChevronDown, FaFileUpload, FaPauseCircle, FaPlayCircle, FaUpload } from 'react-icons/fa'
import { DataContext } from '../Context/DataContext'
import toast from 'react-hot-toast'
import axios from 'axios'
import correct from '../../../../../resources/correct.png'
import remove from '../../../../../resources/remove.png'
import SignalVisualization from '../SignalVisualization/SignalVisualization'
import SpectrumAnalyzer from '../SignalVisualization/SpectrumAnalyzer'

const UPLOAD_ENDPOINT = 'http://localhost:3001/api/upload-ts'

const Video = () => {
  const { dataDatv, setDataDatv, videoStart, setVideoStart, dataTx, setDataTx, setLoopVideo, usrpConnected, deviceConnected, channel } = useContext(DataContext)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [activeTab, setActiveTab] = useState('spectrum')
  const inputRef = useRef(null)

  const handleStartVideo = () => {
    if (dataDatv.DATVModSettings.tsFileName != '') {
      setDataDatv((prevData) => ({
        ...prevData,
        DATVModSettings: {
          ...prevData.DATVModSettings,
          tsFilePlay: Number(!dataDatv.DATVModSettings.tsFilePlay)
        }
      }))
      console.log('play pause', dataDatv.DATVModSettings.tsFilePlay)
      setVideoStart((prev) => !prev)
    } else {
      toast.error('Please upload a .ts file first.')
    }
  }

  const handleFileUpload = async (e) => {
    // console.log('e', e)
    // const file = e.target.files[0]
    // console.log('file', file)
    // if (file && file.name.endsWith('.ts')) {
    //   setData((prevData) => ({
    //     ...prevData,
    //     DATVModSettings: {
    //       ...prevData.DATVModSettings,
    //       tsFileName: `/home/mantiswave/Asim/Github-Organization/Mantis_RIS/${file.name}`
    //     }
    //   }))
    // } else {
    //   toast.error('Please upload a .ts file')
    // }

    const file = e.target.files && e.target.files[0]
    if (!file) return

    if (!file.name.endsWith('.ts')) {
      toast.error('Please upload a .ts file')
      return
    }

    // setData((prevData) => ({
    //   ...prevData,
    //   DATVModSettings: { ...prevData.DATVModSettings, tsFileName: sdPath },
    // }));

    try {
      setUploading(true)
      setUploadProgress(0)

      const form = new FormData()
      form.append('tsfile', file)

      const resp = await axios.post(UPLOAD_ENDPOINT, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (evt.total) {
            const pct = Math.round((evt.loaded * 100) / evt.total)
            setUploadProgress(pct)
          }
        },
        timeout: 0
      })

      setUploading(false)
      setUploadProgress(100)

      if (resp && resp.data && resp.data.mp4Url) {
        console.log('finall pth is ', resp.data.tsPath)
        if (resp.data.tsPath) {
          setDataDatv((prevData) => ({
            ...prevData,
            DATVModSettings: { ...prevData.DATVModSettings, tsFileName: resp.data.tsPath }
          }))
        }
        toast.success('Conversion finished on server.')

        try {
          let absUrl = new URL(resp.data.mp4Url, UPLOAD_ENDPOINT).toString()

          absUrl += `?t=${Date.now()}`

          window.dispatchEvent(new CustomEvent('newVideoReady', { detail: { mp4Url: absUrl } }))
        } catch (e) {
          window.dispatchEvent(
            new CustomEvent('newVideoReady', {
              detail: { mp4Url: resp.data.mp4Url + '?t=' + Date.now() }
            })
          )
        }
      } else {
        toast.error('Conversion failed: no mp4Url returned from server.')
      }
    } catch (err) {
      setUploading(false)
      console.error('Upload/convert error:', err)
      toast.error('Upload or conversion failed on server.')
    }
  }

  const handleVideoLoop = () => {
    setDataDatv((prevData) => ({
      ...prevData,
      DATVModSettings: {
        ...prevData.DATVModSettings,
        tsFilePlayLoop: Number(!dataDatv.DATVModSettings.tsFilePlayLoop)
      }
    }));
    setLoopVideo((prev) => !prev);
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.heading}>Transmitted Video</div>
      </div>

      <div className={styles.subContainer}>
        <div className={styles.subHeading}>
          <div className={styles.tabButtons}>
            <button
              className={activeTab === 'spectrum' ? styles.active : ''}
              onClick={() => setActiveTab('spectrum')}
            >
              Spectrum
            </button>
            <button
              className={activeTab === 'video' ? styles.active : ''}
              onClick={() => setActiveTab('video')}
            >
              Video
            </button>
          </div>
          <span className={styles.fileDropDown}>
            <span className={styles.title}>Source Type</span>
            <span className={styles.box}>
              File <FaChevronDown />
            </span>
          </span>
          <span className={styles.chooseFile}>
            <span className={styles.title}>Upload .ts File</span>
            <span
              className={styles.box}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === 'Enter') inputRef.current?.click()
              }}
            >
              <FaUpload /> Choose File
              <input
                ref={inputRef}
                type="file"
                accept=".ts"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </span>
          </span>
        </div>
        <div className={styles.body}>
          {/* <div className={styles.mainConatiner}> */}
          {/* <div className={styles.tabButtons}>
              <button
                className={activeTab === 'spectrum' ? styles.active : ''}
                onClick={() => setActiveTab('Spectrum')}
              >
                Spectrum
              </button>
              <button
                className={activeTab === 'video' ? styles.active : ''}
                onClick={() => setActiveTab('Video')}
              >
                Video
              </button>
            </div> */}
          {/* Tab Content */}
          <div className={styles.tabContent}>
            {usrpConnected}
            {deviceConnected && channel && activeTab === 'spectrum' ?
              <SpectrumAnalyzer />
              : <></>}
            {activeTab === 'video' &&
              (<>
              <div className={styles.videoControl}>
                <DisplayVideo />
                <div className={styles.operation}>
                  <div className={styles.start}>
                    <span className={styles.loop} onClick={handleVideoLoop}>
                      {dataDatv.DATVModSettings.tsFilePlayLoop ? (
                        <img className={styles.image} src={correct} alt="" width="15" height="15" style={{ marginRight: "3px" }} />
                      ) : (
                        <img className={styles.image} src={remove} alt="" width="15" height="15" style={{ marginRight: "3px" }} />
                      )}
                      Loop the video
                    </span>
                    <span className={styles.startButton} onClick={handleStartVideo}>
                      {dataDatv.DATVModSettings.tsFilePlay ? <FaPauseCircle /> : <FaPlayCircle />}
                      {dataDatv.DATVModSettings.tsFilePlay ? 'Pause' : 'Start'}
                    </span>
                  </div>
                  <span className={styles.separator}></span>
                  <div className={styles.status}>
                    <div className={styles.row}>
                      <span className={styles.rowText}>Tx Gain</span>
                      <input
                        className={styles.rowBox}
                        min="0"
                        max="80"
                        value={dataTx.usrpOutputSettings.gain}
                        onChange={(e) =>
                          setDataTx((prevData) => ({
                            ...prevData,
                            usrpOutputSettings: {
                              ...prevData.usrpOutputSettings,
                              gain: Number(e.target.value)
                            }
                          }))
                        }
                      />
                    </div>
                    <div className={styles.row}>
                      <span className={styles.rowText}>Modulation Method</span>
                      <input
                        className={styles.rowBox}
                        value={dataDatv.DATVModSettings.modulation == 0 ? 'BPSK' : 'QPSK'}
                        disabled
                      />
                    </div>
                    <div className={styles.row}>
                      <span className={styles.rowText}>Sampling Rate</span>
                      <input
                        className={styles.rowBox}
                        value={dataTx.usrpOutputSettings.devSampleRate}
                        disabled
                      />
                    </div>
                  </div>
                </div>
                </div>
              </>)

            }
          </div>
          {/* </div> */}
          {/* <div className={styles.operation}>
            <div className={styles.start}>
              <span className={styles.loop} onClick={handleVideoLoop}>
                {dataDatv.DATVModSettings.tsFilePlayLoop ? (
                  <img className={styles.image} src={correct} alt="" width="15" height="15" style={{ marginRight: "3px" }} />
                ) : (
                  <img className={styles.image} src={remove} alt="" width="15" height="15" style={{ marginRight: "3px" }} />
                )}
                Loop the video
              </span>
              <span className={styles.startButton} onClick={handleStartVideo}>
                {dataDatv.DATVModSettings.tsFilePlay ? <FaPauseCircle /> : <FaPlayCircle />}
                {dataDatv.DATVModSettings.tsFilePlay ? 'Pause' : 'Start'}
              </span>
            </div>
            <span className={styles.separator}></span>
            <div className={styles.status}>
              <div className={styles.row}>
                <span className={styles.rowText}>Tx Gain</span>
                <input
                  className={styles.rowBox}
                  min="0"
                  max="80"
                  value={dataTx.usrpOutputSettings.gain}
                  onChange={(e) =>
                    setDataTx((prevData) => ({
                      ...prevData,
                      usrpOutputSettings: {
                        ...prevData.usrpOutputSettings,
                        gain: Number(e.target.value)
                      }
                    }))
                  }
                />
              </div>
              <div className={styles.row}>
                <span className={styles.rowText}>Modulation Method</span>
                <input
                  className={styles.rowBox}
                  value={dataDatv.DATVModSettings.modulation == 0 ? 'BPSK' : 'QPSK'}
                  disabled
                />
              </div>
              <div className={styles.row}>
                <span className={styles.rowText}>Sampling Rate</span>
                <input
                  className={styles.rowBox}
                  value={dataTx.usrpOutputSettings.devSampleRate}
                  disabled
                />
              </div>
            </div>
          </div> */}
        </div>
      </div>
    </div>
  )
}

export default Video
