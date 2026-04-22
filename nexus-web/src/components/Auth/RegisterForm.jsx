import { SignUp } from '@clerk/clerk-react'

export default function RegisterForm() {
  return (
    <SignUp
      routing="hash"
      signInUrl="#sign-in"
      appearance={{
        elements: {
          rootBox: 'w-full',
          card: 'shadow-none p-0',
        },
      }}
    />
  )
}
