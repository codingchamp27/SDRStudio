import { useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { getStorageValue } from '../storageUtil/dynamicStorage';

const withAuth = (WrappedComponent) => {
  const ComponentWithAuth = (props) => {
    const navigate = useNavigate();

    useEffect(() => {
      const checkForLogin = async () => {
        const isLoggedIn = await getStorageValue('isLoggedIn', '');
        if (!isLoggedIn) {
          navigate('/');
        }
      };
      checkForLogin();
    }, [navigate]);

    return (< WrappedComponent {...props} />);
  };

  // Add display name for better debugging
  ComponentWithAuth.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return ComponentWithAuth;
};

export default withAuth;
