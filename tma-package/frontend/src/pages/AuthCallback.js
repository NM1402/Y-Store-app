import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * AuthCallback - Handles Google OAuth callback
 * Processes session_id from URL fragment and exchanges it for session token
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const { setGoogleUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      try {
        // Get session_id from URL fragment
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.replace('#', ''));
        const sessionId = params.get('session_id');

        if (!sessionId) {
          console.error('No session_id in URL');
          navigate('/login', { replace: true });
          return;
        }

        // Exchange session_id for user data
        const response = await axios.post(
          `${API_URL}/api/v2/auth/google`,
          { session_id: sessionId },
          { withCredentials: true }
        );

        const { user, access_token } = response.data;

        if (user) {
          // CRITICAL: Store user data in AuthContext AND localStorage
          setGoogleUser(user);
          
          // Also store access_token for session management
          if (access_token) {
            localStorage.setItem('session_token', access_token);
          }
          
          // Check for saved return URL (from checkout)
          const returnUrl = sessionStorage.getItem('checkout_return_url');
          if (returnUrl) {
            sessionStorage.removeItem('checkout_return_url');
            navigate(returnUrl, { replace: true });
          } else if (user.role === 'admin') {
            navigate('/admin', { replace: true });
          } else {
            navigate('/', { replace: true });
          }
        } else {
          throw new Error('No user data received');
        }

      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/login', { 
          replace: true, 
          state: { error: 'Помилка авторизації. Спробуйте ще раз.' } 
        });
      }
    };

    processAuth();
  }, [navigate, setGoogleUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
        <p className="text-gray-600 text-xl">Авторизація через Google...</p>
        <p className="text-gray-400 text-sm mt-2">Будь ласка, зачекайте</p>
      </div>
    </div>
  );
};

export default AuthCallback;
