import { useContext, useEffect, useRef, useState } from 'react'
import TxHardwareSettings from '../../components/TxHardwareSettings/TxHardwareSettings.jsx'
import { DataContext } from '../../components/Context/DataContext.jsx'
import { useApiFunctions } from '../../api/api.js'
import toast from 'react-hot-toast'

import DatvModulator from '../../components/DatvModulator/DatvModulator.jsx'
import styles from './Configure.module.css'

const Configure = () => {
  const [activeTab, setActiveTab] = useState('device')
  const { usrpConnected, deviceConnected, channel } = useContext(DataContext)

  return (
    <>
      <div className={styles.mainConatiner}>
        <div className={styles.tabButtons}>
          <button
            className={activeTab === 'device' ? styles.active : ''}
            onClick={() => setActiveTab('device')}
          >
            Device Settings
          </button>
          <button
            className={activeTab === 'channel' ? styles.active : ''}
            onClick={() => setActiveTab('channel')}
          >
            Channel Settings
          </button>
        </div>

        <div className={styles.body}></div>
        {/* Tab Content */}
        <div className={styles.tabContent}>
          {usrpConnected}
          {deviceConnected && activeTab === 'device' ? <TxHardwareSettings /> : <></>}
          {channel && activeTab === 'channel' && <DatvModulator />}
        </div>
      </div>
    </>
  )
}

export default Configure
