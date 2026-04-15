import React, { useContext, useEffect, useRef, useState } from 'react'
import styles from './RIS_Status.module.css'
import { IoMdSettings } from 'react-icons/io'
import allOff from '../../../../../resources/status/AllOff.png'
import bothOn from '../../../../../resources/status/bothOn.png'
import TOn from '../../../../../resources/status/T-on.png'
import ROn from '../../../../../resources/status/R-on.png'

import { toast } from 'react-hot-toast'
import { DataContext } from '../Context/DataContext'
import { useNavigate } from 'react-router-dom'

const RIS_Status = () => {
  const navigate = useNavigate()
  const { start, receiverStaus, usrpConnected, deviceConnected, channel } = useContext(DataContext)
  const [btn, setBtn] = useState(false)
  useEffect(() => {
    console.log('receiverStatus', receiverStaus)
  }, [receiverStaus])

  const handleClick = () => {
    navigate('/configure')
  }
  useEffect(() => {
    let timer;
    if (usrpConnected && deviceConnected && channel) {

      timer = setTimeout(() => setBtn(true), 5000);
    } else {

      setBtn(false);
    }
    return () => clearTimeout(timer);
  }, [usrpConnected, deviceConnected, channel]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.heading}>RIS status</h2>
        <button className={styles.configure} onClick={handleClick} disabled={!btn}>
          <IoMdSettings />
          Configure
        </button>
      </div>
      <div className={styles.img}>
        {!start && !receiverStaus ? (
          <img className={styles.image} src={allOff} alt="" />
        ) : start && !receiverStaus ? (
          <img className={styles.image} src={TOn} alt="" />
        ) : start && receiverStaus ? (
          <img className={styles.image} src={bothOn} alt="" />
        ) : (
          <img className={styles.image} src={ROn} alt="" />
        )}
        {/* <img className={styles.image} src={allOff} alt="" /> */}
      </div>
    </div>
  )
}

export default RIS_Status
