import React, { useContext, useEffect, useState, useRef } from 'react'
import styles from './TxHardwareSettings.module.css'
import { useApiFunctions } from '../../api/api'
import toast from 'react-hot-toast'
import { DataContext } from '../Context/DataContext'
import { db } from '../firebase/FirebaseClient'
import { ref as dbRef, update as dbUpdate, set as dbSet } from 'firebase/database'
import SignalVisualization from '../SignalVisualization/SignalVisualization'

const MATRIX_PATH = 'matrices/transmitter'

const TxHardwareSettings = () => {
  const { bwSR, setBwSR, setCenterFrequency, start, setStart, dataTx, setDataTx } =
    useContext(DataContext)
  const { _putDeviceSetting, _deleteDeviceSetting, _postRunDevice } = useApiFunctions()

  const isInitialRender = useRef(true)

  useEffect(() => {
    const pathRef = dbRef(db, MATRIX_PATH)

    const flush = async () => {
      const updates = {}
      try {
        updates['status'] = start
        const response = await dbUpdate(pathRef, updates)
      } catch (err) {
        console.error('Error flushing matrix to Firebase:', err)
      }
    }

    flush()
    // const id = setInterval(flush, 1000);

    // return () => {
    //   clearInterval(id);
    //   mountedRef.current = false;
    // };
  }, [start])

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false
      return
    }

    const updateDeviceSetting = async () => {
      try {
        const response = await _putDeviceSetting(dataTx)
        toast.dismiss();
        if (response.status === 200 || response.status === 201) {
          toast.success('Device settings updated')
        } else {
          toast.error('Failed to update settings')
        }
      } catch (error) {
        console.error('Error updating device settings:', error)
        toast.error('Error updating device settings')
      }
    }

    updateDeviceSetting()
  }, [dataTx])

  const onChangeSampleRate = (e) => {
    setDataTx((prevData) => ({
      ...prevData,
      usrpOutputSettings: { ...prevData.usrpOutputSettings, devSampleRate: Number(e.target.value) }
    }))
    setBwSR(e.target.value)
  }

  const handleTransmission = async () => {
    try {
      if (start) {
        const response = await _deleteDeviceSetting()
        console.log('stop res', response)
        if (response.status == 200 || response.status == 201) {
          toast.success('Transmission stopped')
          setStart(false)
        }
      } else {
        try {
          const response = await _putDeviceSetting(dataTx); 

        } catch (error) {
          toast.error('Try submitting again')
          console.log(error)
        }
        
        try {
          const res = await _postRunDevice()
          if (res.status == 200 || res.status == 201) {
            toast.success('Transmission started')
            setStart(true)
          }
        } catch (error) {
          toast.error('Error in Transmission')
          console.log(error)
        }
        // }
      }
    } catch (error) {
      toast.error('Error in Transmission')
      console.log(error)
    }
  }

  useEffect(() => {
    console.log('clock ', dataTx)
  }, [dataTx])

  return (
    <div className={styles.mainContainer}>
      <div className={styles.txCard}>
        <div className={styles.heading}>
          <h2 className={styles.heading}>TX Hardware Settings</h2>
        </div>
        <div>
          {/* <div className={styles.slider}>
              <label>
                TX Gain (dB): {data.usrpOutputSettings.gain} {'dB'}
              </label>
              <input
                type="range"
                min="0"
                max="80"
                value={data.usrpOutputSettings.gain}
                onChange={(e) =>
                  setData((prevData) => ({
                    ...prevData,
                    usrpOutputSettings: {
                      ...prevData.usrpOutputSettings,
                      gain: Number(e.target.value)
                    }
                  }))
                }
              />


            </div> */}

          <div className={styles.sliderWrapper}>
            <label className={styles.label}>TX Gain (dB)*</label>
            <div className={styles.sliderRow}>
              <input
                type="range"
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
                className={styles.range}
              />
              <div className={styles.valueBox}>
                <input
                  value={dataTx.usrpOutputSettings.gain}
                  type="number"
                  min="0"
                  max="80"
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
                <span>dB</span>
              </div>
            </div>
          </div>

          <div className={styles.inputBox}>
            <div className={styles.field}>
              <label>TX Sampling Rate (S/s)*</label>
              <input
                type="number"
                min="1"
                max="1000000000"
                step="1"
                value={dataTx.usrpOutputSettings.devSampleRate}
                onChange={(e) => onChangeSampleRate(e)}
              />
            </div>

            <div className={styles.field}>
              <label>TX Frequency (GHz)*</label>
              <input
                type="number"
                min="0"
                max="6000000000"
                step="100000"
                value={dataTx.usrpOutputSettings.centerFrequency / 1000000000}
                onChange={(e) => {
                  setDataTx((prevData) => ({
                    ...prevData,
                    usrpOutputSettings: {
                      ...prevData.usrpOutputSettings,
                      centerFrequency: Number(e.target.value) * 1000000000
                    }
                  }))
                  setCenterFrequency(Number(e.target.value))
                }}
              />
            </div>

            <div className={styles.field}>
              <label>TX LPF Bandwidth (kHz)*</label>
              <input
                type="number"
                min="0"
                max="100000"
                step="1000"
                value={dataTx.usrpOutputSettings.lpfBW / 1000}
                onChange={(e) =>
                  setDataTx((prevData) => ({
                    ...prevData,
                    usrpOutputSettings: {
                      ...prevData.usrpOutputSettings,
                      lpfBW: Number(e.target.value) * 1000
                    }
                  }))
                }
              />
            </div>

            <div className={styles.field}>
              <label>TX LO Offset (kHz)*</label>
              <input
                type="number"
                min="-100000"
                max="100000"
                step="1000"
                value={dataTx.usrpOutputSettings.loOffset}
                onChange={(e) =>
                  setDataTx((prevData) => ({
                    ...prevData,
                    usrpOutputSettings: {
                      ...prevData.usrpOutputSettings,
                      loOffset: Number(e.target.value)
                    }
                  }))
                }
              />
            </div>
            <div className={styles.field}>
              <label>Mode*</label>
              <select
                value={dataTx.usrpOutputSettings.antennaPath}
                // onChange={(e) => setTxMode(e.target.value)}
                onChange={(e) =>
                  setDataTx((prevData) => ({
                    ...prevData,
                    usrpOutputSettings: {
                      ...prevData.usrpOutputSettings,
                      antennaPath: e.target.value
                    }
                  }))
                }
              >
                {['TX', 'RX', 'TX/RX'].map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label>Clock Source</label>
              <select
                value={dataTx.usrpOutputSettings.clockSource}
                onChange={(e) =>
                  setDataTx((prevData) => ({
                    ...prevData,
                    usrpOutputSettings: {
                      ...prevData.usrpOutputSettings,
                      clockSource: e.target.value
                    }
                  }))
                }
              >
                {['internal', 'external', 'gpsdo'].map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            {/*  */}
          </div>
        </div>
        <button className={styles.button} onClick={handleTransmission}>
          {start ? 'Stop' : 'Start'}
        </button>

        <div className={styles.toggle}>
          <label htmlFor="txActive">
            {start ? '🟢 Transmitter Active' : '🔴 Transmitter Inactive'}
          </label>
        </div>
      </div>

      {/* right box */}
      <div className={styles.rightBox}>
        <SignalVisualization />
      </div>
    </div>
  )
}

export default TxHardwareSettings
