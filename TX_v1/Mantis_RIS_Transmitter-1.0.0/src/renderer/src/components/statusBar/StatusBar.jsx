import React, { useEffect } from 'react'
import styles from './StatusBar.module.css'
import { MdCheckCircle,MdCancel } from "react-icons/md";
import { Spin } from 'antd';

const StatusBar = ({devices = [], load}) => {

  useEffect(() => {
    console.log("loadeer", load);
  }, [load]);

  return (
    <div className={styles.statusbar}>
      {devices.map((device, index) => (
        <div key={device.name} className={styles.devicestatus}>
          {device.connected ? (
            <MdCheckCircle className={`${styles.icon} ${styles.check}` }/>
          ) : (
            <>
            {load == device.name ? <Spin className={`${styles.icon} ${styles.cross}`} /> : <MdCancel className={`${styles.icon} ${styles.cross}`} /> }
            </>
          )}
          <div className={styles.devicename}>{device.name}</div>
          
          {index < devices.length - 1 && <span className={styles.dottedline}></span>}
        </div>
      ))}
    </div>
  )
}

export default StatusBar