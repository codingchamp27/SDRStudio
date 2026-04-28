import styles from "../styles/Layout.module.css";
import Navbar from "./navbar/navbar";
import Sidebar from "./sidebar/sidebar";
import withAuth from "../lib/actions";
import { Toaster } from "react-hot-toast";
import PropTypes from 'prop-types';
import TitleBar from "../pages/titlebar/TitleBar";

const Layout = ({ children }) => {
  return (
    <div className={styles.window}>
    <TitleBar/>
    <div className={styles.container}>
      <div className={styles.menu}>
        <Sidebar />
      </div>
      <div className={styles.content}>
        <Navbar />
        {children}
      </div>
    </div>
    </div>
  );
};
Layout.propTypes = {
  children: PropTypes.node.isRequired,
};

const WrappedLayout = withAuth(Layout);

const LayoutWrapper = ({ children }) => (
  
  <WrappedLayout>
    <Toaster position="top-center" />
    {children}
  </WrappedLayout>
  
);

LayoutWrapper.propTypes = {
  children: PropTypes.node.isRequired,
};

export default LayoutWrapper;
