import styles from './Dashboard.module.css'
import DatvModulator from '../DatvModulator/DatvModulator'
import SignalVisualization from '../SignalVisualization/SignalVisualization'
import TxHardwareSettings from '../TxHardwareSettings/TxHardwareSettings'
import DisplayVideo from '../DisplayVideo/Displayvideo'
import StatusBar from '../statusBar/StatusBar'
import { useContext, useEffect, useRef, useState } from 'react'
import { DataContext } from '../Context/DataContext'
import { useApiFunctions } from '../../api/api'
import toast from 'react-hot-toast'
import SdrangelLogs from '../Logs/SdrangelLogs'
import Matrix from '../Matrix/Matrix'
import RIS_Status from '../RIS_Status/RIS_Status'
import Video from '../Home_Video/Video'
import RIS_Config from '../RIS_Config/RIS_Config'

const Dashboard = () => {
  const {
    usrpConnected,
    deviceConnected,
    channel,
    setUsrpConnected,
    setDeviceConnected,
    setChannel,
    bwSR,
    rf,
    setRf,
    loader,
    setLoader,
    showModel,
    setShowModel,
    selectedRf,
    setSelectedRf
  } = useContext(DataContext)
  const [devices, setDevice] = useState([
    { name: 'USRP', connected: usrpConnected },
    { name: 'Device', connected: deviceConnected },
    { name: 'Channel', connected: channel }
  ])

  useEffect(() => {
    setDevice([
      { name: 'USRP', connected: usrpConnected },
      { name: 'Device', connected: deviceConnected },
      { name: 'Channel', connected: channel }
    ])
  }, [usrpConnected, deviceConnected, channel])

  const handleRfChange = (e) => {
    // console.log("setting rf or index value",Number(e.target.value));
    setSelectedRf(Number(e.target.value))
    setShowModel(false)
  }

  return (
    <div className={styles.dashboard}>
      {showModel && (
        <div className={styles.darkBackground}>
          <div className={styles.urlInputContainer}>
            <label>Select RF</label>
            <select value={rf} onChange={handleRfChange}>
              {['select', 'RF1', 'RF2'].map((mode, index) => (
                <option key={index} value={index}>
                  {mode}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className={styles.progress}>
        <div className={styles.bar}>
          <StatusBar devices={devices} load={loader} />
        </div>
      </div>

      <div className={styles.info}>
        <div className={styles.core}>
          <RIS_Status />
        </div>
        <div className={styles.ran}>
          <Video />
        </div>
        <div className={styles.ue}>
          <RIS_Config />
        </div>
        <div className={styles.packet}>
          <SdrangelLogs />
        </div>
      </div>
    </div>

    // <div className={styles.body}>
    //   <StatusBar devices={devices} load={loader} />

    //   { showModel &&

    //   <div className={styles.darkBackground}>
    //     <div className={styles.urlInputContainer}>
    //       <label>Select RF</label>
    //       <select value={rf}
    //         onChange={handleRfChange}
    //       >
    //         {["select", "RF1", "RF2"].map((mode, index) => (
    //           <option key={index} value={index}>
    //             {mode}
    //           </option>
    //         ))}
    //       </select>

    //     </div>
    //   </div>

    //   }

    //   <div className={styles.flexContainer}>
    //     {usrpConnected}
    //     {deviceConnected && <div className={styles.column}><TxHardwareSettings /></div>}
    //     {channel && (
    //       <>
    //       <div className={styles.column}><DatvModulator /></div>
    //       <div className={styles.column}><SignalVisualization /></div>
    //       <div className={styles.column} style={{marginTop: "-15%"}} > <DisplayVideo /> </div>
    //       </>
    //     )}
    //   </div>
    //     <div style={{ display:"flex", marginTop: "25%", width: "100%"}}> <SdrangelLogs /> </div>
    //     <Matrix />
    // </div>
  )
}

export default Dashboard
