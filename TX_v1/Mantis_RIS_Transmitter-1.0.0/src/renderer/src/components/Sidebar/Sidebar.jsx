import styles from './Sidebar.module.css'
import { TbLogout2 } from 'react-icons/tb'
import { IoMdSettings } from 'react-icons/io'
import { MdDashboard } from 'react-icons/md'
import { useNavigate } from 'react-router-dom'
import MenuLink from './menuLink/MenuLink'
import logo from '../../../../../resources/logo@2x.png'
import frequency from '../../../../../resources/sidebar/frequency.png'
import device from '../../../../../resources/sidebar/iot-devices.png'
import connection from '../../../../../resources/sidebar/connection.png'
import speed from '../../../../../resources/sidebar/speed.png'
import ip from '../../../../../resources/sidebar/IP.png'
import waves from '../../../../../resources/sidebar/audio-waves.png'
import { useApiFunctions } from '../../api/api'
import { useContext, useEffect, useState } from 'react'
import { DataContext } from '../Context/DataContext'

const homeItem = { title: 'Home', path: '/dashboard', icon: <MdDashboard /> };
const otherItems = [{ title: 'Configure', path: '/configure', icon: <IoMdSettings /> }];

const Sidebar = () => {
  const navigate = useNavigate()

  const { dataTx, selectedRf, deviceConnected, rfBandwidth, usrpConnected,
    channel, } = useContext(DataContext)

  const [ipAddress, setIpAddress] = useState()
  const [internetSpeed, setInternetSpeed] = useState('Loading...')
  const [showOtherLinks, setShowOtherLinks] = useState(false);
  const { _getIpAddress, _getInternetSpeed } = useApiFunctions()

  useEffect(() => {
    let timer;
    if (usrpConnected && deviceConnected && channel) {

      timer = setTimeout(() => setShowOtherLinks(true), 5000);
    } else {

      setShowOtherLinks(false);
    }
    return () => clearTimeout(timer);
  }, [usrpConnected, deviceConnected, channel]);

  const menuItems = [homeItem, ...(showOtherLinks ? otherItems : [])];

  const handleLogOut = async () => {
    // do logout tasks here (clear auth, etc.)
    navigate('/')
  }

  const getIpAddress = async () => {
    try {
      const response = await _getIpAddress()

      console.log('ip ', response)

      if (response.status == 200) {
        setIpAddress(response.data.IPAddress.address)
      }
    } catch (error) {
      console.log(error)
    }
  }

  const getInternetSpeed = async () => {
    try {
      const response = await _getInternetSpeed()

      console.log('speed', response)

      if (response.status == 200) setInternetSpeed(response?.data?.download_mbps)
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    getIpAddress()
    getInternetSpeed()
  }, [])

  return (
    <div className={styles.sidebar}>
      <div className={styles.logo}>
        <img className={styles.image} src={logo} alt="logo" width="200" height="50" />
      </div>
      <div className={styles.ulList}>
        <ul className={styles.list}>
          {menuItems.map((item, index) => (
            <li key={index}>
              <MenuLink item={item} />
            </li>
          ))}
        </ul>
      </div>
      <div className={styles.quickStats}>
        <div className={styles.quicktext}>Quick Stats</div>
        <div className={styles.device}>
          <div className={styles.img}>
            <img className={styles.image} src={waves} alt="" width="20" height="20" />
          </div>
          <div className={styles.status}>
            <div className={styles.devicetitle}>Bandwidth</div>
            <div className={styles.devicestatus}>{rfBandwidth / 1000000} MHz</div>
          </div>
        </div>
        <div className={styles.device}>
          <div className={styles.img}>
            <img className={styles.image} src={device} alt="" width="20" height="20" />
          </div>
          <div className={styles.status}>
            <div className={styles.devicetitle}>Device Status</div>
            <div className={styles.devicestatus}>
              {deviceConnected ? 'Running' : <span style={{ color: '#C51E1D' }}>Stopped</span>}
            </div>
          </div>
        </div>
        <div className={styles.device}>
          <div className={styles.img}>
            <img className={styles.image} src={connection} alt="" width="20" height="20" />
          </div>
          <div className={styles.status}>
            <div className={styles.devicetitle}>Channel Number</div>
            <div className={styles.devicestatus}>
              {selectedRf == -1 ? (
                <span style={{ color: '#C51E1D' }}>Not Selected</span>
              ) : (
                `RF${selectedRf}`
              )}
            </div>
          </div>
        </div>
        <div className={styles.device}>
          <div className={styles.img}>
            <img className={styles.image} src={speed} alt="" width="20" height="20" />
          </div>
          <div className={styles.status}>
            <div className={styles.devicetitle}>Backend Speed</div>
            <div className={styles.devicestatus}>
              {internetSpeed} {internetSpeed != 'Loading...' ? 'Mbps' : ''}
            </div>
          </div>
        </div>
        <div className={styles.device}>
          <div className={styles.img}>
            <img className={styles.image} src={ip} alt="" width="20" height="20" />
          </div>
          <div className={styles.status}>
            <div className={styles.devicetitle}>IP</div>
            <div className={styles.devicestatus}>{ipAddress}</div>
          </div>
        </div>
        <div className={styles.device}>
          <div className={styles.img}>
            <img className={styles.image} src={frequency} alt="" width="20" height="20" />
          </div>
          <div className={styles.status}>
            <div className={styles.devicetitle}>Frequency</div>
            <div className={styles.devicestatus}>
              {dataTx.usrpOutputSettings.centerFrequency / 1000000000} GHz
            </div>
          </div>
        </div>
      </div>
      <button className={styles.logout} onClick={handleLogOut}>
        <div className={styles.outicon}>
          <TbLogout2 />
        </div>
        <div className={styles.icontext}>Logout</div>
      </button>
      <div className={styles.copyright}>All Rights Reserved © Mantiswave Networks</div>
    </div>
  )
}

export default Sidebar
