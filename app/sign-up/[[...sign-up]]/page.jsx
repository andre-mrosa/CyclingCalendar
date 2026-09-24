import AuthForm from '../../components/AuthForm';

export default function SignUpPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12 bg-canvas">
      <AuthForm signUp />
    </div>
  );
}
