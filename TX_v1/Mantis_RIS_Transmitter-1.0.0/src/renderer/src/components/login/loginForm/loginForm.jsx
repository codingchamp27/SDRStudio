import { useState } from 'react'
import styles from './loginForm.module.css'
import { useNavigate } from 'react-router-dom'
import { FiEyeOff, FiEye } from 'react-icons/fi'
import Model from './terms/model'
import banner from '../../../../../../resources/banner/banner3.png'
import logo from '../../../../../../resources/logo@2x.png'
import tranmitterIcon from '../../../../../../resources/navbar/Layer_x0020_1.png'
import receiverIcon from '../../../../../../resources/navbar/receiver.png'

const LoginForm = () => {
  const [showPassword, setShowPassword] = useState(true)
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const [load, setLoad] = useState(false)

  const [model, setModelOpen] = useState(true)

  const handleLogin = (e) => {
    e.preventDefault()

    const hardcodedUsername = 'admin'
    const hardcodedPassword = 'password123'

    if (username === hardcodedUsername && password === hardcodedPassword) {
      const updateLogin = async () => {
        navigate('/dashboard')
      }
      updateLogin()
    } else {
      setError('Invalid Credentials !')
      setLoad(false)
    }
  }

  const handleClick = () => {
    setLoad(true)
  }

  return (
    <div className={styles.container}>
      {model && (
        <Model
          setIsModel={setModelOpen}
        />
      )}

      <div className={styles.loginspace}>
        <div className={styles.loginBanner}>
          <div className={styles.header}>
            <img src={logo} alt="" width="70%" height="50%" />
          </div>
          <span className={styles.title}>Login to the Mantiswave RIS</span>
          <div className={styles.appLogo}>
            <div className={styles.transmitter}>
              <img
                // className={styles.image}
                src={tranmitterIcon}
                alt=""
                width="20"
                height="25"
                style={{ marginRight: '5px' }}
              />
              TRANSMITTER
            </div>
            <div className={styles.receiver}>
              <img
                // className={styles.image}
                src={receiverIcon}
                alt=""
                width="20"
                height="25"
                style={{ marginRight: '5px' }}
              />
              RECEIVER
            </div>
          </div>
          <form className={styles.form} onSubmit={handleLogin}>
            <div className={styles.username}>
              <div className={styles.label}>
                <div>Username</div>
              </div>
              <input
                autoComplete="off"
                className={styles.userinput}
                type="text"
                placeholder=""
                name="username"
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className={styles.password}>
              <div className={styles.label}>
                <div>Password</div>
              </div>
              <input
                autoComplete="off"
                className={styles.passwordinput}
                type={showPassword ? 'password' : 'text'}
                placeholder=""
                name="password"
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className={styles.eye} onClick={togglePasswordVisibility}>
                {showPassword ? (
                  <FiEye color="#4F4F4F" size="20" />
                ) : (
                  <FiEyeOff size="20" color="#4F4F4F" />
                )}
              </div>
            </div>
            <div className={styles.error}>{error}</div>
            <button type="submit" onClick={load ? null : handleClick}>
              {load && !error ? 'Loading...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
      <div className={styles.img}>
        <img
          className={styles.image}
          src={banner}
          alt=""
          // width="20"
          // height="20"
        />
      </div>
    </div>
  )
}

export default LoginForm
