import { useState, useEffect } from 'react';
import Welcome from './Welcome';
import LoginForm from './LoginForm';
import RegistrationForm from './RegistrationForm';
import InfoPanel from './InfoPanel';

const AuthPage = () => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [slideState, setSlideState] = useState(''); // 'slide-out', 'slide-in', ''
  
  const toggleView = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setSlideState('slide-out');
    
    setTimeout(() => {
      setIsLoginView(!isLoginView);
      setSlideState('slide-in');
      
      setTimeout(() => {
        setSlideState('');
        setIsAnimating(false);
      }, 400);
    }, 300);
  };
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoginView) {
        toggleView();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoginView, isAnimating]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="flex flex-col md:flex-row relative">
          {/* Left Panel */}
          <div className={`flex-1 transition-all duration-300 ease-in-out transform ${
            slideState === 'slide-out' ? '-translate-x-full opacity-0' : 
            slideState === 'slide-in' ? 'translate-x-0 opacity-100' : ''
          }`}>
            {isLoginView ? (
              <Welcome onRegisterClick={toggleView} />
            ) : (
              <RegistrationForm onLoginClick={toggleView} />
            )}
          </div>
          
          {/* Right Panel */}
          <div className={`flex-1 transition-all duration-300 ease-in-out transform ${
            slideState === 'slide-out' ? 'translate-x-full opacity-0' : 
            slideState === 'slide-in' ? 'translate-x-0 opacity-100' : ''
          }`}>
            {isLoginView ? (
              <LoginForm />
            ) : (
              <InfoPanel />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
