import React, { useEffect, useState } from 'react'
import styles from "./Navbar.module.css"
import tranmitterIcon from "../../../../../resources/navbar/Layer_x0020_1.png"


const Navbar = () => {

  return (
    <div className={styles.container}>
      <div className={styles.text}>
        Welcome Admin !
      </div>
      <div className={styles.operation}>
        <div className={styles.transmitter}>
          <img
            className={styles.image}
            src={tranmitterIcon}
            alt=""
            width="20"
            height="20"
          />
          {/* <span style={{gap: "2px"}}></span> */}
          <div className={styles.icontext}>TRANSMITTER</div>
        </div>
      </div>
    </div>
  )
}

export default Navbar