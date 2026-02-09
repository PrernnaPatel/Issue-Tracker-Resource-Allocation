import { DotLoader } from "react-spinners";

const Loader = ({ loading = true, color = "#4B2D87", size = 40 }) => {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <DotLoader 
        color={color}
        loading={loading}
        size={size}
        aria-label="Loading Spinner"
      />
    </div>
  );
};

export default Loader;