import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function AuthPage2() {
  const [isLoginActive, setIsLoginActive] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayedForm, setDisplayedForm] = useState('register');
  
  const handleToggleForm = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setIsLoginActive(!isLoginActive);
    
    // Wait for panel slide animation to be halfway through before changing form content
    setTimeout(() => {
      setDisplayedForm(isLoginActive ? 'register' : 'login');
    }, 300);
    
    // Reset animating state after full animation completes
    setTimeout(() => {
      setIsAnimating(false);
    }, 700);
  };

  useEffect(() => {
    // Set initial displayed form
    setDisplayedForm(isLoginActive ? 'login' : 'register');
  }, []);

  const handleRegister = (e) => {
    e.preventDefault();
    // Handle registration logic here
    console.log('Register form submitted');
  };

  const handleLogin = (e) => {
    e.preventDefault();
    // Handle login logic here
    console.log('Login form submitted');
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-sky-100">
      <div className="relative bg-white rounded-lg shadow-lg overflow-hidden w-full max-w-5xl h-auto md:h-4/5">
        <div className="flex flex-col md:flex-row h-full relative">
          {/* Forms Container - Always in the same position */}
          <div className="md:w-1/2 p-8 z-10">
            {/* Register Form */}
            <div className={`transition-all duration-500 ease-in-out ${
              displayedForm === 'register' ? 'block' : 'hidden'
            }`}>
              <h2 className="text-3xl font-bold mb-6">Register</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">First Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Last Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Date of Birth</label>
                    <div className="relative">
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Address</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Confirmation</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleRegister}
                  className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition duration-300"
                >
                  Register
                </button>
              </div>
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{" "}
                  <button
                    onClick={handleToggleForm}
                    className="text-blue-500 hover:underline font-medium"
                    disabled={isAnimating}
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </div>

            {/* Login Form */}
            <div className={`transition-all duration-500 ease-in-out ${
              displayedForm === 'login' ? 'block' : 'hidden'
            }`}>
              <h2 className="text-3xl font-bold mb-6">Login</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 text-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                      Remember me
                    </label>
                  </div>
                  <div className="text-sm">
                    <a className="text-blue-500 hover:underline cursor-pointer">
                      Forgot password?
                    </a>
                  </div>
                </div>
                <button
                  onClick={handleLogin}
                  className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition duration-300"
                >
                  Login
                </button>
              </div>
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{" "}
                  <button
                    onClick={handleToggleForm}
                    className="text-blue-500 hover:underline font-medium"
                    disabled={isAnimating}
                  >
                    Register
                  </button>
                </p>
              </div>
            </div>
          </div>

          {/* Blue Panel - This slides left and right */}
          <div 
            className={`absolute md:w-1/2 h-full transition-all duration-700 ease-in-out transform ${
              isLoginActive ? 'md:left-0' : 'md:left-1/2'
            } bg-sky-200 flex flex-col justify-center items-center text-center p-8`}
          >
            <div>
              <div className="flex justify-center">
                <img 
                  src="/api/placeholder/300/300" 
                  alt="Person riding bicycle" 
                  className="w-64 h-64 object-contain mb-6" 
                />
              </div>
              
              <h3 className="text-2xl font-semibold mb-4 text-gray-800">
                "Jobs fill your pockets, adventures fill your soul."
              </h3>
              
              <p className="text-gray-600 mb-8">
                {isLoginActive 
                  ? "Sign in to track your project issues and improve team coordination." 
                  : "Join us to streamline your project management and issue tracking."}
              </p>
              
              <div className="flex justify-center space-x-2 mt-4">
                <div className={`h-2 w-2 rounded-full ${!isLoginActive ? 'bg-blue-800' : 'bg-blue-300'}`}></div>
                <div className={`h-2 w-2 rounded-full ${isLoginActive ? 'bg-blue-800' : 'bg-blue-300'}`}></div>
              </div>
            </div>
          </div>

          {/* This is a "background" div for the non-sliding panel side */}
          <div className="md:w-1/2" aria-hidden="true"></div>
        </div>
      </div>
    </div>
  );
}