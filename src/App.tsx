import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { QueryProvider } from '@/context/QueryProvider';
import { ProtectedRoute, PublicOnlyRoute } from '@/routes/ProtectedRoute';
import { FullScreenLoader } from '@/components/ui/FullScreenLoader';
import { ChatLayout } from '@/layouts/ChatLayout';

const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('@/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const VerifyEmailPage = lazy(() => import('@/pages/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage })));
const ChatPage = lazy(() => import('@/pages/ChatPage').then((m) => ({ default: m.ChatPage })));
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const StarredMessagesPage = lazy(() => import('@/pages/StarredMessagesPage').then((m) => ({ default: m.StarredMessagesPage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

export default function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <ThemeProvider>
          <BrowserRouter>
            <Suspense fallback={<FullScreenLoader />}>
              <Routes>
                <Route element={<PublicOnlyRoute />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/verify-email" element={<VerifyEmailPage />} />
                </Route>

                <Route element={<ProtectedRoute />}>
                  <Route element={<ChatLayout />}>
                    <Route path="/chats" element={<ChatPage />} />
                    <Route path="/chats/:conversationId" element={<ChatPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/profile/:userId" element={<ProfilePage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/starred" element={<StarredMessagesPage />} />
                  </Route>
                </Route>

                <Route path="/" element={<Navigate to="/chats" replace />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#202c33',
                color: '#fff',
                borderRadius: '12px',
                fontSize: '14px',
                padding: '10px 14px',
              },
            }}
          />
        </ThemeProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
