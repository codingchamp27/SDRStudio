import { createContext, useEffect, useRef, useState } from 'react'
import { useApiFunctions } from '../../api/api'
import toast from 'react-hot-toast'

export const DataContext = createContext()

const useInterval = (callback, delay) => {
  const savedCallback = useRef()

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    function tick() {
      savedCallback.current()
    }
    if (delay !== null) {
      const id = setInterval(tick, delay)
      return () => clearInterval(id)
    }
  }, [delay])
}

export const DataProvider = ({ children }) => {
  const [usrpConnected, setUsrpConnected] = useState(false)
  const [deviceConnected, setDeviceConnected] = useState(false)
  const [channel, setChannel] = useState(false)
  const [bwSR, setBwSR] = useState('3000000')
  const [rf, setRf] = useState([])
  const [connection, setConnection] = useState(0)
  const [centerFrequency, setCenterFrequency] = useState(3.5)
  const [rfBandwidth, setRfBandwidth] = useState(1000000)
  const [sliderValueHz, setSliderValueHz] = useState(0)
  const [start, setStart] = useState(false)
  const [videoStart, setVideoStart] = useState(false)
  const [loopVideo, setLoopVideo] = useState(false)
  const [hex, setHex] = useState('')
  const [matrixType, setMatrixType] = useState()
  const [receiverStaus, setReceiverStatus] = useState(false)
  const [loader, setLoader] = useState('')
  const [selectedRf, setSelectedRf] = useState(-1)
  const [showModel, setShowModel] = useState(false)
  const [mp4Url, setMp4Url] = useState('')

  const { _getDevices, _postDevice, _putDevice, _postChannel, _postSpectrumServer } =
    useApiFunctions()

  const [dataDatv, setDataDatv] = useState({
    channelType: 'DATVMod',
    direction: 1,
    originatorDeviceSetIndex: -1,
    originatorChannelIndex: -1,
    DATVModSettings: {
      inputFrequencyOffset: sliderValueHz,
      rfBandwidth: 1000000,
      standard: 0,
      modulation: 1,
      fec: 2,
      symbolRate: 250000,
      rollOff: 0.35,
      tsSource: 0,
      tsFileName: '',
      tsFilePlayLoop: 0,
      tsFilePlay: 0,
      udpAddress: '127.0.0.1',
      udpPort: 5004,
      channelMute: 0,
      rgbColor: -65281,
      title: 'DATV Modulator',
      streamIndex: 0,
      useReverseAPI: 0,
      reverseAPIAddress: '127.0.0.1',
      reverseAPIPort: 8888,
      reverseAPIDeviceIndex: 0,
      reverseAPIChannelIndex: 0,
      channelMarker: {
        centerFrequency: sliderValueHz,
        color: -65281,
        title: 'DATV Modulator',
        frequencyScaleDisplayType: 0
      },
      rollupState: {
        version: 0,
        childrenStates: [
          {
            objectName: 'settingsContainer',
            isHidden: 0
          }
        ]
      }
    }
  })

  const [dataTx, setDataTx] = useState({
    deviceHwType: 'USRP',
    direction: 1,
    originatorIndex: -1,
    usrpOutputSettings: {
      centerFrequency: 3500000000,
      devSampleRate: 3000000,
      loOffset: 0,
      log2SoftInterp: 0,
      lpfBW: 10000000,
      gain: 66,
      antennaPath: 'TX/RX',
      clockSource: 'internal',
      transverterMode: 0,
      transverterDeltaFrequency: 0,
      gpioDir: 0,
      gpioPins: 0,
      useReverseAPI: 0,
      reverseAPIAddress: '127.0.0.1',
      reverseAPIPort: 8888,
      reverseAPIDeviceIndex: 0
    }
  })

  useInterval(async () => {
    if (showModel == true) return

    const response = await _getDevices()

    // console.log(response.data.devicecount);

    let cnt = 0
    let arr = []

    const updatedDevices = response?.data?.devices.map((item) => {
      if (item.hwType === 'USRP') {
        arr.push({
          index: item.index,
          streamIndex: cnt++,
          serial: item.serial,
          displayName: item.displayedName
        })
      }
    })

    // console.log("updatedDevice", updatedDevices);
    // console.log("arr", arr);

    setRf(arr)

    if (arr.length == 2) {
      // console.log("rf", rf);
      selectedRf == -1 ? setShowModel(true) : setShowModel(false)
      // console.log(showModel);
      if (showModel == false && selectedRf !== -1) {
        setUsrpConnected(true)
      }
    } else {
      toast.error('Please Connect USRP')
    }
    // console.log(response);
  }, 5000)

  const postDevice = async () => {
    try {
      const response = await _postDevice()
      console.log('response post device', response)
    } catch (error) {
      return error
    }
  }

  const putDevice = async () => {
    try {
      // console.log("stream index", rf[selectedRf-1]?.streamIndex, selectedRf);

      const body = {
        displayedName: rf[selectedRf - 1]?.displayName,
        hwType: 'USRP',
        serial: rf[selectedRf - 1]?.serial,
        sequence: 0,
        direction: 1,
        bandwidth: Number(bwSR),
        deviceNbStreams: 2,
        deviceStreamIndex: rf[selectedRf - 1]?.streamIndex,
        deviceSetIndex: 0,
        index: rf[selectedRf - 1]?.index
      }

      // console.log("device payload", body);

      const response = await _putDevice(JSON.stringify(body))
      console.log('response put device', response)
      if (response.status == 200 || response.status == 202) {
        setDeviceConnected(true)
      }
    } catch (error) {
      return error
    }
  }

  useEffect(() => {
    putDevice()
  }, [bwSR, selectedRf])

  const postChannel = async () => {
    try {
      const response = await _postChannel()
      console.log('response post channel', response)
      if (response.status == 200 || response.status == 202) {
        setChannel(true)
      }
    } catch (error) {
      return error
    }
  }

  const postSpectrumServer = async () => {
    try {
      const response = await _postSpectrumServer()
      console.log('server post res', response)

      // return response
    } catch (error) {
      console.log(error)
      return error
    }
  }

  useEffect(() => {
    if (usrpConnected) {
      setLoader('Device')
      // console.log("loader dahsboard", loader);
      setTimeout(() => {
        if (deviceConnected == false) {
          postDevice()
          postSpectrumServer()
          putDevice()
          if (deviceConnected == false) {
            toast.error('Unable to update device!! ')
            setUsrpConnected(false)
          }
          setLoader('')
        }
      }, 5000)
    }
  }, [usrpConnected])

  useEffect(() => {
    if (deviceConnected) {
      setLoader('Channel')
      // console.log("loader dahsboard", loader);
      setTimeout(() => {
        postChannel()
        setLoader('')
      }, 5000)
    }
  }, [deviceConnected])

  useEffect(() => {
    console.log(centerFrequency)
  }, [centerFrequency])

  return (
    <DataContext.Provider
      value={{
        usrpConnected,
        deviceConnected,
        channel,
        setUsrpConnected,
        setDeviceConnected,
        setChannel,
        bwSR,
        setBwSR,
        rf,
        setRf,
        connection,
        setConnection,
        centerFrequency,
        setCenterFrequency,
        rfBandwidth,
        setRfBandwidth,
        sliderValueHz,
        setSliderValueHz,
        start,
        setStart,
        videoStart,
        setVideoStart,
        loopVideo,
        setLoopVideo,
        hex,
        setHex,
        matrixType,
        setMatrixType,
        receiverStaus,
        setReceiverStatus,
        dataDatv,
        setDataDatv,
        dataTx,
        setDataTx,
        loader,
        setLoader,
        showModel,
        setShowModel,
        selectedRf,
        setSelectedRf,
        mp4Url,
        setMp4Url
      }}
    >
      {children}
    </DataContext.Provider>
  )
}
