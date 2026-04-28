import { Link, useLocation } from 'react-router-dom';
import styles from './MenuLink.module.css';
import { FaChevronRight } from "react-icons/fa";

const MenuLink = ({ item }) => {
  const location = useLocation();

  const isActive = location.pathname === item.path;

  return (
    <Link to={item.path} className={`${styles.container} ${isActive ? styles.active : ''}`}>
      <div className={styles.group}>
        {item.icon}
        <div className={styles.title}>{item.title}</div>
      </div>
      <div className={`${styles.arrow} ${isActive ? styles.activeArrow : ''}`}>
        <FaChevronRight />
      </div>
    </Link>
  );
}

export default MenuLink;
