import { useContext } from 'react'
import Matrix from '../Matrix/Matrix'
import styles from './RIS_Config.module.css'
import { DataContext } from '../Context/DataContext'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'

const RIS_Config = () => {
  const { hex, matrixType } = useContext(DataContext)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.heading}>RIS Configuration</h2>
      </div>
      <div className={styles.subContainer}>
        <div className={styles.matrix}>
          <Matrix />
        </div>
        <div className={styles.operation}>
          <div className={styles.coverage}>
            <span className={styles.title}>Coverage Type</span>
            <hr style={{ marginTop: '5px', marginBottom: '5px' }}></hr>
            {/* <div className={styles.separator}></div> */}
            <div className={styles.buttons}>
              <div className={`${styles.button} ${matrixType == 'B' ? styles.buttonSelected : ''}`}>
                {matrixType == 'B' && <FaChevronLeft />} Good
              </div>
              <div className={`${styles.button} ${matrixType == 'W' ? styles.buttonSelected : ''}`}>
                {matrixType == 'W' && <FaChevronLeft />} Bad
              </div>
              <div className={`${styles.button} ${matrixType == 'U' ? styles.buttonSelected : ''}`}>
                {matrixType == 'U' && <FaChevronLeft />} Invalid
              </div>
            </div>
          </div>
          <div className={styles.hex}>
            <div className={styles.coverage}>
              <span className={styles.title}>HEX</span>
              <hr style={{ marginTop: '5px', marginBottom: '5px' }}></hr>
              <div className={styles.buttons}>
                <textarea
                  className={styles.textArea}
                  value={hex}
                  rows="4"
                  cols="50"
                  disabled
                ></textarea>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RIS_Config
