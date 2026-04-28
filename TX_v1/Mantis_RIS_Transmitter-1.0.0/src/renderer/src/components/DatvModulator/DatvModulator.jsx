import React, { useContext, useEffect, useRef, useState } from 'react'
import styles from './DatvModulator.module.css'
import toast from 'react-hot-toast'
import { useApiFunctions } from '../../api/api'
import { DataContext } from '../Context/DataContext'
import axios from 'axios'
import DisplayVideo from '../DisplayVideo/Displayvideo'
import { FaChevronDown, FaFileUpload, FaPauseCircle, FaPlayCircle, FaUpload } from 'react-icons/fa'
import remove from '../../../../../resources/remove.png'
import correct from '../../../../../resources/correct.png'

const UPLOAD_ENDPOINT = 'http://localhost:3001/api/upload-ts'

const DatvModulator = () => {
  const { _putChannel, _postChannel, _deletechannel } = useApiFunctions()
  const {
    setRfBandwidth,
    sliderValueHz,
    setSliderValueHz,
    videoStart,
    setVideoStart,
    loopVideo,
    setLoopVideo,
    dataDatv,
    setDataDatv,
    dataTx
  } = useContext(DataContext)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const lastChange = useRef()
  const centerFreq = useRef()
  const inputRef = useRef(null)
  const handleChangeSlider = () => {
    centerFreq.current = sliderValueHz
    if (lastChange.current) {
      clearTimeout(lastChange.current)
    }

    lastChange.current = setTimeout(async () => {
      lastChange.current = null
      try {
        dataDatv.DATVModSettings.inputFrequencyOffset = centerFreq.current
        dataDatv.DATVModSettings.channelMarker.centerFrequency = centerFreq.current
        // console.log(data);
        await _deletechannel()
        await _postChannel()
        const response = await _putChannel(dataDatv)
        console.log(response)
        if (response.status == 200 || response.status == 202) {
          toast.success('Submitted Successfully')
        }
      } catch (error) {
        toast.error('Error on submitting the form')
        console.log(error)
      }
    }, 5000)
  }

  useEffect(() => {
    if (lastChange.current) {
      clearTimeout(lastChange.current)
    }
  }, [])

  useEffect(() => {
    console.log(dataDatv)
  }, [dataDatv])

  useEffect(() => {
    handleChangeSlider()
  }, [sliderValueHz])

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

  const handleStartVideo = () => {
    if (dataDatv.DATVModSettings.tsFileName != '') {
      setDataDatv((prevData) => ({
        ...prevData,
        DATVModSettings: {
          ...prevData.DATVModSettings,
          tsFilePlay: Number(!dataDatv.DATVModSettings.tsFilePlay)
        }
      }))
      setVideoStart((prev) => !prev)
    } else {
      toast.error('Please upload a .ts file first.')
    }
  }

  const handleStopVideo = () => {
    if (dataDatv.DATVModSettings.tsFilePlay === 1) {
      setDataDatv((prevData) => ({
        ...prevData,
        DATVModSettings: { ...prevData.DATVModSettings, tsFilePlay: 0 }
      }))
    } else {
      toast.error('Video is not running')
    }
  }

  const handleSubmit = async () => {
    try {
      await _deletechannel()
      await _postChannel()
      const response = await _putChannel(dataDatv)
      if (response.status == 200 || response.status == 202) {
        toast.success('Submitted Successfully')
      }
    } catch (error) {
      toast.error('Error on submitting the form')
      console.log(error)
    }
  }

  const handleRfBandwidth = (e) => {
    setDataDatv((prevData) => ({
      ...prevData,
      DATVModSettings: {
        ...prevData.DATVModSettings,
        rfBandwidth: Number(e.target.value) * 1000000
      }
    }))
    setRfBandwidth(Number(e.target.value) * 1000000)
  }

  const handleDeltaFValueChange = (e) => {
    const val = Math.abs(Number(e.target.value))
    if (val > dataDatv.DATVModSettings.rfBandwidth / 2) {
      toast.error('Exceding the cornor value')
      return
    }
    setSliderValueHz(Number(e.target.value))
  }

  const handleDeltaFSignChange = (e) => {
    const val = Math.abs(Number(sliderValueHz))
    if (e.target.value == '-') {
      setSliderValueHz(val * -1)
    } else {
      setSliderValueHz(val)
    }
  }

  const handleVideoLoop = () => {
    setDataDatv((prevData) => ({
      ...prevData,
      DATVModSettings: {
        ...prevData.DATVModSettings,
        tsFilePlayLoop: Number(!dataDatv.DATVModSettings.tsFilePlayLoop)
      }
    }))
    setLoopVideo((prev) => !prev)
  }

  return (
    <div className={styles.mainContainer}>
      <div className={styles.card}>
        <div className={styles.heading}>
          <h2 className={styles.heading}>DATV Modulator</h2>
        </div>
        <div className={styles.fileChose}>
          <div className={styles.field}>
            <label>Source Type*</label>
            <select
              value={dataDatv.DATVModSettings.tsSource}
              onChange={(e) =>
                setDataDatv((prevData) => ({
                  ...prevData,
                  DATVModSettings: {
                    ...prevData.DATVModSettings,
                    tsSource: e.target.selectedIndex
                  }
                }))
              }
            >
              {['File', 'UDP'].map((opt, index) => (
                <option key={opt} value={index}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className={styles.field}>
          <label
            className={styles.title}
            style={{
              position: 'relative',
              left: '1.2rem',
              top: '0.6rem',
              backgroundColor: '#07132a'
            }}
          >
            Upload File*
          </label>
          <button className={styles.Documentsbtn} onClick={() => inputRef.current?.click()}>
            <span className={styles.chooseFile}>
              <span
                className={styles.box}
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
            {/* <input
                style={{ width: '12rem' }}
                type="file"
                accept=".ts"
                onChange={handleFileUpload}
              /> */}
          </button>

          {uploading && <div style={{ marginTop: 3 }}>Uploading... {uploadProgress}%</div>}
        </div>
        {/*  */}
        {dataDatv.DATVModSettings.tsSource === 0 && (
          <>
            <div className={styles.videoControls}>
              <div className={styles.start}>
                <span className={styles.loop} onClick={handleVideoLoop}>
                  {dataDatv.DATVModSettings.tsFilePlayLoop ? (
                    <img
                      className={styles.image}
                      src={correct}
                      alt=""
                      width="15"
                      height="15"
                      style={{ marginRight: '3px' }}
                    />
                  ) : (
                    <img
                      className={styles.image}
                      src={remove}
                      alt=""
                      width="15"
                      height="15"
                      style={{ marginRight: '3px' }}
                    />
                  )}
                  Loop the video
                </span>
                <span
                  className={styles.startButton}
                  onClick={handleStartVideo}
                  style={{
                    backgroundColor:
                      dataDatv.DATVModSettings.tsFilePlay == '1' ? '#8D3C41' : '#2F640C'
                  }}
                >
                  {dataDatv.DATVModSettings.tsFilePlay ? <FaPauseCircle /> : <FaPlayCircle />}
                  {dataDatv.DATVModSettings.tsFilePlay ? 'Pause' : 'Start'}
                </span>
              </div>
            </div>
          </>
        )}
        <hr width="100%" size="1" />
        {/* div for input */}
        <div className={styles.inputBox}>
          <div className={styles.field}>
            <label>DVB*</label>
            <select
              value={dataDatv.DATVModSettings.standard}
              onChange={(e) =>
                setDataDatv((prevData) => ({
                  ...prevData,
                  DATVModSettings: {
                    ...prevData.DATVModSettings,
                    standard: e.target.selectedIndex
                  }
                }))
              }
            >
              {['DVB-S', 'DVB-S2'].map((opt, index) => (
                <option key={opt} value={index}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label>Modulation*</label>
            <select
              value={dataDatv.DATVModSettings.modulation}
              onChange={(e) =>
                setDataDatv((prevData) => ({
                  ...prevData,
                  DATVModSettings: {
                    ...prevData.DATVModSettings,
                    modulation: e.target.selectedIndex
                  }
                }))
              }
            >
              {['BPSK', 'QPSK'].map((opt, index) => (
                <option key={opt} value={index}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label>Symbol Rate (S/s)*</label>
            <input
              type="number"
              min={10000}
              max={10000000}
              step={10000}
              value={dataDatv.DATVModSettings.symbolRate}
              onChange={(e) =>
                setDataDatv((prevData) => ({
                  ...prevData,
                  DATVModSettings: {
                    ...prevData.DATVModSettings,
                    symbolRate: Number(e.target.value)
                  }
                }))
              }
            />
          </div>

          <div className={styles.field}>
            <label>FEC</label>
            <select
              value={dataDatv.DATVModSettings.fec}
              onChange={(e) =>
                setDataDatv((prevData) => ({
                  ...prevData,
                  DATVModSettings: { ...prevData.DATVModSettings, fec: e.target.selectedIndex }
                }))
              }
            >
              {['1/2', '2/3', '3/4', '5/6', '7/8'].map((opt, index) => (
                <option key={opt} value={index}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label>Δf (Hz)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <select
                style={{ width: '8rem', height: '2.8rem' }}
                value={sliderValueHz >= 0 ? '+' : '-'}
                onChange={handleDeltaFSignChange}
              >
                <option value="+">+</option>
                <option value="-">−</option>
              </select>

              <input
                style={{ width: '24rem' }}
                type="number"
                min={0}
                max={dataDatv.DATVModSettings.rfBandwidth / 2}
                step={1}
                value={Math.abs(sliderValueHz)}
                onChange={handleDeltaFValueChange}
              />
            </div>
          </div>
          {/* abv commment out  */}

          {/* <div className={styles.field}>
        <label>Δf (Hz)</label>
        <input
          type="number"
          min={-100000}
          max={100000}
          step={100}
          value={data.DATVModSettings.inputFrequencyOffset}
          onChange={(e) =>
            setData((prevData) => ({
              ...prevData,
              DATVModSettings: {
                ...prevData.DATVModSettings,
                inputFrequencyOffset: Number(e.target.value)
              }
            }))
          }
        />
      </div> */}

          <div className={styles.field}>
            <label>rf Bandwidth (MHz)*</label>
            <input
              type="number"
              min={100000}
              max={20000000}
              step={100000}
              value={dataDatv.DATVModSettings.rfBandwidth / 1000000}
              onChange={handleRfBandwidth}
            />
          </div>

          <div className={styles.field}>
            <label>Roll-off</label>
            <select
              value={dataDatv.DATVModSettings.rollOff}
              onChange={(e) =>
                setDataDatv((prevData) => ({
                  ...prevData,
                  DATVModSettings: {
                    ...prevData.DATVModSettings,
                    rollOff: e.target.selectedIndex
                  }
                }))
              }
            >
              {['0.35'].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
        {/* <div className={styles.field}>
            <span>UDP IP Address</span>
            <input
              type="text"
              value={data.DATVModSettings.udpAddress}
              onChange={(e) =>
                setData((prevData) => ({
                  ...prevData,
                  DATVModSettings: { ...prevData.DATVModSettings, udpAddress: e.target.value }
                }))
              }
            />
          </div> */}

        {/* <div className={styles.field}>
            <label>UDP Port</label>
            <input
              type="number"
              min={1024}
              max={65535}
              value={data.DATVModSettings.udpPort}
              onChange={(e) =>
                setData((prevData) => ({
                  ...prevData,
                  DATVModSettings: { ...prevData.DATVModSettings, udpPort: Number(e.target.value) }
                }))
              }
            />
          </div> */}

        <div className={styles.field}>
          <button className={styles.button} onClick={handleSubmit}>
            Submit
          </button>
        </div>
      </div>
      {/* right box */}
      <div className={styles.rightBox}>
        <label
          style={{ color: 'white', fontSize: '1.5rem', fontWeight: '300', marginBottom: '1rem' }}
        >
          Transmitted Video
        </label>
        <DisplayVideo />
        <div className={styles.contentBox}>
          <div className={styles.content}>
            <label>Tx Gain </label>
            <div className={styles.contentVal}>{dataTx.usrpOutputSettings.gain} dB</div>
          </div>
          <div className={styles.content}>
            <label>Modulation Method</label>
            <div className={styles.contentVal}>
              {dataDatv.DATVModSettings.modulation == 0 ? 'BPSK' : 'QPSK'}
            </div>
          </div>
          <div className={styles.content}>
            <label>Sampling Rate </label>
            <div className={styles.contentVal}>{dataTx.usrpOutputSettings.devSampleRate} S/s</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DatvModulator
