import { useContext, useEffect } from 'react'
import Dashboard from '../components/dashboard/Dashboard'
import { useApiFunctions } from '../api/api'
import { DataContext } from '../components/Context/DataContext';

const DashboardPage = () => {
  const { _deleteDeviceSet } = useApiFunctions();
  const { selectedRf } = useContext(DataContext);

  const handleDeleteDeviceSet = async () => {
    try {
      const response = await _deleteDeviceSet()
      console.log('deviceset res', response)
    } catch (error) {
      console.log('deviceset', error)
    }
  }

  useEffect(() => {
    if(selectedRf != -1) return;
    handleDeleteDeviceSet()
    handleDeleteDeviceSet()
    handleDeleteDeviceSet()
    handleDeleteDeviceSet()
  }, [])

  return (
    <div>
      <Dashboard />
    </div>
  )
}

export default DashboardPage
