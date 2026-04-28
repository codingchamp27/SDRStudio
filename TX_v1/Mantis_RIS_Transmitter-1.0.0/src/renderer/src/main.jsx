import ReactDOM from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from 'react-error-boundary';
import './styles/main.css'
import ErrorFallback from './components/ErrorFallback'

const handleError = (error, info) => {
  console.error("Error logged:", error, info);
};
ReactDOM.createRoot(document.getElementById('root')).render(
  <>
    {/* <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleError}
      onReset={() => {
        // Reset any local state if needed
      }}
    > */}
      <App />
    {/* </ErrorBoundary> */}
  </>
);
