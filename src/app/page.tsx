import { UserButton, SignInButton, SignedIn, SignedOut } from '@clerk/nextjs'

export default function Home() {
  return (
    <main style={{ padding: '2rem' }}>
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <h1>E-Commerce Store</h1>
        <div>
          <SignedOut>
            <SignInButton mode="modal">
              <button style={{
                padding: '0.5rem 1rem',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}>
                Sign In
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </header>
      
      <SignedOut>
        <p>Welcome! Please sign in to start shopping.</p>
      </SignedOut>
      
      <SignedIn>
        <p>Welcome back! Browse our products below.</p>
      </SignedIn>
    </main>
  )
}