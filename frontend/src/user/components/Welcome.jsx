// import { ArrowRight } from 'lucide-react';

// const Welcome = ({ onRegisterClick }) => {
//   return (
//     <div className="bg-blue-600 text-white p-8 flex flex-col justify-center h-full">
//       <div>
//         <h1 className="text-4xl font-bold mb-4">Welcome Back!</h1>
//         <p className="text-blue-100 mb-8 text-lg">
//           Sign in to continue your journey with us and access all your data.
//         </p>
        
//         <button
//           onClick={onRegisterClick}
//           className="inline-flex items-center px-6 py-3 bg-white text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors"
//         >
//           Create an account
//           <ArrowRight size={18} className="ml-2" />
//         </button>
//       </div>
//     </div>
//   );
// };

// export default Welcome;
import { ArrowRight } from 'lucide-react';

const Welcome = ({ onRegisterClick }) => {
  return (
    <div className="bg-[#4B2D87] text-white p-8 flex flex-col justify-center h-full">
      <div>
        <h1 className="text-4xl font-bold mb-4">Welcome Back!</h1>
        <p className="text-gray-200 mb-8 text-lg">
          Sign in to continue your journey with us and access all your data.
        </p>
        
        <button
          onClick={onRegisterClick}
          className="inline-flex items-center px-6 py-3 bg-white text-[#4B2D87] font-medium rounded-full hover:bg-[#EDE9FE] transition-colors"
        >
          Create an account
          <ArrowRight size={18} className="ml-2" />
        </button>
      </div>
    </div>
  );
};

export default Welcome;