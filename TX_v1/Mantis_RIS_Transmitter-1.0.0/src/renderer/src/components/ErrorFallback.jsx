import { toast } from 'react-hot-toast';
import PropTypes from 'prop-types';

const ErrorFallback = ({ error, resetErrorBoundary }) => {
  // Show toast notification with the error message
  toast.error(`Something went wrong: ${error.message || "Unknown error"}`);

  return (
    <div role="alert" className="p-4 bg-red-100 border border-red-400 rounded-lg">
      <h2 className="font-bold text-red-700">Oops! Something went wrong.</h2>
      <p className="text-red-600">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="mt-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
      >
        Try Again
      </button>
    </div>
  );
};
ErrorFallback.propTypes = {
  error: PropTypes.shape({
    message: PropTypes.string,
  }).isRequired,
  resetErrorBoundary: PropTypes.func.isRequired,
};

export default ErrorFallback;
