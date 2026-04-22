import { SignIn } from '@clerk/clerk-react'

export default function LoginForm() {
  return (
    <SignIn
      routing="hash"
      signUpUrl="#sign-up"
      appearance={{
        elements: {
          rootBox: 'w-full',
          card: 'shadow-none p-0',
        },
      }}
    />
  )
}
