import { LoginForm } from './components/login-form';

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Login</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Access your OpenERM account</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
